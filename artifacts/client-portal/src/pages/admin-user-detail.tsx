import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, KeyRound } from "lucide-react";
import {
  useAdminGetUser,
  useAdminUpdateUser,
  useAdminResetPassword,
  useAdminSetUserAccess,
  useAdminGetUserActivity,
  useGetMe,
  getAdminGetUserQueryKey,
  getAdminListUsersQueryKey,
  type Role,
  type ActivitySummary,
  type ActivityEntry,
} from "@workspace/api-client-react";
import { AdminShell } from "@/components/AdminShell";
import { StaffOnly } from "@/components/RoleGate";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatDate, initials, isAdmin } from "@/lib/utils";

export default function AdminUserDetailPage({ userId }: { userId: string }) {
  return (
    <StaffOnly>
      <Inner userId={userId} />
    </StaffOnly>
  );
}

function Inner({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const canEdit = isAdmin(me?.user.role);
  const isSuper = me?.user.role === "super_admin";

  const { data, isLoading } = useAdminGetUser(userId);

  const update = useAdminUpdateUser({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getAdminGetUserQueryKey(userId) });
        qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
        toast({ title: "User updated" });
      },
    },
  });
  const reset = useAdminResetPassword({
    mutation: {
      onSuccess: (r) => {
        toast({
          title: r.message || "Reset link generated",
          description: r.resetUrl
            ? "Copy the link from the dialog to share with the user."
            : undefined,
        });
        setResetUrl(r.resetUrl);
      },
    },
  });
  const setAccess = useAdminSetUserAccess({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getAdminGetUserQueryKey(userId) });
        toast({ title: "Course access updated" });
      },
    },
  });

  const [editOpen, setEditOpen] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [accessIds, setAccessIds] = useState<Set<string>>(new Set());
  const [role, setRole] = useState<Role>("student");

  useEffect(() => {
    if (data?.user) {
      setEditName(data.user.name);
      setEditEmail(data.user.email);
      setRole(data.user.role);
      setAccessIds(
        new Set(
          data.courseAccess.filter((a) => a.hasAccess).map((a) => a.courseId),
        ),
      );
    }
  }, [data]);

  if (isLoading || !data) {
    return (
      <AdminShell>
        <div className="px-10 py-10">
          <Skeleton className="h-32 w-full" />
        </div>
      </AdminShell>
    );
  }

  const u = data.user;

  return (
    <AdminShell>
      <div className="border-b border-border px-10 pt-8">
        <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-3.5 w-3.5" />
            All users
        </Link>
        <div className="mt-4 flex flex-col gap-6 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-5">
            <Avatar className="h-20 w-20">
              <AvatarImage src={u.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-foreground text-background text-lg">
                {initials(u.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <Badge variant="outline" className="mb-2 capitalize">
                {u.role.replace("_", " ")}
              </Badge>
              <h1 className="font-display text-4xl text-foreground sm:text-5xl">
                {u.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{u.email}</p>
            </div>
          </div>
          {canEdit && (
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  data-testid="edit-profile-btn"
                >
                  Edit profile
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit user</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      data-testid="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      data-testid="edit-email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setEditOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    data-testid="save-edit"
                    onClick={() => {
                      update.mutate(
                        {
                          userId,
                          data: { name: editName, email: editEmail },
                        },
                        { onSuccess: () => setEditOpen(false) },
                      );
                    }}
                    className="bg-foreground text-background hover:bg-foreground/90"
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="px-10 py-10">
        <Tabs defaultValue="details">
          <TabsList className="mb-6">
            <TabsTrigger value="details" data-testid="tab-details">
              Details
            </TabsTrigger>
            <TabsTrigger value="enrollments" data-testid="tab-enrollments">
              Enrollments
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="font-display text-lg">User info</div>
                <dl className="mt-4 space-y-3 text-sm">
                  <Row label="Email" value={u.email} />
                  <Row label="Joined" value={formatDate(u.createdAt)} />
                  <Row label="Last login" value={formatDate(u.lastLoginAt)} />
                  <Row
                    label="Password"
                    value="••••••••"
                    action={
                      canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid="reset-password"
                          onClick={() =>
                            reset.mutate({ userId })
                          }
                          disabled={reset.isPending}
                        >
                          <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                          Reset
                        </Button>
                      )
                    }
                  />
                </dl>
                {resetUrl && (
                  <div className="mt-4 rounded-lg border border-border bg-muted/50 p-3 text-xs">
                    <div className="mb-1 font-medium">Sign-in link</div>
                    <div className="break-all text-muted-foreground">
                      {resetUrl}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="font-display text-lg">Role</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Roles control what areas of the portal a member can access.
                </p>
                {canEdit ? (
                  <div className="mt-4 flex items-center gap-3">
                    <Select
                      value={role}
                      onValueChange={(v) => setRole(v as Role)}
                    >
                      <SelectTrigger
                        data-testid="role-select"
                        className="w-44"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        {isSuper && (
                          <SelectItem value="super_admin">
                            Super Admin
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      data-testid="save-role"
                      disabled={role === u.role || update.isPending}
                      onClick={() =>
                        update.mutate({ userId, data: { role } })
                      }
                      className="bg-foreground text-background hover:bg-foreground/90"
                    >
                      Save role
                    </Button>
                  </div>
                ) : (
                  <Badge variant="outline" className="mt-4 capitalize">
                    {u.role.replace("_", " ")}
                  </Badge>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="font-display text-lg">Course access</div>
                  {canEdit && (
                    <Button
                      data-testid="save-access"
                      size="sm"
                      onClick={() =>
                        setAccess.mutate({
                          userId,
                          data: { courseIds: Array.from(accessIds) },
                        })
                      }
                      className="bg-foreground text-background hover:bg-foreground/90"
                    >
                      Save access
                    </Button>
                  )}
                </div>
                <div className="mt-4 divide-y divide-border">
                  {data.courseAccess.map((c) => {
                    const checked = accessIds.has(c.courseId);
                    return (
                      <div
                        key={c.courseId}
                        className="flex items-center gap-4 py-3"
                      >
                        <Checkbox
                          checked={checked}
                          disabled={!canEdit}
                          onCheckedChange={(v) => {
                            setAccessIds((prev) => {
                              const next = new Set(prev);
                              if (v) next.add(c.courseId);
                              else next.delete(c.courseId);
                              return next;
                            });
                          }}
                          data-testid={`access-${c.courseId}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">
                            {c.courseTitle}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {c.completedLessons}/{c.totalLessons} lessons
                          </div>
                        </div>
                        <div className="w-40">
                          <Progress
                            value={
                              c.totalLessons > 0
                                ? (c.completedLessons / c.totalLessons) * 100
                                : 0
                            }
                            className="h-1"
                          />
                        </div>
                      </div>
                    );
                  })}
                  {data.courseAccess.length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No courses on the platform yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="enrollments">
            <div className="rounded-2xl border border-border bg-card divide-y divide-border">
              {data.courseAccess
                .filter((c) => c.hasAccess)
                .map((c) => (
                  <div
                    key={c.courseId}
                    className="flex items-center gap-4 px-6 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{c.courseTitle}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.completedLessons}/{c.totalLessons} lessons
                      </div>
                    </div>
                    <div className="w-40">
                      <Progress
                        value={
                          c.totalLessons > 0
                            ? (c.completedLessons / c.totalLessons) * 100
                            : 0
                        }
                        className="h-1"
                      />
                    </div>
                  </div>
                ))}
              {data.courseAccess.filter((c) => c.hasAccess).length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  This user is not enrolled in any courses.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTab userId={userId} summary={data.activitySummary} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}

function Row({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <dt className="text-xs uppercase tracking-widest text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5 text-sm">{value}</dd>
      </div>
      {action}
    </div>
  );
}

const ACTION_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All actions" },
  { value: "viewed_page", label: "Page views" },
  { value: "lesson_view", label: "Lesson views" },
  { value: "lesson_complete", label: "Lessons completed" },
  { value: "downloaded_attachment", label: "Downloads" },
  { value: "opened_link", label: "Link opens" },
  { value: "completed_video", label: "Videos completed" },
  { value: "logged_in", label: "Logins" },
  { value: "requested_refund", label: "Refund requests" },
  { value: "opened_support_chat", label: "Support chats" },
];

const PAGE_SIZE = 25;

function formatActionLabel(action: string): string {
  return action.replace(/_/g, " ");
}

function ActivityTab({
  userId,
  summary,
}: {
  userId: string;
  summary?: ActivitySummary;
}) {
  const [action, setAction] = useState<string>("all");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(0);
  }, [action]);

  const { data, isFetching } = useAdminGetUserActivity(userId, {
    limit: PAGE_SIZE,
    offset,
    ...(action !== "all" ? { action } : {}),
  });

  const items: ActivityEntry[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {summary && <ActivitySummaryCard summary={summary} />}

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-medium">Activity log</div>
          <div className="flex items-center gap-2">
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger
                className="h-9 w-[200px]"
                data-testid="select-activity-filter"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isFetching && items.length === 0 ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No activity yet.
          </div>
        ) : (
          <ul>
            {items.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-4 border-b border-border px-6 py-4 last:border-0"
                data-testid={`activity-row-${a.id}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    <span className="capitalize">
                      {formatActionLabel(a.action)}
                    </span>{" "}
                    — <span className="text-muted-foreground">{a.target}</span>
                  </div>
                  {a.path && (
                    <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      {a.path}
                    </div>
                  )}
                </div>
                <div className="whitespace-nowrap text-xs uppercase tracking-widest text-muted-foreground">
                  {formatDate(a.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-border px-6 py-3 text-xs text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {total} events
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0 || isFetching}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                data-testid="btn-activity-prev"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + PAGE_SIZE >= total || isFetching}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
                data-testid="btn-activity-next"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivitySummaryCard({ summary }: { summary: ActivitySummary }) {
  const stats: { label: string; value: string }[] = [
    { label: "Total events", value: summary.totalEvents.toLocaleString() },
    {
      label: "Lessons completed",
      value: `${summary.lessonsCompleted} / ${summary.totalLessons} (${summary.completionPct}%)`,
    },
    { label: "Downloads", value: String(summary.downloads) },
    { label: "Videos completed", value: String(summary.videoCompletions) },
    { label: "Refund requests", value: String(summary.refundRequests) },
    {
      label: "First seen",
      value: summary.firstSeenAt ? formatDate(summary.firstSeenAt) : "—",
    },
    {
      label: "Last seen",
      value: summary.lastSeenAt ? formatDate(summary.lastSeenAt) : "—",
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="text-sm font-medium">Activity summary</div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {s.label}
            </div>
            <div className="mt-1 text-sm font-medium">{s.value}</div>
          </div>
        ))}
      </div>
      {summary.furthestChapter && (
        <div className="mt-6 rounded-xl border border-border bg-background p-4">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Furthest chapter
          </div>
          <div className="mt-1 text-sm">
            <span className="font-medium">
              {summary.furthestChapter.courseTitle}
            </span>{" "}
            — Chapter {summary.furthestChapter.chapterIndex + 1}:{" "}
            {summary.furthestChapter.chapterTitle}
          </div>
        </div>
      )}
    </div>
  );
}
