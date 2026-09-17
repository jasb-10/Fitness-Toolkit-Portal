import { db } from "@workspace/db";
import {
  supportArticlesTable,
  supportKbSourcesTable,
  coursesTable,
  chaptersTable,
  lessonsTable,
} from "@workspace/db";
import { desc, eq, asc } from "drizzle-orm";
import { slugify } from "../routes/support";
import { getCompanySettings } from "./companySettings";

export interface BulkGenerationOptions {
  maxArticles: number;
  concurrency: number;
  onlyMissing: boolean;
}

export interface BulkGenerationSummary {
  planned: number;
  created: number;
  skipped: number;
  failed: number;
  categories: string[];
  articles: Array<{
    id: string;
    title: string;
    category: string | null;
    kind: string;
    slug: string;
  }>;
}

interface PlannedTopic {
  title: string;
  category: string;
  kind: "article" | "faq";
  prompt: string;
}

const MAX_KB_CHARS = 60000;

async function buildRichContext(): Promise<string> {
  const [sources, courses, company] = await Promise.all([
    db
      .select()
      .from(supportKbSourcesTable)
      .orderBy(desc(supportKbSourcesTable.createdAt))
      .limit(60),
    db.select().from(coursesTable).orderBy(asc(coursesTable.title)),
    getCompanySettings(),
  ]);

  const courseIds = courses.map((c) => c.id);
  const allChapters = courseIds.length
    ? await db.select().from(chaptersTable)
    : [];
  const allLessons = courseIds.length
    ? await db.select().from(lessonsTable)
    : [];

  const courseBlocks = courses
    .map((c) => {
      const chs = allChapters
        .filter((ch) => ch.courseId === c.id)
        .sort((a, b) => a.position - b.position);
      const chapterText = chs
        .map((ch) => {
          const ls = allLessons
            .filter((l) => l.chapterId === ch.id)
            .sort((a, b) => a.position - b.position)
            .map((l) => {
              const parts = [`### Lesson: ${l.title} (${l.lessonType})`];
              if (l.summary) parts.push(`Summary: ${l.summary}`);
              if (l.notes) parts.push(`Notes: ${l.notes.slice(0, 2500)}`);
              return parts.join("\n");
            })
            .join("\n\n");
          return `## Chapter: ${ch.title}\n${ls}`;
        })
        .join("\n\n");
      return `# Course: ${c.title}\n${c.subtitle ?? ""}\n\n${chapterText}`;
    })
    .join("\n\n===\n\n");

  const sourceText = sources
    .map(
      (s) =>
        `# KB Source: ${s.title}${s.url ? ` (${s.url})` : ""}\n${s.content.slice(0, 6000)}`,
    )
    .join("\n\n---\n\n");

  const companyBlock = `# Company\nName: ${company.name}\nWebsite: ${company.website ?? "n/a"}\nSupport email: ${company.supportEmail ?? "n/a"}`;

  return [companyBlock, courseBlocks, sourceText]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, MAX_KB_CHARS);
}

