import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, CheckCircle2, Circle, Trash2, Plus } from "lucide-react";
import {
  useGetProject,
  useAddProjectUpdate,
  useUpdateProject,
  useAddProjectMilestone,
  useUpdateProjectMilestone,
  useDeleteProjectMilestone,
  useGetMe,
  getGetProjectQueryKey,
} from "@workspace/api-client-react";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, initials, isStaff, statusLabel } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

const STATUSES = [
  "discovery",
  "in_progress",
  "review",
  "delivered",
  "on_hold",
] as const;

type ProjectStatus = (typeof STATUSES)[number];

function AdminEditPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data } = useGetProject(projectId);
  const update = useUpdateProject();
  const addMs = useAddProjectMilestone();
  const updateMs = useUpdateProjectMilestone();
  const delMs = useDeleteProjectMilestone();

  const [status, setStatus] = useState<ProjectStatus>("discovery");
  const [progress, setProgress] = useState(0);
  const [nextMs, setNextMs] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [newMsTitle, setNewMsTitle] = useState("");
  const [newMsDate, setNewMsDate] = useState("");

  useEffect(() => {
    if (!data) return;
    setStatus(data.status as ProjectStatus);
    setProgress(data.progressPct ?? 0);
    setNextMs(data.nextMilestone ?? "");
    setNextDate(
      data.nextMilestoneDate
        ? data.nextMilestoneDate.slice(0, 10)
        : "",
    );
  }, [data]);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        projectId,
        data: {
          status,
          progressPct: progress,
          nextMilestone: nextMs.trim() || null,
          nextMilestoneDate: nextDate
            ? new Date(nextDate).toISOString()
            : null,
        },
      });
      await invalidate();
      toast({ title: "Project updated" });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const handleAddMilestone = async () => {
    if (!newMsTitle.trim()) return;
    await addMs.mutateAsync({
      projectId,
      data: {
        title: newMsTitle.trim(),
        dueDate: newMsDate ? new Date(newMsDate).toISOString() : null,
      },
    });
    setNewMsTitle("");
    setNewMsDate("");
    await invalidate();
  };

  const handleToggleMs = async (id: string, current: "pending" | "done") => {
    await updateMs.mutateAsync({
      milestoneId: id,
      data: { status: current === "done" ? "pending" : "done" },
    });
    await invalidate();
  };

  const handleDeleteMs = async (id: string) => {
    await delMs.mutateAsync({ milestoneId: id });
    await invalidate();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Admin tools
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">
            Status
          </label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as ProjectStatus)}
          >
            <SelectTrigger data-testid="project-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">
            Progress (%)
          </label>
          <Input
            type="number"
            min={0}
            max={100}
            value={progress}
            onChange={(e) =>
              setProgress(
                Math.max(0, Math.min(100, Number(e.target.value) || 0)),
              )
            }
            data-testid="project-progress"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">
            Next milestone
          </label>
          <Input
            value={nextMs}
            onChange={(e) => setNextMs(e.target.value)}
            placeholder="What's coming up next?"
            data-testid="project-next-milestone"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">
            Next milestone date
          </label>
          <Input
            type="date"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
            data-testid="project-next-milestone-date"
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={handleSave}
            disabled={update.isPending}
            data-testid="save-project"
            className="w-full bg-foreground text-background hover:bg-foreground/90"
          >
            {update.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <div className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Milestones
        </div>
        <div className="space-y-2">
          {(data?.milestones ?? []).map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
            >
              <button
                onClick={() => handleToggleMs(m.id, m.status)}
                className="text-foreground"
                data-testid={`toggle-ms-${m.id}`}
              >
                {m.status === "done" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/60" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{m.title}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(m.dueDate)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteMs(m.id)}
                data-testid={`delete-ms-${m.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={newMsTitle}
            onChange={(e) => setNewMsTitle(e.target.value)}
            placeholder="Add milestone title…"
            data-testid="new-milestone-title"
          />
          <Input
            type="date"
            value={newMsDate}
            onChange={(e) => setNewMsDate(e.target.value)}
            className="sm:w-48"
            data-testid="new-milestone-date"
          />
          <Button
            onClick={handleAddMilestone}
            disabled={!newMsTitle.trim() || addMs.isPending}
            data-testid="add-milestone"
            variant="outline"
          >
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage({
  projectId,
}: {
  projectId: string;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useGetProject(projectId);
  const { data: me } = useGetMe();
  const canEdit = isStaff(me?.user.role);
  const [body, setBody] = useState("");
  const add = useAddProjectUpdate({
    mutation: {
      onSuccess: () => {
        setBody("");
        qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      },
    },
  });

  return (
    <AppShell>
      <div className="border-b border-border px-10 pt-8">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          All projects
        </Link>
        <div className="mt-4 flex flex-col gap-4 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl text-foreground sm:text-5xl">
              {isLoading ? <Skeleton className="h-12 w-72" /> : data?.title}
            </h1>
            {data?.description && (
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                {data.description}
              </p>
            )}
          </div>
          {data && (
            <Badge
              variant="outline"
              className="border-foreground/20 text-foreground"
            >
              {statusLabel(data.status)}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 px-10 py-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 flex justify-between text-xs uppercase tracking-widest text-muted-foreground">
              <span>Overall progress</span>
              <span>{data?.progressPct ?? 0}%</span>
            </div>
            <Progress value={data?.progressPct ?? 0} className="h-1.5" />
          </div>

          {canEdit && <AdminEditPanel projectId={projectId} />}

          <section>
            <h2 className="mb-4 font-display text-2xl">Updates</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (body.trim()) {
                  add.mutate({ projectId, data: { body: body.trim() } });
                }
              }}
              className="mb-6 rounded-2xl border border-border bg-card p-4"
            >
              <Textarea
                data-testid="update-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Post a quick update or reply to the team…"
                className="min-h-[100px] border-0 focus-visible:ring-0"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={!body.trim() || add.isPending}
                  data-testid="post-update"
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  Post update
                </Button>
              </div>
            </form>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
              </div>
            ) : data?.updates.length ? (
              <div className="space-y-4">
                {data.updates.map((u) => (
                  <div
                    key={u.id}
                    className="flex gap-3 rounded-2xl border border-border bg-card p-4"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-foreground text-background text-xs">
                        {initials(u.authorName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-sm font-medium">
                          {u.authorName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(u.createdAt)}
                        </div>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                        {u.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
                No updates yet — be the first to post one.
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Next milestone
            </div>
            <div className="mt-2 font-display text-xl">
              {data?.nextMilestone || "—"}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {formatDate(data?.nextMilestoneDate)}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-6 py-4 text-xs uppercase tracking-widest text-muted-foreground">
              Milestones
            </div>
            <ul>
              {(data?.milestones ?? []).map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 border-b border-border px-6 py-4 last:border-0"
                >
                  {m.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-foreground" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/60" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{m.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(m.dueDate)}
                    </div>
                  </div>
                </li>
              ))}
              {(!data?.milestones || data.milestones.length === 0) && (
                <li className="px-6 py-6 text-sm text-muted-foreground">
                  No milestones yet.
                </li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
