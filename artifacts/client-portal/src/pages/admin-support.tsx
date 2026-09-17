import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminListSupportArticles,
  useAdminCreateSupportArticle,
  useAdminUpdateSupportArticle,
  useAdminDeleteSupportArticle,
  useAdminGenerateSupportArticle,
  useAdminListKbSources,
  useAdminCreateKbSource,
  useAdminDeleteKbSource,
  useAdminListRefundRequests,
  useAdminUpdateRefundRequest,
  useAdminGetSupportSettings,
  useAdminUpdateSupportSettings,
  useAdminGetStripeStatus,
  useAdminGetResendStatus,
  useAdminGetCompany,
  useAdminUpdateCompany,
  getAdminGetCompanyQueryKey,
  getAdminListSupportArticlesQueryKey,
  getAdminListKbSourcesQueryKey,
  getAdminListRefundRequestsQueryKey,
  getAdminGetSupportSettingsQueryKey,
} from "@workspace/api-client-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { basePath } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Trash2,
  Sparkles,
  Plus,
  Globe,
  FileText,
  Pencil,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type ArticleKind = "article" | "faq";

function ArticlesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useAdminListSupportArticles();
  const create = useAdminCreateSupportArticle();
  const update = useAdminUpdateSupportArticle();
  const del = useAdminDeleteSupportArticle();
  const generate = useAdminGenerateSupportArticle();

  const [editing, setEditing] = useState<null | {
    id?: string;
    title: string;
    body: string;
    kind: ArticleKind;
    category: string;
    published: boolean;
  }>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMax, setBulkMax] = useState(20);
  const [bulkOnlyMissing, setBulkOnlyMissing] = useState(true);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
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
  } | null>(null);
  const [aiKind, setAiKind] = useState<ArticleKind>("article");

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getAdminListSupportArticlesQueryKey() });

  const handleSave = async () => {
    if (!editing) return;
    try {
      if (editing.id) {
        await update.mutateAsync({
          articleId: editing.id,
          data: {
            title: editing.title,
            body: editing.body,
            kind: editing.kind,
            category: editing.category || null,
            published: editing.published,
          },
        });
      } else {
        await create.mutateAsync({
          data: {
            title: editing.title,
            body: editing.body,
            kind: editing.kind,
            category: editing.category || null,
            published: editing.published,
          },
        });
      }
      setEditing(null);
      await invalidate();
      toast({ title: "Saved" });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    }
  };

  const handleGenerate = async () => {
    if (!aiTopic.trim()) return;
    try {
      const res = await generate.mutateAsync({
        data: { topic: aiTopic.trim(), kind: aiKind },
      });
      setAiOpen(false);
      setAiTopic("");
      await invalidate();
      setEditing({
        id: res.id,
        title: res.title,
        body: res.body,
        kind: res.kind,
        category: res.category ?? "",
        published: res.published,
      });
      toast({ title: "Draft generated" });
    } catch (e) {
      toast({
        title: "Generation failed",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    await del.mutateAsync({ articleId: id });
    await invalidate();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() =>
            setEditing({
              title: "",
              body: "",
              kind: "article",
              category: "",
              published: true,
            })
          }
          data-testid="new-article"
        >
          <Plus className="mr-1 h-4 w-4" /> New article
        </Button>
        <Button
          variant="outline"
          onClick={() => setAiOpen(true)}
          data-testid="ai-generate"
        >
          <Sparkles className="mr-1 h-4 w-4" /> AI draft
        </Button>
        <Button
          variant="outline"
          onClick={() => setBulkOpen(true)}
          data-testid="bulk-generate"
        >
          <Sparkles className="mr-1 h-4 w-4" /> Bulk generate articles with AI
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32" />
      ) : data && data.length > 0 ? (
        <div className="space-y-2">
          {data.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{a.title}</span>
                    <Badge variant="outline" className="capitalize">
                      {a.kind}
                    </Badge>
                    {a.aiGenerated && (
                      <Badge variant="secondary">
                        <Sparkles className="mr-1 h-3 w-3" /> AI
                      </Badge>
                    )}
                    {!a.published && (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.category || "Uncategorized"} · {formatDate(a.updatedAt)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setEditing({
                      id: a.id,
                      title: a.title,
                      body: a.body,
                      kind: a.kind,
                      category: a.category ?? "",
                      published: a.published,
                    })
                  }
                  data-testid={`edit-article-${a.id}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(a.id)}
                  data-testid={`delete-article-${a.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No articles yet. Add one or use AI to draft.
          </CardContent>
        </Card>
      )}

      <Dialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit article" : "New article"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Input
                placeholder="Title"
                value={editing.title}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={editing.kind}
                  onValueChange={(v) =>
                    setEditing({ ...editing, kind: v as ArticleKind })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="faq">FAQ</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Category"
                  value={editing.category}
                  onChange={(e) =>
                    setEditing({ ...editing, category: e.target.value })
                  }
                />
              </div>
              <Textarea
                rows={12}
                placeholder="Body (markdown supported)"
                value={editing.body}
                onChange={(e) =>
                  setEditing({ ...editing, body: e.target.value })
                }
              />
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.published}
                  onCheckedChange={(v) =>
                    setEditing({ ...editing, published: v })
                  }
                />
                <span className="text-sm">Published</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !editing?.title.trim() ||
                !editing?.body.trim() ||
                create.isPending ||
                update.isPending
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate with AI</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              We&apos;ll use your master class outline and knowledge base sources
              to draft a {aiKind}. You can edit before publishing.
            </p>
            <Select
              value={aiKind}
              onValueChange={(v) => setAiKind(v as ArticleKind)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="faq">FAQ</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              rows={3}
              placeholder="Topic or question (e.g. 'How do refunds work?')"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAiOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!aiTopic.trim() || generate.isPending}
              data-testid="ai-generate-submit"
            >
              {generate.isPending ? "Generating…" : "Generate draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkOpen}
        onOpenChange={(o) => {
          if (!bulkRunning) setBulkOpen(o);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk generate articles with AI</DialogTitle>
          </DialogHeader>
          {bulkResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2 rounded-md border border-border p-3 text-center">
                <Stat label="Planned" value={bulkResult.planned} />
                <Stat label="Created" value={bulkResult.created} />
                <Stat label="Skipped" value={bulkResult.skipped} />
                <Stat label="Failed" value={bulkResult.failed} />
              </div>
              {bulkResult.categories.length > 0 && (
                <div>
                  <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">
                    Categories
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {bulkResult.categories.map((c) => (
                      <Badge key={c} variant="outline">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {bulkResult.articles.length > 0 && (
                <div className="max-h-72 overflow-y-auto rounded-md border border-border">
                  <ul className="divide-y divide-border text-sm">
                    {bulkResult.articles.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 p-2">
                        <Badge
                          variant="outline"
                          className="capitalize text-[10px]"
                        >
                          {a.kind}
                        </Badge>
                        <span className="truncate">{a.title}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {a.category ?? "General"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                All new articles are saved as drafts so you can review and edit
                them before publishing.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We&apos;ll analyse your master class curriculum, lesson notes,
                and every knowledge base source — then draft a full library of
                help articles and FAQs for you, grouped by category.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Number of articles to draft
                  </label>
                  <Input
                    type="number"
                    min={5}
                    max={40}
                    value={bulkMax}
                    onChange={(e) =>
                      setBulkMax(
                        Math.max(
                          5,
                          Math.min(40, Number(e.target.value) || 20),
                        ),
                      )
                    }
                    data-testid="bulk-max"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={bulkOnlyMissing}
                      onChange={(e) => setBulkOnlyMissing(e.target.checked)}
                      data-testid="bulk-only-missing"
                    />
                    Skip topics already covered by existing articles
                  </label>
                </div>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                This may take 30–90 seconds. Please keep this dialog open
                until generation finishes.
              </div>
            </div>
          )}
          <DialogFooter>
            {bulkResult ? (
              <Button
                onClick={() => {
                  setBulkResult(null);
                  setBulkOpen(false);
                }}
              >
                Done
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setBulkOpen(false)}
                  disabled={bulkRunning}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setBulkRunning(true);
                    try {
                      const res = await fetch(
                        `${basePath}/api/admin/support/articles/bulk-generate`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            maxArticles: bulkMax,
                            onlyMissing: bulkOnlyMissing,
                          }),
                        },
                      );
                      if (!res.ok) {
                        const errBody = await res.json().catch(() => ({}));
                        throw new Error(
                          (errBody as { error?: string }).error ??
                            `HTTP ${res.status}`,
                        );
                      }
                      const summary = await res.json();
                      setBulkResult(summary);
                      await invalidate();
                      toast({
                        title: "Bulk generation complete",
                        description: `${summary.created} new article${summary.created === 1 ? "" : "s"} added as drafts.`,
                      });
                    } catch (e) {
                      toast({
                        title: "Bulk generation failed",
                        description: e instanceof Error ? e.message : "",
                        variant: "destructive",
                      });
                    } finally {
                      setBulkRunning(false);
                    }
                  }}
                  disabled={bulkRunning}
                  data-testid="bulk-generate-submit"
                >
                  {bulkRunning ? "Generating…" : "Start generation"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-display text-2xl">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function KbTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useAdminListKbSources();
  const create = useAdminCreateKbSource();
  const del = useAdminDeleteKbSource();

  const [kind, setKind] = useState<"url" | "manual">("url");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getAdminListKbSourcesQueryKey() });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({
        data: {
          kind,
          title: title.trim(),
          url: kind === "url" ? url.trim() : null,
          content: kind === "manual" ? content.trim() : null,
        },
      });
      setTitle("");
      setUrl("");
      setContent("");
      await invalidate();
      toast({ title: "Source added" });
    } catch (e) {
      toast({
        title: "Add failed",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="font-display text-xl">Add knowledge source</div>
          <p className="text-xs text-muted-foreground">
            Sources train the support assistant and seed AI-drafted articles.
            URLs are fetched and stripped of HTML.
          </p>
          <form onSubmit={handleAdd} className="space-y-3">
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as "url" | "manual")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="url">Web URL</SelectItem>
                <SelectItem value="manual">Manual text</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              data-testid="kb-title"
            />
            {kind === "url" ? (
              <Input
                type="url"
                placeholder="https://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                data-testid="kb-url"
              />
            ) : (
              <Textarea
                rows={6}
                placeholder="Paste your source text here…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                data-testid="kb-content"
              />
            )}
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Adding…" : "Add source"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="font-display text-xl">Sources</div>
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : data && data.length > 0 ? (
            <div className="space-y-2">
              {data.map((s) => (
                <div
                  key={s.id}
                  className="flex items-start gap-3 rounded-md border border-border px-4 py-3 text-sm"
                >
                  {s.kind === "url" ? (
                    <Globe className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  ) : (
                    <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{s.title}</div>
                    {s.url && (
                      <div className="truncate text-xs text-muted-foreground">
                        {s.url}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {formatDate(s.createdAt)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await del.mutateAsync({ sourceId: s.id });
                      await invalidate();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No sources yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RefundsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useAdminListRefundRequests();
  const { data: stripeStatus } = useAdminGetStripeStatus();
  const update = useAdminUpdateRefundRequest();

  const submit = async (
    id: string,
    body: {
      status: "approved" | "denied" | "processed";
      decisionNote?: string | null;
      stripeChargeId?: string | null;
      executeStripeRefund?: boolean;
    },
  ) => {
    try {
      const result = await update.mutateAsync({ refundId: id, data: body });
      await qc.invalidateQueries({
        queryKey: getAdminListRefundRequestsQueryKey(),
      });
      if (result.status === "failed") {
        toast({
          title: "Stripe refund failed",
          description: result.decisionNote ?? "See decision note.",
          variant: "destructive",
        });
      } else if (result.stripeRefundId) {
        toast({
          title: "Refund issued",
          description: `Stripe refund ${result.stripeRefundId}`,
        });
      } else {
        toast({ title: `Marked ${result.status}` });
      }
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <Skeleton className="h-32" />;
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No refund requests yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((r) => (
        <Card key={r.id}>
          <CardContent className="space-y-2 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {r.userName || r.userEmail || r.userId}
                  {r.amount && (
                    <Badge variant="outline">${r.amount}</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(r.createdAt)}
                </div>
              </div>
              <Badge
                variant={
                  r.status === "approved" || r.status === "processed"
                    ? "default"
                    : r.status === "denied" || r.status === "failed"
                      ? "destructive"
                      : "secondary"
                }
              >
                {r.status}
              </Badge>
            </div>
            <p className="whitespace-pre-wrap text-sm text-foreground/90">
              {r.reason}
            </p>
            {(r.stripeChargeId || r.stripeRefundId) && (
              <div className="flex flex-wrap gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                {r.stripeChargeId && <span>charge: {r.stripeChargeId}</span>}
                {r.stripeRefundId && <span>refund: {r.stripeRefundId}</span>}
              </div>
            )}
            {r.decisionNote && (
              <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
                Decision: {r.decisionNote}
              </p>
            )}
            {(r.status === "pending" || r.status === "approved") && (
              <RefundActions
                stripeConfigured={!!stripeStatus?.configured}
                initialChargeId={r.stripeChargeId ?? ""}
                onSubmit={(body) => submit(r.id, body)}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RefundActions({
  stripeConfigured,
  initialChargeId,
  onSubmit,
}: {
  stripeConfigured: boolean;
  initialChargeId: string;
  onSubmit: (body: {
    status: "approved" | "denied" | "processed";
    decisionNote?: string | null;
    stripeChargeId?: string | null;
    executeStripeRefund?: boolean;
  }) => void;
}) {
  const [note, setNote] = useState("");
  const [chargeId, setChargeId] = useState(initialChargeId);
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <Input
        placeholder="Stripe charge ID (e.g. ch_... or py_...)"
        value={chargeId}
        onChange={(e) => setChargeId(e.target.value)}
        data-testid="refund-charge-id"
      />
      <Input
        placeholder="Optional note for the customer"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() =>
            onSubmit({
              status: "processed",
              decisionNote: note || null,
              stripeChargeId: chargeId.trim() || null,
              executeStripeRefund: true,
            })
          }
          disabled={!stripeConfigured || !chargeId.trim()}
          title={
            !stripeConfigured
              ? "Add STRIPE_SECRET_KEY to enable"
              : !chargeId.trim()
                ? "Enter a Stripe charge ID"
                : undefined
          }
        >
          Refund via Stripe
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onSubmit({
              status: "approved",
              decisionNote: note || null,
              stripeChargeId: chargeId.trim() || null,
            })
          }
        >
          Approve only
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onSubmit({
              status: "processed",
              decisionNote: note || null,
              stripeChargeId: chargeId.trim() || null,
            })
          }
        >
          Mark processed
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() =>
            onSubmit({ status: "denied", decisionNote: note || null })
          }
        >
          Deny
        </Button>
      </div>
    </div>
  );
}

function StripeStatusCard() {
  const { data, isLoading, refetch, isFetching } = useAdminGetStripeStatus();
  return (
    <Card>
      <CardContent className="space-y-3 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Stripe</div>
            <p className="text-xs text-muted-foreground">
              Set <code>STRIPE_SECRET_KEY</code> in this project's secrets to
              enable real refund execution from the queue.
            </p>
          </div>
          <Badge variant={data?.configured ? "default" : "secondary"}>
            {isLoading
              ? "checking"
              : data?.configured
                ? data.error
                  ? "key invalid"
                  : "connected"
                : "not configured"}
          </Badge>
        </div>
        {data?.configured && data.accountEmail && (
          <p className="text-xs text-muted-foreground">
            Account: {data.accountEmail}
            {data.livemode === false ? " (test mode)" : ""}
          </p>
        )}
        {data?.error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
            {data.error}
          </p>
        )}
        <div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? "Checking…" : "Re-check"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ResendStatusCard() {
  const { data, isLoading, refetch, isFetching } = useAdminGetResendStatus();
  return (
    <Card>
      <CardContent className="space-y-3 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Resend (transactional email)</div>
            <p className="text-xs text-muted-foreground">
              Sends welcome emails for new accounts and refund decision
              notices. Connect Resend from the Replit integrations panel.
              Clerk-driven emails (password reset, magic links) are configured
              separately in the Clerk dashboard.
            </p>
          </div>
          <Badge variant={data?.configured ? "default" : "secondary"}>
            {isLoading
              ? "checking"
              : data?.configured
                ? data.error
                  ? "key invalid"
                  : "connected"
                : "not connected"}
          </Badge>
        </div>
        {data?.configured && data.fromEmail && (
          <p className="text-xs text-muted-foreground">
            Sending from: {data.fromEmail}
          </p>
        )}
        {data?.configured && !data.fromEmail && (
          <p className="rounded-md border border-amber-500/30 bg-amber-50 p-2 text-xs text-amber-900">
            No verified sender configured. Add a verified domain or sender in
            the Resend dashboard, then update the connection.
          </p>
        )}
        {data?.error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
            {data.error}
          </p>
        )}
        <div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? "Checking…" : "Re-check"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useAdminGetSupportSettings();
  const update = useAdminUpdateSupportSettings();

  const [refundPolicy, setRefundPolicy] = useState("");
  const [autoApprove, setAutoApprove] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [windowDays, setWindowDays] = useState("");

  useEffect(() => {
    if (!data) return;
    setRefundPolicy(data.refundPolicy);
    setAutoApprove(
      data.autoApproveUnderAmount === null
        ? ""
        : String(data.autoApproveUnderAmount),
    );
    setSystemPrompt(data.supportSystemPrompt);
    setWindowDays(data.refundDaysWindow ? String(data.refundDaysWindow) : "");
  }, [data]);

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        data: {
          refundPolicy,
          autoApproveUnderAmount: autoApprove.trim()
            ? Number(autoApprove)
            : null,
          supportSystemPrompt: systemPrompt,
          refundDaysWindow: windowDays.trim() ? Number(windowDays) : null,
        },
      });
      await qc.invalidateQueries({
        queryKey: getAdminGetSupportSettingsQueryKey(),
      });
      toast({ title: "Settings saved" });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <StripeStatusCard />
      <ResendStatusCard />
      <CompanyBrandingCard />
      <Card>
        <CardContent className="space-y-4 p-6">
        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">
            Support assistant system prompt
          </label>
          <Textarea
            rows={5}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            data-testid="system-prompt"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">
            Refund policy (shown to assistant + students)
          </label>
          <Textarea
            rows={5}
            value={refundPolicy}
            onChange={(e) => setRefundPolicy(e.target.value)}
            data-testid="refund-policy"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Refund window (days)
            </label>
            <Input
              type="number"
              min={0}
              value={windowDays}
              onChange={(e) => setWindowDays(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Auto-approve under ($)
            </label>
            <Input
              type="number"
              min={0}
              value={autoApprove}
              onChange={(e) => setAutoApprove(e.target.value)}
              placeholder="Leave blank to disable"
            />
          </div>
        </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminSupportPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Admin"
        title="Support"
        description="Manage the help center, AI knowledge sources, refund requests, and assistant settings."
      />
      <div className="px-10 py-10">
        <Tabs defaultValue="articles" className="space-y-6">
          <TabsList>
            <TabsTrigger value="articles">Articles & FAQ</TabsTrigger>
            <TabsTrigger value="kb">Knowledge base</TabsTrigger>
            <TabsTrigger value="refunds">Refund queue</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="articles">
            <ArticlesTab />
          </TabsContent>
          <TabsContent value="kb">
            <KbTab />
          </TabsContent>
          <TabsContent value="refunds">
            <RefundsTab />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function CompanyBrandingCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useAdminGetCompany();
  const update = useAdminUpdateCompany({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getAdminGetCompanyQueryKey() });
        toast({ title: "Company settings saved" });
      },
      onError: (e: unknown) =>
        toast({
          title: "Save failed",
          description: e instanceof Error ? e.message : "",
          variant: "destructive",
        }),
    },
  });

  const [form, setForm] = useState({
    name: "",
    legalName: "",
    supportEmail: "",
    website: "",
    taxId: "",
    logoUrl: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
    invoiceFooter: "",
  });

  useEffect(() => {
    if (data?.settings) {
      const s = data.settings;
      setForm({
        name: s.name ?? "",
        legalName: s.legalName ?? "",
        supportEmail: s.supportEmail ?? "",
        website: s.website ?? "",
        taxId: s.taxId ?? "",
        logoUrl: s.logoUrl ?? "",
        addressLine1: s.addressLine1 ?? "",
        addressLine2: s.addressLine2 ?? "",
        city: s.city ?? "",
        region: s.region ?? "",
        postalCode: s.postalCode ?? "",
        country: s.country ?? "",
        invoiceFooter: s.invoiceFooter ?? "",
      });
    }
  }, [data]);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <div className="text-sm font-medium">Company branding</div>
          <p className="text-xs text-muted-foreground">
            Used on invoices, the support assistant signature, and refund
            notifications.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate({ data: form });
          }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <Labeled label="Company name">
            <Input
              data-testid="company-name"
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              required
            />
          </Labeled>
          <Labeled label="Legal name (optional)">
            <Input
              value={form.legalName}
              onChange={(e) => set("legalName")(e.target.value)}
            />
          </Labeled>
          <Labeled label="Support email">
            <Input
              type="email"
              value={form.supportEmail}
              onChange={(e) => set("supportEmail")(e.target.value)}
            />
          </Labeled>
          <Labeled label="Website">
            <Input
              value={form.website}
              onChange={(e) => set("website")(e.target.value)}
            />
          </Labeled>
          <Labeled label="Tax ID">
            <Input
              value={form.taxId}
              onChange={(e) => set("taxId")(e.target.value)}
            />
          </Labeled>
          <Labeled label="Logo URL">
            <Input
              value={form.logoUrl}
              onChange={(e) => set("logoUrl")(e.target.value)}
            />
          </Labeled>
          <Labeled label="Address line 1" full>
            <Input
              value={form.addressLine1}
              onChange={(e) => set("addressLine1")(e.target.value)}
            />
          </Labeled>
          <Labeled label="Address line 2" full>
            <Input
              value={form.addressLine2}
              onChange={(e) => set("addressLine2")(e.target.value)}
            />
          </Labeled>
          <Labeled label="City">
            <Input
              value={form.city}
              onChange={(e) => set("city")(e.target.value)}
            />
          </Labeled>
          <Labeled label="State / Region">
            <Input
              value={form.region}
              onChange={(e) => set("region")(e.target.value)}
            />
          </Labeled>
          <Labeled label="Postal code">
            <Input
              value={form.postalCode}
              onChange={(e) => set("postalCode")(e.target.value)}
            />
          </Labeled>
          <Labeled label="Country">
            <Input
              value={form.country}
              onChange={(e) => set("country")(e.target.value)}
            />
          </Labeled>
          <Labeled label="Invoice footer" full>
            <Textarea
              rows={2}
              value={form.invoiceFooter}
              onChange={(e) => set("invoiceFooter")(e.target.value)}
            />
          </Labeled>
          <div className="sm:col-span-2 flex justify-end">
            <Button
              type="submit"
              data-testid="save-company"
              disabled={update.isPending}
            >
              {update.isPending ? "Saving…" : "Save company settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Labeled({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2 space-y-1" : "space-y-1"}>
      <label className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
