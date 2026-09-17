import { Router, type IRouter, type Response } from "express";
import { db, businessProfilesTable, websiteProjectsTable, projectAssetsTable } from "@workspace/db";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { PRODUCT_CODES, requireAuth, requireProductEntitlement, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();
router.use(requireAuth, requireProductEntitlement(PRODUCT_CODES.website));
const uuidParams = z.object({ projectId: z.string().uuid() });
const updateBusinessProfileBody = z.object({
  businessName: z.string().optional(), niche: z.string().optional(), location: z.string().optional(),
  service: z.string().optional(), audience: z.string().optional(), conversionGoal: z.string().optional(),
  destinationUrl: z.string().nullable().optional(), brandData: z.record(z.unknown()).optional(),
  evidenceData: z.record(z.unknown()).optional(),
});
const createWebsiteProjectBody = z.object({
  name: z.string().optional(), businessProfileId: z.string().uuid().nullable().optional(),
  briefData: z.record(z.unknown()).optional(),
});
const updateWebsiteProjectBody = createWebsiteProjectBody.extend({
  status: z.string().optional(), currentStage: z.string().optional(),
  styleData: z.record(z.unknown()).optional(),
  sections: z.array(z.record(z.unknown())).optional(),
  progressData: z.array(z.record(z.unknown())).optional(),
});
const registerProjectAssetBody = z.object({
  objectPath: z.string(), fileName: z.string(), contentType: z.string(),
  size: z.number().int().positive(), rightsStatus: z.string().optional(),
});
const refineWebsiteCopyBody = z.object({
  prompt: z.string().trim().min(3).max(500),
  selectedPart: z.enum(["headline", "subheadline", "about", "button"]),
  currentCopy: z.object({
    headline: z.string(),
    subheadline: z.string(),
    about: z.string(),
    button: z.string(),
  }),
});

function date(value: Date) {
  return value.toISOString();
}

function serializeProfile(row: typeof businessProfilesTable.$inferSelect) {
  return { ...row, createdAt: date(row.createdAt), updatedAt: date(row.updatedAt) };
}

function serializeProject(row: typeof websiteProjectsTable.$inferSelect) {
  return { ...row, createdAt: date(row.createdAt), updatedAt: date(row.updatedAt) };
}

function serializeAsset(row: typeof projectAssetsTable.$inferSelect) {
  return { ...row, createdAt: date(row.createdAt) };
}

router.get("/business-profile", async (req, res: Response) => {
  const { userId } = req as unknown as AuthedRequest;
  let [profile] = await db.select().from(businessProfilesTable).where(eq(businessProfilesTable.userId, userId)).limit(1);
  if (!profile) {
    [profile] = await db.insert(businessProfilesTable).values({ userId }).returning();
  }
  return res.json(serializeProfile(profile));
});

router.put("/business-profile", async (req, res: Response) => {
  const { userId } = req as unknown as AuthedRequest;
  const body = updateBusinessProfileBody.parse(req.body);
  const [existing] = await db.select().from(businessProfilesTable).where(eq(businessProfilesTable.userId, userId)).limit(1);
  const values = {
    ...body,
    updatedAt: new Date(),
  };
  const [profile] = existing
    ? await db.update(businessProfilesTable).set(values).where(eq(businessProfilesTable.id, existing.id)).returning()
    : await db.insert(businessProfilesTable).values({ userId, ...values }).returning();
  return res.json(serializeProfile(profile));
});

router.get("/website-projects", async (req, res: Response) => {
  const { userId } = req as unknown as AuthedRequest;
  const rows = await db.select().from(websiteProjectsTable).where(eq(websiteProjectsTable.userId, userId)).orderBy(desc(websiteProjectsTable.updatedAt));
  return res.json(rows.map(serializeProject));
});

router.post("/website-projects", async (req, res: Response) => {
  const { userId } = req as unknown as AuthedRequest;
  const body = createWebsiteProjectBody.parse(req.body ?? {});
  const [project] = await db.insert(websiteProjectsTable).values({
    userId,
    name: body.name ?? "My fitness website",
    businessProfileId: body.businessProfileId ?? null,
    briefData: body.briefData ?? {},
  }).returning();
  return res.status(201).json(serializeProject(project));
});

async function ownedProject(projectId: string, userId: string) {
  const [project] = await db.select().from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId))).limit(1);
  return project;
}

router.get("/website-projects/:projectId", async (req, res: Response) => {
  const { userId } = req as unknown as AuthedRequest;
  const { projectId } = uuidParams.parse(req.params);
  const project = await ownedProject(projectId, userId);
  if (!project) return res.status(404).json({ error: "Website project not found" });
  return res.json(serializeProject(project));
});

router.patch("/website-projects/:projectId", async (req, res: Response) => {
  const { userId } = req as unknown as AuthedRequest;
  const { projectId } = uuidParams.parse(req.params);
  const project = await ownedProject(projectId, userId);
  if (!project) return res.status(404).json({ error: "Website project not found" });
  const body = updateWebsiteProjectBody.parse(req.body);
  const [updated] = await db.update(websiteProjectsTable).set({ ...body, updatedAt: new Date() })
    .where(eq(websiteProjectsTable.id, projectId)).returning();
  return res.json(serializeProject(updated));
});

router.post("/website-projects/:projectId/assets", async (req, res: Response) => {
  const { userId } = req as unknown as AuthedRequest;
  const { projectId } = uuidParams.parse(req.params);
  const project = await ownedProject(projectId, userId);
  if (!project) return res.status(404).json({ error: "Website project not found" });
  const body = registerProjectAssetBody.parse(req.body);
  const [asset] = await db.insert(projectAssetsTable).values({
    projectId, userId, ...body,
  }).returning();
  return res.status(201).json(serializeAsset(asset));
});

