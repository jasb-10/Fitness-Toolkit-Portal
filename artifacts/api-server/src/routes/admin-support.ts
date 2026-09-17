import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import {
  supportArticlesTable,
  supportKbSourcesTable,
  refundRequestsTable,
  settingsTable,
  usersTable,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import {
  AdminCreateSupportArticleBody as UpsertSupportArticleBody,
  AdminGenerateSupportArticleBody as GenerateArticleBody,
  AdminCreateKbSourceBody as CreateKbSourceBody,
  AdminUpdateRefundRequestBody as UpdateRefundRequestBody,
  AdminUpdateSupportSettingsBody as SupportSettings,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
  articleDto,
  buildKbContext,
  DEFAULT_SETTINGS,
  getSettings,
  refundDto,
  slugify,
} from "./support";
import { getStripe, probeStripe } from "../lib/stripe";
import { bulkGenerateArticles } from "../lib/bulkArticles";
import {
  sendEmail,
  refundStatusEmail,
  probeResend,
  getPortalUrl,
} from "../lib/email";

const router: IRouter = Router();

router.use(requireAuth);
router.use("/admin/support", requireRole(["super_admin", "admin"]));

router.get("/admin/support/articles", async (_req, res: Response) => {
  const rows = await db
    .select()
    .from(supportArticlesTable)
    .orderBy(desc(supportArticlesTable.updatedAt));
  res.json(rows.map(articleDto));
});

router.post("/admin/support/articles", async (req, res: Response) => {
  const body = UpsertSupportArticleBody.parse(req.body);
  const baseSlug = slugify(body.title);
  let slug = baseSlug;
  let n = 1;
  while (
    (
      await db
        .select({ id: supportArticlesTable.id })
        .from(supportArticlesTable)
        .where(eq(supportArticlesTable.slug, slug))
    ).length
  ) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }
  const [row] = await db
    .insert(supportArticlesTable)
    .values({
      title: body.title,
      body: body.body,
      kind: body.kind,
      category: body.category ?? null,
      published: body.published ?? true,
      slug,
    })
    .returning();
  res.status(201).json(articleDto(row!));
});

router.patch(
  "/admin/support/articles/:articleId",
  async (req, res: Response) => {
    const body = UpsertSupportArticleBody.parse(req.body);
    const [row] = await db
      .update(supportArticlesTable)
      .set({
        title: body.title,
        body: body.body,
        kind: body.kind,
        category: body.category ?? null,
        published: body.published ?? true,
        updatedAt: new Date(),
      })
      .where(eq(supportArticlesTable.id, req.params.articleId!))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(articleDto(row));
  },
);

router.delete(
  "/admin/support/articles/:articleId",
  async (req, res: Response) => {
    await db
      .delete(supportArticlesTable)
      .where(eq(supportArticlesTable.id, req.params.articleId!));
    res.status(204).end();
  },
);

router.post(
  "/admin/support/articles/generate",
  async (req, res: Response) => {
    const body = GenerateArticleBody.parse(req.body);
    const kb = await buildKbContext();
    let title = body.topic;
    let bodyText = "";
    try {
      const { openai } = await import(
        "@workspace/integrations-openai-ai-server"
      );
      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 1500,
        messages: [
          {
            role: "system",
            content: `You write concise help-center ${body.kind === "faq" ? "FAQ entries" : "articles"} for a learning platform. Use markdown. Use the knowledge base to ground answers.`,
          },
          {
            role: "user",
            content: `Knowledge base:\n${kb || "(empty)"}\n\nTopic: ${body.topic}\n\nReturn a JSON object with keys "title" and "body" (markdown).`,
          },
        ],
        response_format: { type: "json_object" },
      });
      const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
      const parsed = JSON.parse(raw);
      title = typeof parsed.title === "string" && parsed.title ? parsed.title : body.topic;
      bodyText = typeof parsed.body === "string" ? parsed.body : "";
    } catch (err) {
      req.log?.error({ err }, "AI article generation failed");
      return res
        .status(502)
        .json({ error: "AI generation failed. Please try again." });
    }
    const baseSlug = slugify(title);
    let slug = baseSlug;
    let n = 1;
    while (
      (
        await db
          .select({ id: supportArticlesTable.id })
          .from(supportArticlesTable)
          .where(eq(supportArticlesTable.slug, slug))
      ).length
    ) {
      n += 1;
      slug = `${baseSlug}-${n}`;
    }
    const [row] = await db
      .insert(supportArticlesTable)
      .values({
        title,
        body: bodyText,
        kind: body.kind,
        published: false,
        aiGenerated: true,
        slug,
      })
      .returning();
    res.json(articleDto(row!));
  },
);

