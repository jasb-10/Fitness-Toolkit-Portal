import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import {
  supportArticlesTable,
  supportKbSourcesTable,
  supportConversationsTable,
  supportMessagesTable,
  refundRequestsTable,
  settingsTable,
  usersTable,
  coursesTable,
  chaptersTable,
  lessonsTable,
} from "@workspace/db";
import { desc, eq, asc } from "drizzle-orm";
import {
  SendSupportMessageBody,
  CreateRefundRequestBody,
} from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";
import { getStripe } from "../lib/stripe";
import { billingTable } from "@workspace/db";
import {
  recordActivity,
  summarizeActivity,
  summaryToPromptText,
} from "../lib/activity";

const router: IRouter = Router();

router.use(requireAuth);

const DEFAULT_SETTINGS = {
  refundPolicy:
    "Refunds may be requested within 14 days of purchase. Submit a request below and our team will review it.",
  autoApproveUnderAmount: null as number | null,
  supportSystemPrompt:
    "You are a helpful support assistant for this learning platform. Answer using the provided knowledge base and course outline. If you do not know the answer, suggest contacting support or filing a refund request.",
  refundDaysWindow: 14 as number | null,
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `article-${Date.now()}`;
}

function articleDto(a: typeof supportArticlesTable.$inferSelect) {
  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    body: a.body,
    kind: a.kind,
    category: a.category,
    published: a.published,
    aiGenerated: a.aiGenerated,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

async function getSettings() {
  const [row] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "support"));
  return { ...DEFAULT_SETTINGS, ...((row?.value as object) ?? {}) };
}

async function buildKbContext(): Promise<string> {
  const [articles, sources, courses] = await Promise.all([
    db
      .select()
      .from(supportArticlesTable)
      .where(eq(supportArticlesTable.published, true))
      .orderBy(desc(supportArticlesTable.updatedAt))
      .limit(40),
    db
      .select()
      .from(supportKbSourcesTable)
      .orderBy(desc(supportKbSourcesTable.createdAt))
      .limit(40),
    db.select().from(coursesTable),
  ]);

  const courseIds = courses.map((c) => c.id);
  const allChapters = courseIds.length
    ? await db.select().from(chaptersTable)
    : [];
  const allLessons = courseIds.length
    ? await db.select().from(lessonsTable)
    : [];

  const courseOutline = courses
    .map((c) => {
      const chs = allChapters
        .filter((ch) => ch.courseId === c.id)
        .sort((a, b) => a.position - b.position);
      const body = chs
        .map((ch) => {
          const ls = allLessons
            .filter((l) => l.chapterId === ch.id)
            .sort((a, b) => a.position - b.position)
            .map((l) => `    - ${l.title}`)
            .join("\n");
          return `  - ${ch.title}\n${ls}`;
        })
        .join("\n");
      return `Course: ${c.title}\n${body}`;
    })
    .join("\n\n");

  const articleText = articles
    .map((a) => `# ${a.title}\n${a.body}`)
    .join("\n\n---\n\n");
  const sourceText = sources
    .map(
      (s) =>
        `# ${s.title}${s.url ? ` (${s.url})` : ""}\n${s.content.slice(0, 4000)}`,
    )
    .join("\n\n---\n\n");

  return [
    courseOutline && `## Course outline\n${courseOutline}`,
    articleText && `## Help articles\n${articleText}`,
    sourceText && `## Knowledge base\n${sourceText}`,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 24000);
}

router.get("/support/articles", async (_req, res: Response) => {
  const rows = await db
    .select()
    .from(supportArticlesTable)
    .where(eq(supportArticlesTable.published, true))
    .orderBy(asc(supportArticlesTable.kind), desc(supportArticlesTable.updatedAt));
  res.json(rows.map(articleDto));
});

router.get("/support/articles/:slug", async (req, res: Response) => {
  const [row] = await db
    .select()
    .from(supportArticlesTable)
    .where(eq(supportArticlesTable.slug, req.params.slug!));
  if (!row || !row.published)
    return res.status(404).json({ error: "Not found" });
  res.json(articleDto(row));
});

