import { Router, type IRouter, type Response } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  comebackBusinessProfilesTable,
  comebackCampaignsTable,
  db,
  productEntitlementsTable,
  usersTable,
  type ComebackProfileData,
  type ComebackCampaignMessage,
} from "@workspace/db";
import { hasProductEntitlement, PRODUCT_CODES, requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

const profileSchema = z.object({
  businessName: z.string().trim().min(1).max(120),
  businessType: z.string().trim().min(1).max(120),
  location: z.string().trim().max(160).default(""),
  service: z.string().trim().min(1).max(300),
  price: z.string().trim().max(120).default(""),
  idealClient: z.string().trim().min(1).max(3000),
  clientGoal: z.string().trim().max(1000).default(""),
  leavingReasons: z.string().trim().min(1).max(3000),
  listSize: z.string().trim().max(60).default(""),
  offer: z.string().trim().max(2000).default(""),
  bookingLink: z.string().trim().max(500).default(""),
  voiceMode: z.string().trim().max(120).default("Improve my usual style"),
  voiceExamples: z.string().trim().max(12000).default(""),
  wordsToAvoid: z.string().trim().max(1000).default(""),
  extraContext: z.string().trim().max(6000).default(""),
});

const messageSchema = z.object({
  channel: z.enum(["Email", "SMS"]),
  day: z.string().trim().min(1).max(40),
  subject: z.string().trim().max(160).optional(),
  body: z.string().trim().min(1).max(5000),
  purpose: z.string().trim().max(300).optional(),
});

const generatedCampaignSchema = z.object({
  title: z.string().trim().min(1).max(160),
  audienceSummary: z.string().trim().min(1).max(1200),
  offerRecommendation: z.string().trim().min(1).max(1600),
  scheduleSummary: z.string().trim().min(1).max(600),
  messages: z.array(messageSchema).min(5).max(7),
  launchChecklist: z.array(z.string().trim().min(1).max(300)).min(4).max(10),
});

const generateSchema = z.object({
  campaignType: z.string().trim().min(1).max(160),
  customBrief: z.string().trim().max(4000).default(""),
});

const reviseSchema = z.object({
  instruction: z.string().trim().min(3).max(4000),
  messages: z.array(messageSchema).min(1).max(10),
});

const updateMessagesSchema = z.object({
  messages: z.array(messageSchema).min(1).max(10),
});

function campaignDto(row: typeof comebackCampaignsTable.$inferSelect) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    audienceSummary: row.audienceSummary,
    offerRecommendation: row.offerRecommendation,
    scheduleSummary: row.scheduleSummary,
    messages: row.messages,
    launchChecklist: row.launchChecklist,
    revisionCount: row.revisionCount,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function hasCoreAccess(ar: AuthedRequest) {
  return hasProductEntitlement(ar.userId, ar.userRole, PRODUCT_CODES.campaignStudio);
}

function systemPrompt() {
  return `You create conversion-focused former-client comeback campaigns for owner-operated fitness and wellness businesses.

The campaign must feel written specifically for the supplied business and audience. Use the selected campaign type only as a strategic frame. Never return a generic template.

Writing rules:
- Use natural English appropriate to the supplied country and business.
- Match the supplied writing examples and voice preference without copying private names or details.
- Use short, clear sentences and concrete language.
- Do not mention artificial intelligence, prompts, systems or templates.
- Do not use em dashes.
- Do not use false contrast constructions such as "this is not X, it is Y".
- Do not invent testimonials, results, scarcity, prices, deadlines or guarantees.
- Preserve supplied prices and booking links exactly.
- Use [First name] and [Sender] placeholders where appropriate.
- SMS messages should normally stay below 320 characters.
- Email messages should be concise and easy to read on a phone.
- Make the sequence progress naturally without repeating the same argument.
- Do not give medical, injury-rehabilitation or nutritional advice.
- Add a checklist reminder to contact only people the business is permitted to contact and to follow local marketing rules.

Return valid JSON only. Return five to seven messages containing a sensible mix of Email and SMS. Every message must have a distinct purpose.`;
}

async function createWithModel(args: {
  profile: ComebackProfileData;
  campaignType: string;
  customBrief: string;
  revisionInstruction?: string;
  existingMessages?: ComebackCampaignMessage[];
}) {
  const { openai } = await import(
    "@workspace/integrations-openai-ai-server"
  );
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_CAMPAIGN_MODEL || "gpt-5.2",
    max_completion_tokens: 5000,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "fitness_comeback_campaign",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: [
            "title",
            "audienceSummary",
            "offerRecommendation",
            "scheduleSummary",
            "messages",
            "launchChecklist",
          ],
          properties: {
            title: { type: "string" },
            audienceSummary: { type: "string" },
            offerRecommendation: { type: "string" },
            scheduleSummary: { type: "string" },
            messages: {
              type: "array",
              minItems: 5,
              maxItems: 7,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["channel", "day", "subject", "body", "purpose"],
                properties: {
                  channel: { type: "string", enum: ["Email", "SMS"] },
                  day: { type: "string" },
                  subject: { type: "string" },
                  body: { type: "string" },
                  purpose: { type: "string" },
                },
              },
            },
            launchChecklist: {
              type: "array",
              minItems: 4,
              maxItems: 10,
              items: { type: "string" },
            },
          },
        },
      },
    },
    messages: [
      { role: "system", content: systemPrompt() },
      {
        role: "user",
        content: JSON.stringify({
          task: args.revisionInstruction
            ? "Revise the existing campaign using the instruction. Keep accurate commercial facts unchanged unless the instruction explicitly changes them."
            : "Create a complete personalised comeback campaign.",
          campaignType: args.campaignType,
          customBrief: args.customBrief,
          businessProfile: args.profile,
          revisionInstruction: args.revisionInstruction || "",
          existingMessages: args.existingMessages || [],
        }),
      },
    ],
  });
  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("Campaign generation returned no content");
  return generatedCampaignSchema.parse(JSON.parse(text));
}

