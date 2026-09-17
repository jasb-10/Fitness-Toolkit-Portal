import { Link } from "wouter";
import { ArrowUpRight, BriefcaseBusiness, CalendarDays } from "lucide-react";
import { useListMyProjects } from "@workspace/api-client-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatDate, statusLabel } from "@/lib/utils";

export default function ProjectsPage() {
  const { data, isLoading } = useListMyProjects();
  return (
    <AppShell>
      <PageHeader eyebrow="Projects" title="Ship the work that matters." description="A clear view of what the team is moving for you, what needs your eye, and what is coming next." />
      <div className="space-y-7 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><BriefcaseBusiness className="h-4 w-4" /></div><div><div className="font-semibold">Your team is on it.</div><div className="text-muted-foreground">Project updates and next milestones are collected here.</div></div></div>
        {isLoading ? (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <div className="space-y-4">
            {data.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}
                  data-testid={`project-card-${p.id}`}
                  className="group relative block rounded-2xl border border-border bg-card p-5 sm:p-6 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_12px_28px_hsl(var(--foreground)/.06)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-primary">
                        {p.clientName || "Project"}
                      </div>
                      <div className="mt-2 font-display text-2xl font-semibold tracking-[-.035em] text-foreground">
                        {p.title}
                      </div>
                      {p.description && (
                        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                          {p.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="border-border bg-muted/50 text-[10px]">
                      {statusLabel(p.status)}
                    </Badge>
                  </div>
                  <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <div>
                      <div className="mb-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
                        <span>Progress</span>
                        <span>{p.progressPct ?? 0}%</span>
                      </div>
                      <Progress value={p.progressPct ?? 0} className="h-1.5 bg-muted [&>div]:bg-accent" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />
                        Next milestone
                      </div>
                      <div className="mt-1 text-sm font-medium text-foreground">
                        {p.nextMilestone || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">
                        Due
                      </div>
                      <div className="mt-1 text-sm text-foreground">
                        {formatDate(p.nextMilestoneDate)}
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="absolute right-5 top-1/2 h-4 w-4 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-8 py-16 text-center" data-testid="empty-projects">
            <BriefcaseBusiness className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <div className="mt-4 font-display text-2xl font-semibold">No projects in motion yet</div>
            <p className="mt-2 text-sm text-muted-foreground">
              When the team kicks off your project, it'll show up here.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