router.get("/support/conversations", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  const rows = await db
    .select()
    .from(supportConversationsTable)
    .where(eq(supportConversationsTable.userId, ar.userId))
    .orderBy(desc(supportConversationsTable.createdAt));
  res.json(
    rows.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt.toISOString(),
    })),
  );
});

router.post("/support/conversations", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  const [c] = await db
    .insert(supportConversationsTable)
    .values({ userId: ar.userId, title: "New conversation" })
    .returning();
  res.json({
    id: c!.id,
    title: c!.title,
    createdAt: c!.createdAt.toISOString(),
  });
});

router.get(
  "/support/conversations/:conversationId/messages",
  async (req, res: Response) => {
    const ar = req as AuthedRequest;
    const [conv] = await db
      .select()
      .from(supportConversationsTable)
      .where(eq(supportConversationsTable.id, req.params.conversationId!));
    if (!conv) return res.status(404).json({ error: "Not found" });
    if (conv.userId !== ar.userId)
      return res.status(403).json({ error: "Forbidden" });
    const rows = await db
      .select()
      .from(supportMessagesTable)
      .where(eq(supportMessagesTable.conversationId, conv.id))
      .orderBy(asc(supportMessagesTable.createdAt));
    res.json(
      rows.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    );
  },
);

type RefundOutcome = {
  status: "processed" | "pending" | "denied" | "failed";
  message: string;
  refundId?: string;
  amountRefunded?: number | null;
};

async function processRefundTool(args: {
  userId: string;
  reason: string;
  amount?: number | null;
  stripeChargeId?: string | null;
}): Promise<RefundOutcome> {
  const settings = await getSettings();
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, args.userId));
  const [billing] = await db
    .select()
    .from(billingTable)
    .where(eq(billingTable.userId, args.userId));

  // Window check: based on billing record creation. Customize for your own
  // purchase-tracking scheme.
  const refundDays = settings.refundDaysWindow;
  if (refundDays && billing?.createdAt) {
    const ageDays =
      (Date.now() - billing.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > refundDays) {
      const [row] = await db
        .insert(refundRequestsTable)
        .values({
          userId: args.userId,
          reason: args.reason,
          amount: args.amount != null ? String(args.amount) : null,
          stripeChargeId: args.stripeChargeId ?? null,
          status: "denied",
          decisionNote: `Outside ${refundDays}-day refund window (purchase is ${Math.floor(ageDays)} days old).`,
          resolvedAt: new Date(),
        })
        .returning();
      return {
        status: "denied",
        message: `This purchase is ${Math.floor(ageDays)} days old, which is outside our ${refundDays}-day refund window. The request was logged (id ${row!.id}).`,
      };
    }
  }

  const stripe = getStripe();
  const autoApprove = settings.autoApproveUnderAmount;
  const eligibleForAuto =
    !!stripe &&
    autoApprove != null &&
    (args.amount == null || args.amount <= autoApprove);

  let chargeId = args.stripeChargeId ?? null;

  // Try to find the customer's most recent successful charge by email when
  // the model didn't provide a charge id.
  if (eligibleForAuto && !chargeId && stripe && user?.email) {
    try {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });
      const customer = customers.data[0];
      if (customer) {
        const charges = await stripe.charges.list({
          customer: customer.id,
          limit: 5,
        });
        const candidate = charges.data.find(
          (c) => c.paid && !c.refunded && c.status === "succeeded",
        );
        if (candidate) chargeId = candidate.id;
      }
    } catch {
      // Fall through to manual queueing below.
    }
  }

  if (eligibleForAuto && chargeId && stripe) {
    try {
      const refund = await stripe.refunds.create({
        charge: chargeId,
        ...(args.amount && args.amount > 0
          ? { amount: Math.round(args.amount * 100) }
          : {}),
      });
      const [row] = await db
        .insert(refundRequestsTable)
        .values({
          userId: args.userId,
          reason: args.reason,
          amount: args.amount != null ? String(args.amount) : null,
          stripeChargeId: chargeId,
          stripeRefundId: refund.id,
          status: "processed",
          decisionNote: "Auto-approved by support assistant.",
          resolvedAt: new Date(),
        })
        .returning();
      return {
        status: "processed",
        refundId: refund.id,
        amountRefunded: refund.amount ? refund.amount / 100 : null,
        message: `Refund issued via Stripe (id ${refund.id}, request ${row!.id}). It typically appears within 5–10 business days.`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stripe refund failed";
      const [row] = await db
        .insert(refundRequestsTable)
        .values({
          userId: args.userId,
          reason: args.reason,
          amount: args.amount != null ? String(args.amount) : null,
          stripeChargeId: chargeId,
          status: "failed",
          decisionNote: msg,
          resolvedAt: new Date(),
        })
        .returning();
      return {
        status: "failed",
        message: `I tried to process the refund but Stripe returned: ${msg}. The request (id ${row!.id}) has been escalated to our team.`,
      };
    }
  }

  // Otherwise queue for human review.
  const summary = await summarizeActivity(args.userId);
  const [row] = await db
    .insert(refundRequestsTable)
    .values({
      userId: args.userId,
      reason: args.reason,
      amount: args.amount != null ? String(args.amount) : null,
      stripeChargeId: chargeId,
      status: "pending",
      decisionNote: `User progress at time of request:\n${summaryToPromptText(summary)}`,
    })
    .returning();
  void recordActivity({
    userId: args.userId,
    action: "requested_refund",
    target: args.reason.slice(0, 200),
    metadata: {
      amount: args.amount ?? null,
      refundId: row!.id,
      lessonsCompleted: summary.lessonsCompleted,
      completionPct: summary.completionPct,
    },
  });
  return {
    status: "pending",
    message: `Your refund request (id ${row!.id}) has been logged for review. Our team responds within 2 business days.`,
  };
}

