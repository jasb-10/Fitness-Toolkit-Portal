import { Link } from "wouter";
import { ArrowRight, ArrowUpRight, CheckCircle2, Clock3, Flame, Play, Sparkles } from "lucide-react";
import { useGetDashboard, useGetMe } from "@workspace/api-client-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, statusLabel } from "@/lib/utils";

export default function DashboardPage() {
  const { data: me } = useGetMe();
  const { data, isLoading, isError, refetch } = useGetDashboard();
  const firstName = me?.user.name?.split(" ")[0] ?? "there";
  const completion = Math.round(data?.stats.completionPct ?? 0);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Member workspace"
        title={`Make this week count, ${firstName}.`}
        description={data?.welcomeMessage ?? "Your next useful step is closer than it looks. Keep learning, keep shipping, keep the momentum visible."}
        actions={<Link href="/courses" data-testid="link-dashboard-start-learning" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_8px_22px_hsl(var(--primary)/.2)] hover:-translate-y-0.5 hover:bg-primary/90">Continue learning <ArrowRight className="h-4 w-4" /></Link>}
      />
      <div className="space-y-10 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
        {isError ? (
          <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-6" data-testid="status-dashboard-error">
            <div className="font-semibold">Your workspace is taking a breather.</div>
            <p className="mt-1 text-sm text-muted-foreground">We could not load your latest progress.</p>
            <button type="button" onClick={() => void refetch()} data-testid="button-retry-dashboard" className="mt-4 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-muted">Try again</button>
          </div>
        ) : (
          <>
            <section className="grid gap-5 lg:grid-cols-[1.45fr_.85fr]">
              <div className="relative overflow-hidden rounded-2xl bg-sidebar p-6 text-sidebar-foreground sm:p-8">
                <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[30px] border-primary/25" />
                <div className="absolute -bottom-24 right-20 h-48 w-48 rounded-full border-[18px] border-accent/20" />
                <div className="relative">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-accent"><Sparkles className="h-3.5 w-3.5" /> Your next move</div>
                  <h2 className="mt-5 max-w-lg font-display text-3xl font-semibold leading-tight tracking-[-.04em] sm:text-4xl">Turn one hour into visible progress.</h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-sidebar-foreground/65">Pick up the next lesson, capture a decision, or check the project that is moving your business forward.</p>
                  <Link href={data?.recentLessons?.[0] ? `/courses/${data.recentLessons[0].courseId}?lesson=${data.recentLessons[0].lessonId}` : "/courses"} data-testid="link-dashboard-next-move" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground hover:-translate-y-0.5 hover:bg-accent/90">
                    {data?.recentLessons?.[0] ? "Resume your lesson" : "Explore the library"} <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-7">
                <div className="flex items-start justify-between">
                  <div><div className="text-[10px] font-semibold uppercase tracking-[.2em] text-muted-foreground">Learning pulse</div><div className="mt-3 font-display text-4xl font-semibold">{completion}%</div><div className="mt-1 text-sm text-muted-foreground">course path complete</div></div>
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Flame className="h-5 w-5" /></div>
                </div>
                <Progress value={completion} className="mt-6 h-2 bg-muted [&>div]:bg-primary" />
                <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-5">
                  <Metric label="Lessons" value={`${data?.stats.completedLessons ?? 0}/${data?.stats.totalLessons ?? 0}`} loading={isLoading} />
                  <Metric label="Hours" value={(data?.stats.hoursWatched ?? 0).toFixed(1)} loading={isLoading} />
                  <Metric label="Streak" value={`${data?.stats.streakDays ?? 0}d`} loading={isLoading} />
                </div>
              </div>
            </section>

            <section className="grid gap-10 xl:grid-cols-[1fr_360px]">
              <div>
                <SectionHeader title="Your learning path" link="/courses" linkLabel="View library" />
                {isLoading ? <div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /></div> : data?.courses?.length ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {data.courses.slice(0, 4).map((course) => (
                      <Link key={course.id} href={`/courses/${course.id}`} data-testid={`link-dashboard-course-${course.id}`} className="group rounded-2xl border border-border bg-card p-5 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_12px_30px_hsl(var(--foreground)/.06)]">
                        <div className="flex items-start justify-between gap-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground"><span className="font-display text-lg font-semibold">{course.title.slice(0, 1)}</span></div><ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div>
                        <div className="mt-5 truncate font-display text-xl font-semibold">{course.title}</div>
                        <div className="mt-4 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[.13em] text-muted-foreground"><span>{Math.round(course.completionPct)}% complete</span><span>{course.completedLessons}/{course.totalLessons}</span></div>
                        <Progress value={course.completionPct} className="mt-2 h-1.5 bg-muted [&>div]:bg-primary" />
                      </Link>
                    ))}
                  </div>
                ) : <EmptyCard title="Your library is ready when you are." body="Courses granted to your account will appear here." href="/courses" action="Browse courses" />}
              </div>
              <div>
                <SectionHeader title="Keep going" />
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  {isLoading ? <div className="space-y-4 p-5"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : data?.recentLessons?.length ? data.recentLessons.slice(0, 3).map((lesson) => (
                    <Link key={lesson.lessonId} href={`/courses/${lesson.courseId}?lesson=${lesson.lessonId}`} data-testid={`link-recent-lesson-${lesson.lessonId}`} className="flex items-center gap-3 border-b border-border px-4 py-4 last:border-0 hover:bg-muted/50">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Play className="h-3.5 w-3.5 fill-current" /></div>
                      <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{lesson.lessonTitle}</div><div className="mt-0.5 truncate text-xs text-muted-foreground">{lesson.courseTitle} · {formatDate(lesson.lastAccessedAt)}</div></div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  )) : <div className="p-6 text-sm text-muted-foreground">Your recent lessons will land here as you learn.</div>}
                </div>
              </div>
            </section>

            <section>
              <SectionHeader title="Projects in motion" link="/projects" linkLabel="View projects" />
              {(data?.activeProjects ?? []).length ? <div className="grid gap-4 lg:grid-cols-2">{data?.activeProjects?.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} data-testid={`link-dashboard-project-${project.id}`} className="group rounded-2xl border border-border bg-card p-5 hover:border-primary/45">
                  <div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-primary">{project.clientName ?? "Done for you"}</div><div className="mt-2 font-display text-2xl font-semibold">{project.title}</div></div><Badge variant="outline" className="border-border bg-muted/50 text-[10px]">{statusLabel(project.status)}</Badge></div>
                  <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground"><span>{project.nextMilestone ?? "Project underway"}</span><span className="font-semibold text-foreground">{project.progressPct ?? 0}%</span></div><Progress value={project.progressPct ?? 0} className="mt-2 h-1.5 bg-muted [&>div]:bg-accent" />
                </Link>
              ))}</div> : <EmptyCard title="No project is in motion yet." body="When the team kicks off a done-for-you project, your next milestone will appear here." href="/projects" action="Open projects" />}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Metric({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return <div><div className="text-[10px] font-semibold uppercase tracking-[.15em] text-muted-foreground">{label}</div>{loading ? <Skeleton className="mt-2 h-5 w-12" /> : <div className="mt-1 font-display text-xl font-semibold">{value}</div>}</div>;
}

function SectionHeader({ title, link, linkLabel }: { title: string; link?: string; linkLabel?: string }) {
  return <div className="mb-4 flex items-end justify-between"><h2 className="font-display text-2xl font-semibold tracking-[-.035em]">{title}</h2>{link && <Link href={link} data-testid={`link-section-${linkLabel}`} className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground hover:text-primary">{linkLabel}<ArrowRight className="h-3.5 w-3.5" /></Link>}</div>;
}

function EmptyCard({ title, body, href, action }: { title: string; body: string; href: string; action: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-9 text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-muted-foreground/50" /><div className="mt-3 font-display text-xl font-semibold">{title}</div><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p><Link href={href} data-testid={`link-empty-${action}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3">{action}<ArrowRight className="h-4 w-4" /></Link></div>;
}