router.post("/webhooks/ghl/comeback-purchase", async (req, res: Response) => {
  const expected = process.env.GHL_WEBHOOK_SECRET;
  const supplied = req.header("x-comeback-webhook-secret");
  if (!expected || supplied !== expected) {
    return res.status(401).json({ error: "Invalid webhook credentials" });
  }
  const payload = z
    .object({
      email: z.string().email(),
      orderId: z.string().min(1).max(300),
      event: z.enum(["purchase", "refund", "chargeback"]).default("purchase"),
      productCode: z.string().default("fitness-comeback-core"),
    })
    .parse(req.body);
  const email = payload.email.trim().toLowerCase();
  const status = payload.event === "purchase" ? "active" : "revoked";
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(sql`lower(${usersTable.email}) = ${email}`)
    .limit(1);
  const [existing] = await db
    .select({ id: productEntitlementsTable.id })
    .from(productEntitlementsTable)
    .where(eq(productEntitlementsTable.externalOrderId, payload.orderId))
    .limit(1);
  if (existing) {
    await db
      .update(productEntitlementsTable)
      .set({ status, userId: user?.id ?? null, updatedAt: new Date() })
      .where(eq(productEntitlementsTable.id, existing.id));
  } else {
    await db.insert(productEntitlementsTable).values({
      userId: user?.id ?? null,
      purchaserEmail: email,
      productCode: payload.productCode,
      status,
      externalOrderId: payload.orderId,
    });
  }
  return res.json({ received: true, status });
});

router.use("/comeback", requireAuth);

router.get("/comeback/state", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  if (!(await hasCoreAccess(ar))) return res.status(403).json({ error: "Product access required" });
  const [profile] = await db
    .select()
    .from(comebackBusinessProfilesTable)
    .where(eq(comebackBusinessProfilesTable.userId, ar.userId))
    .limit(1);
  const [campaign] = await db
    .select()
    .from(comebackCampaignsTable)
    .where(eq(comebackCampaignsTable.userId, ar.userId))
    .orderBy(desc(comebackCampaignsTable.createdAt))
    .limit(1);
  return res.json({
    profile: profile?.data ?? null,
    profileComplete: profile?.complete ?? false,
    campaign: campaign ? campaignDto(campaign) : null,
  });
});

router.put("/comeback/profile", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  if (!(await hasCoreAccess(ar))) return res.status(403).json({ error: "Product access required" });
  const profile = profileSchema.parse(req.body) as ComebackProfileData;
  const [saved] = await db
    .insert(comebackBusinessProfilesTable)
    .values({ userId: ar.userId, data: profile, complete: true })
    .onConflictDoUpdate({
      target: comebackBusinessProfilesTable.userId,
      set: { data: profile, complete: true, updatedAt: new Date() },
    })
    .returning();
  return res.json({ profile: saved!.data, profileComplete: saved!.complete });
});