router.post("/website-projects/:projectId/generate", async (req, res: Response) => {
  const { userId } = req as unknown as AuthedRequest;
  const { projectId } = uuidParams.parse(req.params);
  const project = await ownedProject(projectId, userId);
  if (!project) return res.status(404).json({ error: "Website project not found" });

  const startedAt = new Date();
  await db.update(websiteProjectsTable).set({
    status: "generating",
    currentStage: "building",
    progressData: [{ step: "generation", status: "running", startedAt: startedAt.toISOString() }],
    updatedAt: startedAt,
  }).where(eq(websiteProjectsTable.id, projectId));

  try {
    const [profile] = await db.select().from(businessProfilesTable)
      .where(eq(businessProfilesTable.userId, userId)).limit(1);
    const { openai } = await import("@workspace/integrations-openai-ai-server");
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_WEBSITE_MODEL || "gpt-5.4-mini",
      max_completion_tokens: 2500,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "fitness_website_draft",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["copy", "sections"],
            properties: {
              copy: {
                type: "object",
                additionalProperties: false,
                required: ["headline", "subheadline", "about", "button"],
                properties: {
                  headline: { type: "string" },
                  subheadline: { type: "string" },
                  about: { type: "string" },
                  button: { type: "string" },
                },
              },
              sections: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "title", "body"],
                  properties: {
                    id: { type: "string", enum: ["services", "approach", "about", "results", "testimonial", "faq", "contact"] },
                    title: { type: "string" },
                    body: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      messages: [
        {
          role: "system",
          content: `Create concise, conversion-focused website copy for a fitness or wellness business.
Use only facts supplied in the brief or business profile. Never invent qualifications, testimonials, results, prices, guarantees, scarcity, or locations.
Write natural British English, avoid hype, avoid em dashes, and make the call to action match the supplied conversion goal.
Create only the sections selected in websiteBrief.sections. Use the matching selected section ID exactly once.
Return JSON only.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            businessProfile: profile ? {
              businessName: profile.businessName,
              niche: profile.niche,
              location: profile.location,
              service: profile.service,
              audience: profile.audience,
              conversionGoal: profile.conversionGoal,
              evidence: profile.evidenceData,
            } : null,
            websiteBrief: project.briefData,
            selectedStyle: project.styleData,
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Website generator returned no content");
    const generated = z.object({
      copy: z.object({
        headline: z.string().min(1),
        subheadline: z.string().min(1),
        about: z.string().min(1),
        button: z.string().min(1),
      }),
      sections: z.array(z.object({
        id: z.string(),
        title: z.string(),
        body: z.string(),
      })),
    }).parse(JSON.parse(content));

    const completedAt = new Date();
    const [updated] = await db.update(websiteProjectsTable).set({
      status: "draft_ready",
      currentStage: "editor",
      styleData: { ...project.styleData, copy: generated.copy },
      sections: generated.sections,
      progressData: [{
        step: "generation",
        status: "completed",
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
      }],
      updatedAt: completedAt,
    }).where(eq(websiteProjectsTable.id, projectId)).returning();
    return res.json(serializeProject(updated));
  } catch (error) {
    req.log.error({ err: error, projectId }, "Website generation failed");
    await db.update(websiteProjectsTable).set({
      status: "generation_failed",
      currentStage: "direction",
      progressData: [{ step: "generation", status: "failed", startedAt: startedAt.toISOString() }],
      updatedAt: new Date(),
    }).where(eq(websiteProjectsTable.id, projectId));
    return res.status(502).json({ error: "Website generation failed. Please try again." });
  }
});

router.post("/website-projects/:projectId/refine", async (req, res: Response) => {
  const { userId } = req as unknown as AuthedRequest;
  const { projectId } = uuidParams.parse(req.params);
  const project = await ownedProject(projectId, userId);
  if (!project) return res.status(404).json({ error: "Website project not found" });
  const body = refineWebsiteCopyBody.parse(req.body);

  try {
    const { openai } = await import("@workspace/integrations-openai-ai-server");
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_WEBSITE_MODEL || "gpt-5.4-mini",
      max_completion_tokens: 900,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "website_copy_refinement",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["headline", "subheadline", "about", "button"],
            properties: {
              headline: { type: "string" },
              subheadline: { type: "string" },
              about: { type: "string" },
              button: { type: "string" },
            },
          },
        },
      },
      messages: [
        {
          role: "system",
          content: `Refine website copy for a fitness or wellness business.
Follow the requested change, focusing on the selected field while keeping the complete copy coherent.
Use only facts present in the supplied brief and current copy. Never invent qualifications, testimonials, results, prices, guarantees, scarcity, or locations.
Write natural British English, avoid hype and em dashes, and return JSON only.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            request: body.prompt,
            selectedPart: body.selectedPart,
            currentCopy: body.currentCopy,
            websiteBrief: project.briefData,
          }),
        },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Copy editor returned no content");
    const copy = refineWebsiteCopyBody.shape.currentCopy.parse(JSON.parse(content));
    const [updated] = await db.update(websiteProjectsTable).set({
      styleData: { ...project.styleData, copy },
      status: "draft_ready",
      currentStage: "editor",
      updatedAt: new Date(),
    }).where(eq(websiteProjectsTable.id, projectId)).returning();
    return res.json(serializeProject(updated));
  } catch (error) {
    req.log.error({ err: error, projectId }, "Website copy refinement failed");
    return res.status(502).json({ error: "The copy edit could not be completed. Your current draft is unchanged." });
  }
});

export default router;