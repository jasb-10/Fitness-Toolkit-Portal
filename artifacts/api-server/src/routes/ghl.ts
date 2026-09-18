import { Router, type IRouter, type Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { clerkClient } from "@clerk/express";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  ghlProductMappingsTable,
  ghlPurchaseEventsTable,
  productEntitlementsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();
const purchaseBody = z.object({
  eventId: z.string().trim().min(1).max(300),
  orderId: z.string().trim().min(1).max(300),
  contactId: z.string().trim().max(300).optional(),
  email: z.string().email(),
  productId: z.string().trim().min(1).max(300),
  eventType: z.enum(["paid", "refunded", "chargeback", "failed"]),
  occurredAt: z.string().datetime().optional(),
}).strict();
const mappingBody = z.object({
  externalProductId: z.string().trim().min(1).max(300).nullable(),
  enabled: z.boolean(),
});

function secretMatches(supplied: string | undefined) {
  const expected = process.env.GHL_WEBHOOK_SECRET;
  if (!expected || !supplied) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function ensureMappings() {
  const defaults = [
    { productCode: "fitness-website-core", productName: "Personalised Website", priceCents: 2700, enabled: true, deliverableReady: true },
    { productCode: "fitness-extra-pages", productName: "Extra Pages", priceCents: 0, enabled: false, deliverableReady: false },
    { productCode: "fitness-bump-2", productName: "Bump 2 (undecided)", priceCents: 0, enabled: false, deliverableReady: false },
    { productCode: "fitness-campaign-studio", productName: "Campaign Studio", priceCents: 4700, enabled: false, deliverableReady: false },
    { productCode: "fitness-meta-ads", productName: "Meta Ad Launch Pack", priceCents: 9700, enabled: false, deliverableReady: false },
  ];
  await db.insert(ghlProductMappingsTable).values(defaults).onConflictDoNothing();
  // A saved page-selection plan is not the paid multi-page deliverable. Keep
  // existing development mappings unsellable until generation/export is built.
  await db.update(ghlProductMappingsTable).set({
    enabled: false,
    deliverableReady: false,
  }).where(eq(ghlProductMappingsTable.productCode, "fitness-extra-pages"));
}

async function sendActivation(email: string) {
  const [localUser] = await db.select().from(usersTable)
    .where(sql`lower(${usersTable.email}) = ${email}`).limit(1);
  if (localUser?.clerkId) return "existing_account";
  try {
    await clerkClient.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: process.env.PORTAL_PUBLIC_URL || undefined,
      ignoreExisting: true,
    });
    return "sent";
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Clerk invitation failed");
  }
}

async function applyEntitlement(event: typeof ghlPurchaseEventsTable.$inferSelect) {
  if (!event.productCode) throw new Error("Unmapped purchase event cannot grant access");
  // A failed checkout or payment attempt is not a refund of an earlier
  // successful purchase. Record it for support, but never change access.
  if (event.eventType === "failed") return;
  const productCode = event.productCode;
  await db.transaction(async (tx) => {
    // Serialise events for a single purchased product. A delayed paid delivery
    // must never reopen an order that has already been refunded/charged back.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${event.orderId + ":" + productCode}))`);
    const [user] = await tx.select({ id: usersTable.id }).from(usersTable)
      .where(sql`lower(${usersTable.email}) = ${event.purchaserEmail}`).limit(1);
    const [existing] = await tx.select().from(productEntitlementsTable).where(and(
      eq(productEntitlementsTable.externalOrderId, event.orderId),
      eq(productEntitlementsTable.productCode, productCode),
    )).limit(1);
    const [terminalEvent] = await tx.select({ id: ghlPurchaseEventsTable.id })
      .from(ghlPurchaseEventsTable).where(and(
        eq(ghlPurchaseEventsTable.orderId, event.orderId),
        eq(ghlPurchaseEventsTable.productCode, productCode),
        sql`${ghlPurchaseEventsTable.eventType} in ('refunded', 'chargeback')`,
        sql`${ghlPurchaseEventsTable.processingStatus} <> 'unmatched'`,
      )).limit(1);
    const status = event.eventType === "paid" && !terminalEvent ? "active" : "revoked";
    if (existing) {
      await tx.update(productEntitlementsTable).set({
        userId: user?.id ?? existing.userId,
        status,
        updatedAt: new Date(),
      }).where(eq(productEntitlementsTable.id, existing.id));
    } else {
      await tx.insert(productEntitlementsTable).values({
        userId: user?.id ?? null,
        purchaserEmail: event.purchaserEmail,
        productCode,
        status,
        source: "ghl",
        externalOrderId: event.orderId,
      });
    }
  });
}