router.post("/comeback/campaigns/generate", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  if (!(await hasCoreAccess(ar))) return res.status(403).json({ error: "Product access required" });
  const body = generateSchema.parse(req.body);
  const [profileRow] = await db
    .select()
    .from(comebackBusinessProfilesTable)
    .where(eq(comebackBusinessProfilesTable.userId, ar.userId))
    .limit(1);
  if (!profileRow?.complete) return res.status(400).json({ error: "Complete your business profile first" });
  const [existing] = await db
    .select()
    .from(comebackCampaignsTable)
    .where(eq(comebackCampaignsTable.userId, ar.userId))
    .orderBy(desc(comebackCampaignsTable.createdAt))
    .limit(1);
  if (existing) return res.status(409).json({ error: "Your included campaign has already been created", campaign: campaignDto(existing) });
  try {
    const generated = await createWithModel({
      profile: profileRow.data,
      campaignType: body.campaignType,
      customBrief: body.customBrief,
    });
    const [created] = await db
      .insert(comebackCampaignsTable)
      .values({
        userId: ar.userId,
        type: body.campaignType,
        title: generated.title,
        audienceSummary: generated.audienceSummary,
        offerRecommendation: generated.offerRecommendation,
        scheduleSummary: generated.scheduleSummary,
        messages: generated.messages,
        launchChecklist: generated.launchChecklist,
        profileSnapshot: profileRow.data,
      })
      .returning();
    return res.status(201).json({ campaign: campaignDto(created!) });
  } catch (err) {
    req.log?.error({ err }, "Comeback campaign generation failed");
    return res.status(503).json({ error: "We could not create your campaign just now. Your campaign allowance has not been used. Please try again." });
  }
});

router.patch("/comeback/campaigns/:campaignId", async (req, res: Response) => {
  const ar = req as unknown as AuthedRequest;
  const body = updateMessagesSchema.parse(req.body);
  const [owned] = await db
    .select({ id: comebackCampaignsTable.id })
    .from(comebackCampaignsTable)
    .where(and(eq(comebackCampaignsTable.id, req.params.campaignId!), eq(comebackCampaignsTable.userId, ar.userId)))
    .limit(1);
  if (!owned) return res.status(404).json({ error: "Campaign not found" });
  const [updated] = await db
    .update(comebackCampaignsTable)
    .set({ messages: body.messages, updatedAt: new Date() })
    .where(eq(comebackCampaignsTable.id, owned.id))
    .returning();
  return res.json({ campaign: campaignDto(updated!) });
});

router.post("/comeback/campaigns/:campaignId/revise", async (req, res: Response) => {
  const ar = req as unknown as AuthedRequest;
  const body = reviseSchema.parse(req.body);
  const [campaign] = await db
    .select()
    .from(comebackCampaignsTable)
    .where(and(eq(comebackCampaignsTable.id, req.params.campaignId!), eq(comebackCampaignsTable.userId, ar.userId)))
    .limit(1);
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });
  if (campaign.revisionCount >= 10) return res.status(429).json({ error: "This campaign has reached its revision limit" });
  try {
    const generated = await createWithModel({
      profile: campaign.profileSnapshot,
      campaignType: campaign.type,
      customBrief: "",
      revisionInstruction: body.instruction,
      existingMessages: body.messages,
    });
    const [updated] = await db
      .update(comebackCampaignsTable)
      .set({
        title: generated.title,
        audienceSummary: generated.audienceSummary,
        offerRecommendation: generated.offerRecommendation,
        scheduleSummary: generated.scheduleSummary,
        messages: generated.messages,
        launchChecklist: generated.launchChecklist,
        revisionCount: campaign.revisionCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(comebackCampaignsTable.id, campaign.id))
      .returning();
    return res.json({ campaign: campaignDto(updated!) });
  } catch (err) {
    req.log?.error({ err }, "Comeback campaign revision failed");
    return res.status(503).json({ error: "We could not apply those changes just now. Your existing campaign is safe." });
  }
});

export default router;
