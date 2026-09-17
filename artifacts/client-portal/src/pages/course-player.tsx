import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import DOMPurify from "dompurify";
import {
  ChevronDown,
  ChevronLeft,
  Search,
  CheckCircle2,
  Circle,
  Play,
  Download,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import {
  useGetCourse,
  useGetLesson,
  useMarkLessonComplete,
  getGetCourseQueryKey,
  getGetLessonQueryKey,
  getGetDashboardQueryKey,
  getListCoursesQueryKey,
  type CourseDetail,
  type LessonDetail,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { VideoPlayer } from "@/components/VideoPlayer";
import { cn, formatDuration } from "@/lib/utils";
import { track } from "@/lib/track";

export default function CoursePlayerPage({ courseId }: { courseId: string }) {
  const [loc] = useLocation();
  const qs = new URLSearchParams(loc.split("?")[1] ?? "");
  const lessonIdFromUrl = qs.get("lesson");

  const { data: course, isLoading: loadingCourse } = useGetCourse(courseId);

  const allLessons = useMemo(
    () => course?.chapters.flatMap((ch) => ch.lessons) ?? [],
    [course],
  );
  const completedSet = useMemo(
    () => new Set(course?.completedLessonIds ?? []),
    [course],
  );

  const initialLessonId = useMemo(() => {
    if (lessonIdFromUrl && allLessons.some((l) => l.id === lessonIdFromUrl))
      return lessonIdFromUrl;
    const firstIncomplete = allLessons.find((l) => !completedSet.has(l.id));
    return firstIncomplete?.id ?? allLessons[0]?.id ?? null;
  }, [allLessons, completedSet, lessonIdFromUrl]);

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(
    initialLessonId,
  );

  useEffect(() => {
    if (!selectedLessonId && initialLessonId)
      setSelectedLessonId(initialLessonId);
  }, [initialLessonId, selectedLessonId]);

  useEffect(() => {
    if (selectedLessonId) {
      const next = new URLSearchParams();
      next.set("lesson", selectedLessonId);
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}?${next.toString()}`,
      );
    }
  }, [selectedLessonId]);

  const totalLessons = allLessons.length;
  const completionPct =
    totalLessons > 0 ? (completedSet.size / totalLessons) * 100 : 0;

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background lg:flex-row">
      {/* Left sidebar */}
      <aside className="sticky top-0 flex max-h-[46dvh] w-full shrink-0 flex-col border-b border-border bg-sidebar lg:h-[100dvh] lg:max-h-none lg:w-[360px] lg:border-b-0 lg:border-r">
        <div className="border-b border-border px-6 pt-5 pb-4">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to dashboard
          </Link>
        </div>
        <div className="border-b border-border px-6 py-5">
          {loadingCourse ? (
            <Skeleton className="h-7 w-44" />
          ) : (
            <h2 className="font-display text-xl text-foreground">
              {course?.title}
            </h2>
          )}
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-[11px] uppercase tracking-widest text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(completionPct)}%</span>
            </div>
            <Progress value={completionPct} className="h-1" />
          </div>
        </div>

        <CurriculumNav
          chapters={course?.chapters ?? []}
          completedSet={completedSet}
          selectedLessonId={selectedLessonId}
          onSelect={setSelectedLessonId}
          loading={loadingCourse}
        />
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1">
        {selectedLessonId ? (
          <LessonPane
            key={selectedLessonId}
            courseId={courseId}
            lessonId={selectedLessonId}
            allLessons={allLessons}
            onNext={(id) => setSelectedLessonId(id)}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-10 py-20">
            <div className="text-center">
              <div className="font-display text-2xl">No lessons yet</div>
              <p className="mt-2 text-sm text-muted-foreground">
                The instructor hasn't published any lessons in this course yet.
              </p>
              <Link href="/courses" className="mt-6 inline-flex text-sm font-medium underline">
                  Back to courses
              </Link>
            </div>
          </div>
        )}
      </main>

    </div>
  );
}

function CurriculumNav({
  chapters,
  completedSet,
  selectedLessonId,
  onSelect,
  loading,
}: {
  chapters: CourseDetail["chapters"];
  completedSet: Set<string>;
  selectedLessonId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (chapters.length && Object.keys(openMap).length === 0) {
      const init: Record<string, boolean> = {};
      chapters.forEach((c) => (init[c.id] = true));
      setOpenMap(init);
    }
  }, [chapters, openMap]);

  const filter = search.trim().toLowerCase();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            data-testid="lesson-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lessons"
            className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm focus:border-foreground focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-6">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          chapters.map((ch) => {
            const filtered = filter
              ? ch.lessons.filter((l) =>
                  l.title.toLowerCase().includes(filter),
                )
              : ch.lessons;
            if (filter && filtered.length === 0) return null;
            const open = openMap[ch.id] ?? true;
            return (
              <div key={ch.id} className="border-b border-border last:border-0">
                <button
                  data-testid={`chapter-toggle-${ch.id}`}
                  onClick={() =>
                    setOpenMap((p) => ({ ...p, [ch.id]: !open }))
                  }
                  className="flex w-full items-center justify-between gap-2 px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:bg-sidebar-accent/50"
                >
                  <span className="truncate">{ch.title}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      open ? "rotate-0" : "-rotate-90",
                    )}
                  />
                </button>
                {open && (
                  <div className="pb-2">
                    {filtered.map((l) => {
                      const completed = completedSet.has(l.id);
                      const selected = selectedLessonId === l.id;
                      return (
                        <button
                          key={l.id}
                          data-testid={`lesson-item-${l.id}`}
                          onClick={() => onSelect(l.id)}
                          className={cn(
                            "flex w-full items-center gap-3 px-6 py-2.5 text-left text-sm transition-colors",
                            selected
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-foreground/80 hover:bg-sidebar-accent/60",
                          )}
                        >
                          {completed ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                          )}
                          <Play className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate",
                              selected ? "font-medium" : "",
                            )}
                          >
                            {l.title}
                          </span>
                          <span className="shrink-0 text-[11px] uppercase tracking-widest text-muted-foreground">
                            {formatDuration(l.durationMinutes)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function LessonPane({
  courseId,
  lessonId,
  allLessons,
  onNext,
}: {
  courseId: string;
  lessonId: string;
  allLessons: { id: string; title: string }[];
  onNext: (id: string) => void;
}) {
  const qc = useQueryClient();
  const { data: lesson, isLoading } = useGetLesson(lessonId);
  const completeMutation = useMarkLessonComplete({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetLessonQueryKey(lessonId) });
        qc.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
        qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        qc.invalidateQueries({ queryKey: getListCoursesQueryKey() });
      },
    },
  });

  const idx = allLessons.findIndex((l) => l.id === lessonId);
  const next = idx >= 0 ? allLessons[idx + 1] : undefined;

  const handleComplete = async () => {
    if (!lesson) return;
    await completeMutation.mutateAsync({
      lessonId,
      data: { completed: !lesson.completed },
    });
    if (!lesson.completed && next) {
      onNext(next.id);
    }
  };

  return (
    <div>
      {/* Sticky lesson title bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/85 px-10 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Lesson {idx >= 0 ? idx + 1 : ""} of {allLessons.length}
            </div>
            <div className="truncate font-display text-2xl text-foreground">
              {isLoading ? <Skeleton className="h-7 w-72" /> : lesson?.title}
            </div>
          </div>
          {lesson && (
            <motion.div
              initial={false}
              animate={{ scale: lesson.completed ? 1.05 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="flex items-center gap-2 text-xs uppercase tracking-widest"
            >
              {lesson.completed ? (
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  Completed
                </span>
              ) : (
                <span className="text-muted-foreground">In progress</span>
              )}
            </motion.div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-10 pb-24 pt-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <VideoFromLesson lesson={lesson} loading={isLoading} />
        </div>

        <div className="mt-10 space-y-12">
          {/* Lesson rich content */}
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : lesson?.notes ? (
            <div
              className="prose prose-neutral max-w-none text-foreground/90 prose-headings:font-display prose-img:rounded-lg prose-img:border prose-img:border-border prose-blockquote:border-l-foreground prose-blockquote:bg-muted/40 prose-blockquote:py-1 prose-a:underline-offset-4"
              data-testid="lesson-content"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(lesson.notes, {
                  ADD_ATTR: ["target", "rel"],
                }),
              }}
            />
          ) : null}

          {/* Templates & resources */}
          {(lesson?.attachments?.length ?? 0) > 0 && (
            <Section title="Templates & resources">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {lesson!.attachments!.map((a) => (
                  <AttachmentCard
                    key={a.id}
                    url={a.url}
                    label={a.label}
                    type={a.type}
                    lessonId={lesson?.id}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Complete & Continue */}
          {lesson && (
            <div className="border-t border-border pt-10">
              <button
                data-testid="complete-and-continue"
                onClick={handleComplete}
                disabled={completeMutation.isPending}
                className="group inline-flex items-center gap-3 rounded-md bg-foreground px-6 py-4 text-sm font-medium uppercase tracking-widest text-background transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {lesson.completed
                  ? next
                    ? "Continue to next lesson"
                    : "Lesson complete"
                  : next
                  ? "Complete & Continue"
                  : "Complete lesson"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              {next && (
                <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
                  Up next: {next.title}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoFromLesson({
  lesson,
  loading,
}: {
  lesson: LessonDetail | undefined;
  loading: boolean;
}) {
  if (loading) return <Skeleton className="aspect-video w-full" />;
  return <VideoPlayer url={lesson?.videoUrl ?? null} />;
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
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {title}
      </div>
      {children}
    </section>
  );
}

function AttachmentCard({
  url,
  label,
  type,
  lessonId,
}: {
  url: string;
  label: string;
  type: "link" | "file";
  lessonId?: string;
}) {
  const isFile = type === "file";
  const Icon = isFile ? Download : ExternalLink;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      download={isFile ? "" : undefined}
      onClick={() =>
        track(isFile ? "downloaded_attachment" : "opened_link", {
          target: label,
          metadata: { lessonId, url },
        })
      }
      data-testid={`attachment-${label}`}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:border-foreground/40"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">
          {label}
        </div>
        <div className="text-xs text-muted-foreground">
          {isFile ? "Tap to download" : "Open link"}
        </div>
      </div>
    </a>
  );
}
