import { Link } from "wouter";
import { useAdminGetStats } from "@workspace/api-client-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { StaffOnly } from "@/components/RoleGate";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate, initials } from "@/lib/utils";

export default function AdminHomePage() {
  return (
    <StaffOnly>
      <Inner />
    </StaffOnly>
  );
}

function Inner() {
  const { data, isLoading } = useAdminGetStats();
  return (
    <AppShell>
      <PageHeader
        eyebrow="Admin"
        title="Overview"
        description="A snapshot of platform activity, learner progress, and live engagements."
      />
      <div className="px-10 py-10">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard label="Members" value={data?.totalUsers} loading={isLoading} />
          <StatCard label="Courses" value={data?.totalCourses} loading={isLoading} />
          <StatCard label="Lessons" value={data?.totalLessons} loading={isLoading} />
          <StatCard label="Active projects" value={data?.activeProjects} loading={isLoading} />
          <StatCard
            label="Avg completion"
            value={
              data ? `${Math.round(data.avgCompletionPct)}%` : undefined
            }
            loading={isLoading}
          />
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <div className="font-display text-xl">Recent signups</div>
            <Link href="/admin/users" className="text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground">
                View all members
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-2 p-6">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (data?.recentSignups ?? []).length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No members yet.
            </div>
          ) : (
            <ul>
              {data?.recentSignups?.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center gap-3 border-b border-border px-6 py-4 last:border-0"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-foreground text-background text-xs">
                      {initials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {u.email}
                    </div>
                  </div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    {formatDate(u.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | string | undefined;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-20" />
      ) : (
        <div className="mt-2 font-display text-3xl text-foreground">
          {value ?? "—"}
        </div>
      )}
    </div>
  );
}