router.post(
  "/admin/support/articles/bulk-generate",
  async (req, res: Response) => {
    const body = (req.body ?? {}) as {
      maxArticles?: unknown;
      onlyMissing?: unknown;
      concurrency?: unknown;
    };
    const maxArticles = Math.min(
      40,
      Math.max(1, Number(body.maxArticles) || 20),
    );
    const concurrency = Math.min(6, Math.max(1, Number(body.concurrency) || 4));
    const onlyMissing = body.onlyMissing !== false;

    try {
      const summary = await bulkGenerateArticles({
        maxArticles,
        concurrency,
        onlyMissing,
      });
      res.json(summary);
    } catch (err) {
      req.log?.error({ err }, "Bulk article generation failed");
      res.status(502).json({ error: "Bulk generation failed. Please try again." });
    }
  },
);

router.get("/admin/support/kb", async (_req, res: Response) => {
  const rows = await db
    .select()
    .from(supportKbSourcesTable)
    .orderBy(desc(supportKbSourcesTable.createdAt));
  res.json(
    rows.map((s) => ({
      id: s.id,
      kind: s.kind,
      title: s.title,
      url: s.url,
      content: s.content,
      createdAt: s.createdAt.toISOString(),
    })),
  );
});

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h === "::1") return true;
  // IPv4 literal
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local + AWS metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true; // multicast/reserved
  }
  // IPv6 unique-local / link-local / loopback
  if (h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80:")) {
    return true;
  }
  return false;
}

