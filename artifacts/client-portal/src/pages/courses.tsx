import { Link } from "wouter";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import { useListCourses } from "@workspace/api-client-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { thumbnailUrl } from "@/components/ThumbnailUploader";
import { useMemo, useState } from "react";

export default function CoursesPage() {
  const { data, isLoading } = useListCourses();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data ?? []).filter((course) => !term || course.title.toLowerCase().includes(term) || (course.subtitle ?? "").toLowerCase().includes(term));
  }, [data, query]);
  return (
    <AppShell>
      <PageHeader
        eyebrow="Learn"
        title="Build the know-how."
        description="Short, practical lessons for making better decisions in your fitness business. Pick a path and keep your place."
        actions={<div className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground sm:flex"><BookOpen className="h-4 w-4 text-primary" /> {data?.length ?? 0} courses available</div>}
      />
      <div className="space-y-7 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
        <div className="relative max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search your library" value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 rounded-xl border-border bg-card pl-10" data-testid="input-course-search" /></div>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => {
              const thumb = thumbnailUrl(c.coverImageUrl);
              return (
              <Link
                key={c.id}
                href={`/courses/${c.id}`}
                  data-testid={`course-card-${c.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card hover:-translate-y-1 hover:border-primary/45 hover:shadow-[0_14px_30px_hsl(var(--foreground)/.07)]"
                >
                  {thumb ? (
                    <div className="relative aspect-[16/9] overflow-hidden bg-secondary"><img src={thumb} alt={c.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-foreground/45 to-transparent" /><span className="absolute bottom-3 left-4 rounded-full bg-background/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-foreground">Course</span></div>
                  ) : (
                    <div className="relative flex aspect-[16/9] w-full items-end overflow-hidden bg-sidebar p-5"><div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border-[18px] border-primary/30" /><div className="relative text-5xl font-semibold text-sidebar-foreground/20">F</div><span className="absolute bottom-3 left-4 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-primary-foreground">Course</span></div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="font-display text-2xl font-semibold tracking-[-.035em] text-foreground">{c.title}</div>
                    {c.subtitle && <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">{c.subtitle}</p>}
                    <div className="mt-auto flex items-center justify-between pt-6 text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">
                      <span>{c.totalLessons} lessons</span>
                      <span className="inline-flex items-center gap-1 text-primary">Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                    </div>
                  </div>
              </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-8 py-16 text-center" data-testid="empty-course-library">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <div className="mt-4 font-display text-2xl font-semibold">{query ? "No matches in your library" : "Your library is waiting"}</div>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{query ? "Try a different search term." : "Once a course is granted to your account, it will appear here."}</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