async function processEvent(event: typeof ghlPurchaseEventsTable.$inferSelect) {
  await applyEntitlement(event);
  let activationStatus = "not_required";
  if (event.eventType === "paid" && event.productCode === "fitness-website-core") {
    // Do not invite someone on a late paid event for an already revoked order.
    const [entitlement] = await db.select({ status: productEntitlementsTable.status })
      .from(productEntitlementsTable).where(and(
        eq(productEntitlementsTable.externalOrderId, event.orderId),
        eq(productEntitlementsTable.productCode, "fitness-website-core"),
      )).limit(1);
    if (entitlement?.status === "active") activationStatus = await sendActivation(event.purchaserEmail);
  }
  await db.update(ghlPurchaseEventsTable).set({
    processingStatus: "completed", activationStatus, error: null, processedAt: new Date(),
  }).where(eq(ghlPurchaseEventsTable.id, event.id));
  return activationStatus;
}

router.post("/webhooks/ghl/purchase", async (req, res: Response) => {
  if (!process.env.GHL_WEBHOOK_SECRET) {
    return res.status(503).json({ error: "GHL webhook is not configured" });
  }
  if (!secretMatches(req.header("x-fitness-toolkit-webhook-secret"))) {
    return res.status(401).json({ error: "Invalid webhook credentials" });
  }
  const parsed = purchaseBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid purchase event", details: parsed.error.flatten().fieldErrors });
  }
  await ensureMappings();
  const body = parsed.data;
  const email = body.email.trim().toLowerCase();
  const [mapping] = await db.select().from(ghlProductMappingsTable)
    .where(eq(ghlProductMappingsTable.externalProductId, body.productId)).limit(1);
  const [priorPurchase] = mapping ? [] : await db.select({ productCode: ghlPurchaseEventsTable.productCode })
    .from(ghlPurchaseEventsTable).where(and(
      eq(ghlPurchaseEventsTable.orderId, body.orderId),
      eq(ghlPurchaseEventsTable.externalProductId, body.productId),
      eq(ghlPurchaseEventsTable.eventType, "paid"),
    )).limit(1);
  const productCode = mapping?.productCode ?? priorPurchase?.productCode ?? null;
  const accepted = body.eventType === "paid"
    ? Boolean(mapping?.enabled && mapping.deliverableReady)
    : Boolean(productCode);
  const [inserted] = await db.insert(ghlPurchaseEventsTable).values({
    eventId: body.eventId,
    orderId: body.orderId,
    contactId: body.contactId,
    purchaserEmail: email,
    externalProductId: body.productId,
    productCode,
    eventType: body.eventType,
    processingStatus: accepted ? "processing" : "unmatched",
    error: accepted ? null : "Product ID is not mapped to an enabled, ready product",
    payload: body,
  }).onConflictDoNothing({ target: ghlPurchaseEventsTable.eventId }).returning();
  if (!inserted) {
    const [prior] = await db.select().from(ghlPurchaseEventsTable)
      .where(eq(ghlPurchaseEventsTable.eventId, body.eventId)).limit(1);
    if (prior?.orderId !== body.orderId || prior?.externalProductId !== body.productId ||
      prior?.eventType !== body.eventType || prior?.purchaserEmail !== email) {
      return res.status(409).json({ error: "Event ID was already used for different purchase details" });
    }
    if (prior.processingStatus === "failed") {
      return res.status(503).json({ received: true, duplicate: true, status: "failed", error: "Owner review and retry required" });
    }
    return res.json({ received: true, duplicate: true, status: prior.processingStatus });
  }
  const event = inserted;
  if (!accepted) return res.status(202).json({ received: true, status: "unmatched" });

  try {
    await processEvent(event);
    return res.json({ received: true, status: "completed" });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Fulfilment failed";
    await db.update(ghlPurchaseEventsTable).set({
      processingStatus: "failed",
      activationStatus: body.eventType === "paid" && productCode === "fitness-website-core" ? "failed" : "not_required",
      error: message,
      processedAt: new Date(),
    }).where(eq(ghlPurchaseEventsTable.id, event.id));
    req.log.error({ err: error, eventId: body.eventId }, "GHL fulfilment failed");
    return res.status(500).json({ received: true, status: "failed" });
  }
});

