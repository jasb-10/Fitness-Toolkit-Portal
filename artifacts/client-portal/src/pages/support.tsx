import { useMemo, useState } from "react";
import { useListSupportArticles } from "@workspace/api-client-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, MessageCircle, Search, Sparkles } from "lucide-react";

const UNCATEGORIZED = "General";

export default function SupportPage() {
  const { data, isLoading } = useListSupportArticles();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter(
      (a) =>
        a.title.toLowerCase().includes(term) ||
        a.body.toLowerCase().includes(term) ||
        (a.category ?? "").toLowerCase().includes(term),
    );
  }, [data, q]);

  const articles = filtered.filter((a) => a.kind === "article");
  const faqs = filtered.filter((a) => a.kind === "faq");

  const articlesBySection = useMemo(() => {
    const byCat: Record<string, typeof articles> = {};
    for (const a of articles) {
      const key = a.category?.trim() || UNCATEGORIZED;
      (byCat[key] ??= []).push(a);
    }
    return Object.entries(byCat).sort(([a], [b]) => a.localeCompare(b));
  }, [articles]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Support"
        title="Get unstuck, quickly."
        description="Practical answers for the moments that slow your business down. Search the library or open a conversation when you need a human thread."
      />
      <div className="space-y-8 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
        <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
          <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search articles and FAQs" value={q} onChange={(e) => setQ(e.target.value)} className="h-12 rounded-xl border-border bg-card pl-11" data-testid="kb-search" /></div>
          <button type="button" onClick={() => window.dispatchEvent(new Event("open-support-widget"))} data-testid="button-open-support-chat" className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-left hover:border-primary/45 hover:bg-primary/10"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></div><div><div className="text-sm font-semibold">Ask the support assistant</div><div className="text-xs text-muted-foreground">Open the chat bubble to start</div></div></button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted-foreground">
              <MessageCircle className="h-6 w-6" />
              <div>
                Nothing matches your search. Open the chat bubble in the corner
                and ask the assistant directly.
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-12">
            {articlesBySection.map(([section, items]) => (
              <Section key={section} title={section}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {items.map((a) => (
                    <ArticleCard key={a.id} article={a} />
                  ))}
                </div>
              </Section>
            ))}

            {faqs.length > 0 && (
              <Section title="Frequently asked">
                <div className="space-y-2">
                  {faqs.map((a) => (
                    <FaqRow key={a.id} faq={a} />
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ArticleCard({
  article,
}: {
  article: { id: string; title: string; body: string; category?: string | null };
}) {
  const [open, setOpen] = useState(false);
  return (
      <Card className="overflow-hidden border-border bg-card transition-colors hover:border-primary/35">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/40"
        data-testid={`article-${article.id}`}
      >
        <div className="min-w-0">
          <div className="truncate font-semibold">{article.title}</div>
          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {article.body.slice(0, 140)}
          </div>
        </div>
        <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="border-t border-border px-5 py-4 text-sm">
          <div className="whitespace-pre-wrap">{article.body}</div>
        </div>
      )}
    </Card>
  );
}

function FaqRow({
  faq,
}: {
  faq: { id: string; title: string; body: string };
}) {
  const [open, setOpen] = useState(false);
  return (
      <Card className="overflow-hidden border-border bg-card transition-colors hover:border-primary/35">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/40"
        data-testid={`faq-${faq.id}`}
      >
        <div className="font-semibold">{faq.title}</div>
      </button>
      {open && (
        <div className="border-t border-border px-5 py-4 text-sm">
          <div className="whitespace-pre-wrap">{faq.body}</div>
        </div>
      )}
    </Card>
  );
}