router.post(
  "/support/conversations/:conversationId/messages",
  async (req, res: Response) => {
    const ar = req as AuthedRequest;
    const body = SendSupportMessageBody.parse(req.body);
    const [conv] = await db
      .select()
      .from(supportConversationsTable)
      .where(eq(supportConversationsTable.id, req.params.conversationId!));
    if (!conv) return res.status(404).json({ error: "Not found" });
    if (conv.userId !== ar.userId)
      return res.status(403).json({ error: "Forbidden" });

    const [userMsg] = await db
      .insert(supportMessagesTable)
      .values({
        conversationId: conv.id,
        role: "user",
        content: body.content,
      })
      .returning();

    if (conv.title === "New conversation") {
      await db
        .update(supportConversationsTable)
        .set({ title: body.content.slice(0, 60) })
        .where(eq(supportConversationsTable.id, conv.id));
    }

    const settings = await getSettings();
    const kb = await buildKbContext();
    const userSummary = await summarizeActivity(ar.userId);
    const history = await db
      .select()
      .from(supportMessagesTable)
      .where(eq(supportMessagesTable.conversationId, conv.id))
      .orderBy(asc(supportMessagesTable.createdAt));

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "request_refund",
          description:
            "Open a refund request for the current user. Use this whenever the user asks for, hints at, or accepts a refund. The system will check policy and, when allowed, automatically issue the refund via Stripe. Otherwise it queues the request for human review.",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "Short summary (one or two sentences) of why the user wants a refund.",
              },
              amount: {
                type: "number",
                description: "Refund amount in dollars if the user specified one. Omit for full refund.",
              },
            },
            required: ["reason"],
            additionalProperties: false,
          },
        },
      },
    ];

    const systemPrompt = [
      settings.supportSystemPrompt,
      `\nRefund policy: ${settings.refundPolicy}`,
      settings.refundDaysWindow != null
        ? `Refund window: ${settings.refundDaysWindow} days from purchase.`
        : "",
      "When a user wants a refund, call the request_refund tool exactly once with a clear reason. Do not promise a refund before the tool returns; instead summarize the tool result accurately.",
      `\nUser activity & progress (use this to evaluate refund eligibility against policy):\n${summaryToPromptText(userSummary)}`,
      `\nUse the following context to answer:\n${kb || "(no knowledge base content yet)"}`,
    ]
      .filter(Boolean)
      .join("\n");

    const baseMessages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];

    let assistantText = "";
    try {
      const { openai } = await import(
        "@workspace/integrations-openai-ai-server"
      );
      const first = await openai.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 1200,
        tools,
        messages: baseMessages,
      });
      const choice = first.choices[0]?.message;
      const toolCalls = choice?.tool_calls ?? [];

      if (toolCalls.length > 0) {
        const toolMessages: Array<{
          role: "tool";
          tool_call_id: string;
          content: string;
        }> = [];
        for (const call of toolCalls) {
          if (call.type !== "function") continue;
          if (call.function.name === "request_refund") {
            let args: { reason?: string; amount?: number } = {};
            try {
              args = JSON.parse(call.function.arguments || "{}");
            } catch {
              args = { reason: "Refund requested" };
            }
            const outcome = await processRefundTool({
              userId: ar.userId,
              reason: args.reason || "Refund requested",
              amount: typeof args.amount === "number" ? args.amount : null,
            });
            toolMessages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify(outcome),
            });
          } else {
            toolMessages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify({ error: "Unknown tool" }),
            });
          }
        }
        const followUp = await openai.chat.completions.create({
          model: "gpt-5.2",
          max_completion_tokens: 800,
          messages: [
            ...baseMessages,
            {
              role: "assistant",
              content: choice?.content ?? "",
              tool_calls: toolCalls,
            },
            ...toolMessages,
          ],
        });
        assistantText = followUp.choices[0]?.message?.content?.trim() || "";
      } else {
        assistantText = choice?.content?.trim() || "";
      }

      if (!assistantText) {
        assistantText =
          "I'm not sure how to help with that — please contact our support team.";
      }
    } catch (err) {
      req.log?.error({ err }, "OpenAI support reply failed");
      assistantText =
        "Our AI assistant is temporarily unavailable. Please try again or contact support.";
    }

    const [assistantMsg] = await db
      .insert(supportMessagesTable)
      .values({
        conversationId: conv.id,
        role: "assistant",
        content: assistantText,
      })
      .returning();

    res.json({
      user: {
        id: userMsg!.id,
        conversationId: userMsg!.conversationId,
        role: userMsg!.role,
        content: userMsg!.content,
        createdAt: userMsg!.createdAt.toISOString(),
      },
      assistant: {
        id: assistantMsg!.id,
        conversationId: assistantMsg!.conversationId,
        role: assistantMsg!.role,
        content: assistantMsg!.content,
        createdAt: assistantMsg!.createdAt.toISOString(),
      },
    });
  },
);