router.use("/admin/ghl", requireAuth, requireRole(["owner", "super_admin"]));

router.get("/admin/ghl", async (_req, res: Response) => {
  await ensureMappings();
  const [mappings, events, active] = await Promise.all([
    db.select().from(ghlProductMappingsTable).orderBy(ghlProductMappingsTable.priceCents),
    db.select().from(ghlPurchaseEventsTable).orderBy(desc(ghlPurchaseEventsTable.receivedAt)).limit(100),
    db.select({ count: sql<number>`count(*)::int` }).from(productEntitlementsTable)
      .where(eq(productEntitlementsTable.status, "active")),
  ]);
  return res.json({
    configured: Boolean(process.env.GHL_WEBHOOK_SECRET),
    webhookPath: "/api/webhooks/ghl/purchase",
    setupComplete: events.some((event) =>
      event.eventType === "paid" &&
      event.processingStatus === "completed" &&
      Boolean(event.productCode)
    ),
    activeEntitlements: Number(active[0]?.count ?? 0),
    mappings: mappings.map((mapping) => ({
      ...mapping,
      enabled: Boolean(mapping.externalProductId) && mapping.enabled,
    })),
    events,
  });
});

router.patch("/admin/ghl/mappings/:productCode", async (req, res: Response) => {
  await ensureMappings();
  const body = mappingBody.parse(req.body);
  const enabled = Boolean(body.externalProductId) && body.enabled;
  const [current] = await db.select().from(ghlProductMappingsTable)
    .where(eq(ghlProductMappingsTable.productCode, req.params.productCode!)).limit(1);
  if (!current) return res.status(404).json({ error: "Product mapping not found" });
  if (enabled && !current.deliverableReady) return res.status(409).json({ error: "This product is not ready for sale" });
  const [updated] = await db.update(ghlProductMappingsTable).set({
    externalProductId: body.externalProductId,
    enabled,
    updatedAt: new Date(),
  }).where(eq(ghlProductMappingsTable.productCode, req.params.productCode!)).returning();
  if (!updated) return res.status(404).json({ error: "Product mapping not found" });
  return res.json(updated);
});

router.post("/admin/ghl/events/:eventId/retry", async (req, res: Response) => {
  const [event] = await db.select().from(ghlPurchaseEventsTable)
    .where(eq(ghlPurchaseEventsTable.id, req.params.eventId!)).limit(1);
  if (!event || event.processingStatus !== "failed" || !event.productCode) {
    return res.status(400).json({ error: "This event cannot be retried" });
  }
  try {
    const activationStatus = await processEvent(event);
    return res.json({ ok: true, activationStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Retry failed";
    await db.update(ghlPurchaseEventsTable).set({ processingStatus: "failed", activationStatus: "failed", error: message })
      .where(eq(ghlPurchaseEventsTable.id, event.id));
    return res.status(502).json({ error: message });
  }
});

export default router;