async function safeFetchText(rawUrl: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  if (isPrivateHost(parsed.hostname)) {
    throw new Error("URL host is not allowed");
  }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10_000);
  try {
    const r = await fetch(parsed.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SupportBot/1.0)" },
      redirect: "manual",
      signal: ctl.signal,
    });
    if (r.status >= 300 && r.status < 400) {
      throw new Error("Redirects are not allowed");
    }
    if (!r.ok) throw new Error(`Upstream responded ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(timer);
  }
}

router.post("/admin/support/kb", async (req, res: Response) => {
  const body = CreateKbSourceBody.parse(req.body);
  let content = body.content ?? "";
  if (body.kind === "url" && body.url && !content) {
    try {
      const html = await safeFetchText(body.url);
      content = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 12000);
    } catch (err) {
      req.log?.error({ err }, "KB URL fetch failed");
      return res
        .status(400)
        .json({ error: err instanceof Error ? err.message : "Fetch failed" });
    }
  }
  const [row] = await db
    .insert(supportKbSourcesTable)
    .values({
      kind: body.kind,
      title: body.title,
      url: body.url ?? null,
      content,
    })
    .returning();
  res.status(201).json({
    id: row!.id,
    kind: row!.kind,
    title: row!.title,
    url: row!.url,
    content: row!.content,
    createdAt: row!.createdAt.toISOString(),
  });
});

router.delete("/admin/support/kb/:sourceId", async (req, res: Response) => {
  await db
    .delete(supportKbSourcesTable)
    .where(eq(supportKbSourcesTable.id, req.params.sourceId!));
  res.status(204).end();
});

router.get("/admin/support/refund-requests", async (_req, res: Response) => {
  const rows = await db
    .select({ r: refundRequestsTable, u: usersTable })
    .from(refundRequestsTable)
    .leftJoin(usersTable, eq(usersTable.id, refundRequestsTable.userId))
    .orderBy(desc(refundRequestsTable.createdAt));
  res.json(rows.map(({ r, u }) => refundDto(r, u)));
});

router.patch(
  "/admin/support/refund-requests/:refundId",
  async (req, res: Response) => {
    const body = UpdateRefundRequestBody.parse(req.body);
    const [existing] = await db
      .select()
      .from(refundRequestsTable)
      .where(eq(refundRequestsTable.id, req.params.refundId!));
    if (!existing) return res.status(404).json({ error: "Not found" });

    let status = body.status;
    let stripeRefundId = body.stripeRefundId ?? existing.stripeRefundId ?? null;
    const stripeChargeId =
      body.stripeChargeId ?? existing.stripeChargeId ?? null;
    let decisionNote = body.decisionNote ?? existing.decisionNote ?? null;

    if (body.executeStripeRefund) {
      const stripe = getStripe();
      if (!stripe) {
        return res.status(400).json({
          error:
            "Stripe is not configured. Set STRIPE_SECRET_KEY in your environment to enable refund execution.",
        });
      }
      if (!stripeChargeId) {
        return res
          .status(400)
          .json({ error: "Stripe charge ID is required to execute a refund." });
      }
      try {
        const amountFloat = existing.amount
          ? Number.parseFloat(existing.amount)
          : NaN;
        const refund = await stripe.refunds.create({
          charge: stripeChargeId,
          ...(Number.isFinite(amountFloat) && amountFloat > 0
            ? { amount: Math.round(amountFloat * 100) }
            : {}),
        });
        stripeRefundId = refund.id;
        status = "processed";
      } catch (err) {
        status = "failed";
        const msg = err instanceof Error ? err.message : "Stripe refund failed";
        decisionNote = decisionNote ? `${decisionNote}\n\n${msg}` : msg;
      }
    }

    const resolved =
      status === "approved" ||
      status === "denied" ||
      status === "processed" ||
      status === "failed";
    const [row] = await db
      .update(refundRequestsTable)
      .set({
        status,
        decisionNote,
        stripeRefundId,
        stripeChargeId,
        resolvedAt: resolved ? new Date() : null,
      })
      .where(eq(refundRequestsTable.id, req.params.refundId!))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    const [u] = await db
      .select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, row.userId));

    const statusChanged = existing.status !== row.status;
    const notifyStatuses = new Set([
      "approved",
      "denied",
      "processed",
      "failed",
    ]);
    if (statusChanged && u?.email && notifyStatuses.has(row.status)) {
      const tpl = refundStatusEmail({
        name: u.name ?? "there",
        status: row.status,
        amount: row.amount ?? null,
        reason: row.reason ?? "",
        decisionNote: row.decisionNote ?? null,
        portalUrl: getPortalUrl(),
      });
      void sendEmail({ to: u.email, ...tpl }).catch(() => {});
    }
    res.json(refundDto(row, u));
  },
);

router.get("/admin/support/stripe-status", async (_req, res: Response) => {
  const status = await probeStripe();
  res.json(status);
});

router.get("/admin/support/resend-status", async (_req, res: Response) => {
  const status = await probeResend();
  res.json(status);
});

router.get("/admin/support/settings", async (_req, res: Response) => {
  const s = await getSettings();
  res.json(s);
});

router.put("/admin/support/settings", async (req, res: Response) => {
  const body = SupportSettings.parse(req.body);
  const merged = { ...DEFAULT_SETTINGS, ...body };
  const existing = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "support"));
  if (existing.length === 0) {
    await db.insert(settingsTable).values({ key: "support", value: merged });
  } else {
    await db
      .update(settingsTable)
      .set({ value: merged })
      .where(eq(settingsTable.key, "support"));
  }
  res.json(merged);
});

export default router;