function refundDto(
  r: typeof refundRequestsTable.$inferSelect,
  user?: { name: string | null; email: string | null } | null,
) {
  return {
    id: r.id,
    userId: r.userId,
    userName: user?.name ?? "",
    userEmail: user?.email ?? "",
    amount: r.amount ?? null,
    reason: r.reason,
    status: r.status,
    decisionNote: r.decisionNote,
    stripeChargeId: r.stripeChargeId,
    stripeRefundId: r.stripeRefundId,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
  };
}

router.get("/support/refund-requests", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  const rows = await db
    .select({ r: refundRequestsTable, u: usersTable })
    .from(refundRequestsTable)
    .leftJoin(usersTable, eq(usersTable.id, refundRequestsTable.userId))
    .where(eq(refundRequestsTable.userId, ar.userId))
    .orderBy(desc(refundRequestsTable.createdAt));
  res.json(rows.map(({ r, u }) => refundDto(r, u)));
});

router.post("/support/refund-requests", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  const body = CreateRefundRequestBody.parse(req.body);
  const [r] = await db
    .insert(refundRequestsTable)
    .values({
      userId: ar.userId,
      reason: body.reason,
      amount: body.amount ?? null,
      stripeChargeId: body.stripeChargeId ?? null,
    })
    .returning();
  const [u] = await db
    .select({ name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, ar.userId));
  res.status(201).json(refundDto(r!, u));
});

export default router;
export { getSettings, buildKbContext, articleDto, refundDto, slugify, DEFAULT_SETTINGS };