async function planTopics(
  context: string,
  maxArticles: number,
): Promise<PlannedTopic[]> {
  const { openai } = await import(
    "@workspace/integrations-openai-ai-server"
  );
  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 4000,
    messages: [
      {
        role: "system",
        content: `You design help-center content for a customer education platform. Given the platform's full curriculum and knowledge base, propose a comprehensive set of help articles and FAQs that would genuinely help students. Group articles by topical category (e.g., "Getting Started", "Account & Billing", "Meta Ads", "Course Curriculum: <title>"). Prefer specific, actionable titles over vague ones. Cover: getting started, account/billing, every major curriculum topic, troubleshooting, refund policy questions, and any product-specific knowledge surfaced in the KB.`,
      },
      {
        role: "user",
        content: `Knowledge:\n${context || "(empty)"}\n\nReturn a JSON object with a single key "topics" — an array of up to ${maxArticles} items. Each item: { "title": string, "category": string, "kind": "article" | "faq", "prompt": string }. The "prompt" is a 1–2 sentence brief telling a writer what this article must cover and what concrete answer or steps to give. Aim for a balanced mix: most should be "article", some should be "faq" for short Q&A topics.`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];
  const topicsRaw = (parsed as { topics?: unknown }).topics;
  if (!Array.isArray(topicsRaw)) return [];

  const topics: PlannedTopic[] = [];
  for (const t of topicsRaw) {
    if (!t || typeof t !== "object") continue;
    const obj = t as Record<string, unknown>;
    const title = typeof obj.title === "string" ? obj.title.trim() : "";
    const category =
      typeof obj.category === "string" && obj.category.trim()
        ? obj.category.trim()
        : "General";
    const kind = obj.kind === "faq" ? "faq" : "article";
    const prompt = typeof obj.prompt === "string" ? obj.prompt.trim() : "";
    if (!title) continue;
    topics.push({ title, category, kind, prompt });
    if (topics.length >= maxArticles) break;
  }
  return topics;
}

async function draftArticle(
  context: string,
  topic: PlannedTopic,
): Promise<{ title: string; body: string } | null> {
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
          content: `You write concise, helpful customer-support ${topic.kind === "faq" ? "FAQ entries" : "articles"} in markdown for a learning platform. Ground every claim in the knowledge base. Be specific. Prefer ordered steps when explaining a procedure. Keep articles to ~250–600 words; FAQs ~80–200 words.`,
        },
        {
          role: "user",
          content: `Knowledge base:\n${context || "(empty)"}\n\nTitle: ${topic.title}\nCategory: ${topic.category}\nBrief: ${topic.prompt || "Write a clear, useful entry on this title."}\n\nReturn a JSON object with keys "title" and "body" (markdown). Keep the title close to the given title.`,
        },
      ],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    const parsed = JSON.parse(raw) as { title?: unknown; body?: unknown };
    const title =
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim()
        : topic.title;
    const body = typeof parsed.body === "string" ? parsed.body : "";
    if (!body.trim()) return null;
    return { title, body };
  } catch {
    return null;
  }
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  let slug = base || "article";
  let n = 1;
  while (true) {
    const existing = await db
      .select({ id: supportArticlesTable.id })
      .from(supportArticlesTable)
      .where(eq(supportArticlesTable.slug, slug));
    if (existing.length === 0) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]!, i);
    }
  });
  await Promise.all(runners);
  return results;
}

export async function bulkGenerateArticles(
  opts: BulkGenerationOptions,
): Promise<BulkGenerationSummary> {
  const context = await buildRichContext();
  const planned = await planTopics(context, opts.maxArticles);

  let candidates = planned;

  if (opts.onlyMissing) {
    const existing = await db
      .select({
        title: supportArticlesTable.title,
        slug: supportArticlesTable.slug,
      })
      .from(supportArticlesTable);
    const existingSlugs = new Set(existing.map((e) => slugify(e.title)));
    candidates = planned.filter((p) => !existingSlugs.has(slugify(p.title)));
  }

  let skipped = planned.length - candidates.length;
  let failed = 0;
  const created: BulkGenerationSummary["articles"] = [];

  const drafts = await runWithConcurrency(
    candidates,
    Math.max(1, opts.concurrency),
    async (topic) => {
      const draft = await draftArticle(context, topic);
      return { topic, draft };
    },
  );

  for (const { topic, draft } of drafts) {
    if (!draft) {
      failed += 1;
      continue;
    }
    try {
      const slug = await uniqueSlug(draft.title);
      const [row] = await db
        .insert(supportArticlesTable)
        .values({
          title: draft.title,
          body: draft.body,
          kind: topic.kind,
          category: topic.category,
          published: false,
          aiGenerated: true,
          slug,
        })
        .returning();
      if (row) {
        created.push({
          id: row.id,
          title: row.title,
          category: row.category,
          kind: row.kind,
          slug: row.slug,
        });
      }
    } catch {
      failed += 1;
    }
  }

  const categories = Array.from(new Set(created.map((a) => a.category ?? "General")));

  return {
    planned: planned.length,
    created: created.length,
    skipped,
    failed,
    categories,
    articles: created,
  };
}
