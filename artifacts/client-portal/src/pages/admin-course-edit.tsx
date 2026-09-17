import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronDown,
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Play,
} from "lucide-react";
import {
  useGetCourse,
  useUpdateCourse,
  useCreateChapter,
  useUpdateChapter,
  useDeleteChapter,
  useCreateLesson,
  useGetLesson,
  useUpdateLesson,
  useDeleteLesson,
  getGetCourseQueryKey,
  getGetLessonQueryKey,
  getListCoursesQueryKey,
  type Lesson,
  type LessonDetail,
  type Chapter,
} from "@workspace/api-client-react";
import { ThumbnailUploader } from "@/components/ThumbnailUploader";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  LessonAttachmentsEditor,
  type AttachmentDraft,
} from "@/components/LessonAttachmentsEditor";
import { AppShell } from "@/components/AppShell";
import { AdminOnly } from "@/components/RoleGate";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn, formatDuration } from "@/lib/utils";

export default function AdminCourseEditPage({
  courseId,
}: {
  courseId: string;
}) {
  return (
    <AdminOnly>
      <Inner courseId={courseId} />
    </AdminOnly>
  );
}

function Inner({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetCourse(courseId);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });

  const createChapter = useCreateChapter({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Chapter added" });
      },
    },
  });
  const updateChapter = useUpdateChapter({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Chapter updated" });
      },
    },
  });
  const deleteChapter = useDeleteChapter({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Chapter removed" });
      },
    },
  });
  const createLesson = useCreateLesson({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Lesson added" });
      },
    },
  });

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (data?.chapters && Object.keys(openMap).length === 0) {
      const init: Record<string, boolean> = {};
      data.chapters.forEach((c) => (init[c.id] = true));
      setOpenMap(init);
    }
  }, [data?.chapters, openMap]);

  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [renamingChapter, setRenamingChapter] = useState<Chapter | null>(null);

  return (
    <AppShell>
      <div className="border-b border-border px-10 pt-8">
        <Link href="/admin/courses" className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-3.5 w-3.5" />
            All courses
        </Link>
        <div className="mt-4 pb-8">
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Curriculum builder
          </div>
          <h1 className="mt-1 font-display text-4xl text-foreground sm:text-5xl">
            {isLoading ? <Skeleton className="h-12 w-72" /> : data?.title}
          </h1>
          {data?.subtitle && (
            <p className="mt-2 text-sm text-muted-foreground">{data.subtitle}</p>
          )}
        </div>
      </div>

      <div className="px-10 py-10">
        <div className="mx-auto max-w-4xl space-y-6">
          {data && <CourseSettingsCard course={data} />}
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              {data?.chapters.map((ch) => {
                const open = openMap[ch.id] ?? true;
                return (
                  <div
                    key={ch.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card"
                    data-testid={`chapter-${ch.id}`}
                  >
                    <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground/60" />
                      <button
                        onClick={() =>
                          setOpenMap((p) => ({ ...p, [ch.id]: !open }))
                        }
                        className="flex flex-1 items-center gap-2 text-left"
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            open ? "rotate-0" : "-rotate-90",
                          )}
                        />
                        <span className="font-display text-lg text-foreground">
                          {ch.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({ch.lessons.length})
                        </span>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRenamingChapter(ch)}
                        data-testid={`rename-chapter-${ch.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`delete-chapter-${ch.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete chapter?</AlertDialogTitle>
                            <AlertDialogDescription>
                              All lessons in this chapter will be removed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                deleteChapter.mutate({ chapterId: ch.id })
                              }
                              className="bg-foreground text-background"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    {open && (
                      <div>
                        {ch.lessons.map((l) => (
                          <LessonRow
                            key={l.id}
                            lesson={l}
                            onEdit={() => setEditingLesson(l.id)}
                            onAfterDelete={invalidate}
                          />
                        ))}
                        <AddLessonRow
                          chapterId={ch.id}
                          onCreate={(title) =>
                            createLesson.mutate({
                              chapterId: ch.id,
                              data: { title, lessonType: "video" },
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              <AddChapterRow
                onCreate={(title) =>
                  createChapter.mutate({ courseId, data: { title } })
                }
              />
            </>
          )}
        </div>
      </div>

      <RenameChapterDialog
        chapter={renamingChapter}
        onClose={() => setRenamingChapter(null)}
        onSave={(title) => {
          if (renamingChapter) {
            updateChapter.mutate({
              chapterId: renamingChapter.id,
              data: { title },
            });
            setRenamingChapter(null);
          }
        }}
      />

      {editingLesson && (
        <LessonEditorDialog
          lessonId={editingLesson}
          onClose={() => setEditingLesson(null)}
          onSaved={invalidate}
        />
      )}
    </AppShell>
  );
}

function LessonRow({
  lesson,
  onEdit,
  onAfterDelete,
}: {
  lesson: Lesson;
  onEdit: () => void;
  onAfterDelete: () => void;
}) {
  const { toast } = useToast();
  const del = useDeleteLesson({
    mutation: {
      onSuccess: () => {
        onAfterDelete();
        toast({ title: "Lesson removed" });
      },
    },
  });
  return (
    <div className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0">
      <GripVertical className="h-4 w-4 text-muted-foreground/50" />
      <Play className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{lesson.title}</div>
        <div className="text-xs text-muted-foreground">
          {formatDuration(lesson.durationMinutes)} · {lesson.lessonType}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onEdit}
        data-testid={`edit-lesson-${lesson.id}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            data-testid={`delete-lesson-${lesson.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the lesson.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => del.mutate({ lessonId: lesson.id })}
              className="bg-foreground text-background"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddLessonRow({
  chapterId,
  onCreate,
}: {
  chapterId: string;
  onCreate: (title: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        data-testid={`add-lesson-${chapterId}`}
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 px-5 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        Add lesson
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2 border-t border-border px-5 py-3">
      <Input
        autoFocus
        placeholder="New lesson title…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) {
            onCreate(title.trim());
            setTitle("");
            setOpen(false);
          }
          if (e.key === "Escape") setOpen(false);
        }}
        data-testid={`new-lesson-input-${chapterId}`}
      />
      <Button
        size="sm"
        disabled={!title.trim()}
        onClick={() => {
          onCreate(title.trim());
          setTitle("");
          setOpen(false);
        }}
        className="bg-foreground text-background hover:bg-foreground/90"
      >
        Add
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}

function AddChapterRow({ onCreate }: { onCreate: (t: string) => void }) {
  const [title, setTitle] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        data-testid="add-chapter"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-5 py-5 text-sm text-muted-foreground transition-colors hover:border-foreground/50 hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        Add chapter
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3">
      <Input
        autoFocus
        placeholder="New chapter title…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        data-testid="new-chapter-input"
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) {
            onCreate(title.trim());
            setTitle("");
            setOpen(false);
          }
        }}
      />
      <Button
        size="sm"
        disabled={!title.trim()}
        onClick={() => {
          onCreate(title.trim());
          setTitle("");
          setOpen(false);
        }}
        className="bg-foreground text-background hover:bg-foreground/90"
      >
        Add
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}

function RenameChapterDialog({
  chapter,
  onClose,
  onSave,
}: {
  chapter: Chapter | null;
  onClose: () => void;
  onSave: (title: string) => void;
}) {
  const [title, setTitle] = useState("");
  useEffect(() => {
    setTitle(chapter?.title ?? "");
  }, [chapter]);
  return (
    <Dialog open={!!chapter} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename chapter</DialogTitle>
        </DialogHeader>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim()}
            onClick={() => onSave(title.trim())}
            className="bg-foreground text-background"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface LessonForm {
  title: string;
  lessonType: "video" | "text";
  videoUrl: string;
  durationMinutes: string;
  notes: string;
  attachments: AttachmentDraft[];
}

function LessonEditorDialog({
  lessonId,
  onClose,
  onSaved,
}: {
  lessonId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetLesson(lessonId);
  const update = useUpdateLesson({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetLessonQueryKey(lessonId) });
        onSaved();
        toast({ title: "Lesson saved" });
        onClose();
      },
    },
  });

  const [form, setForm] = useState<LessonForm>({
    title: "",
    lessonType: "video",
    videoUrl: "",
    durationMinutes: "",
    notes: "",
    attachments: [],
  });

  useEffect(() => {
    if (data) {
      const d = data as LessonDetail;
      setForm({
        title: d.title,
        lessonType: d.lessonType,
        videoUrl: d.videoUrl ?? "",
        durationMinutes: d.durationMinutes?.toString() ?? "",
        notes: d.notes ?? "",
        attachments:
          d.attachments?.map((a) => ({
            label: a.label,
            url: a.url,
            type: a.type,
          })) ?? [],
      });
    }
  }, [data]);

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit lesson</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                data-testid="lesson-edit-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.lessonType}
                  onValueChange={(v: "video" | "text") =>
                    setForm({ ...form, lessonType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm({ ...form, durationMinutes: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Video URL</Label>
              <Input
                value={form.videoUrl}
                onChange={(e) =>
                  setForm({ ...form, videoUrl: e.target.value })
                }
                placeholder="https://… (YouTube or mp4)"
              />
            </div>
            <div className="space-y-2">
              <Label>Lesson content</Label>
              <RichTextEditor
                value={form.notes}
                onChange={(html) => setForm({ ...form, notes: html })}
                placeholder="Write the lesson content. Use the toolbar to add headings, callouts, images, links, lists…"
              />
              <p className="text-xs text-muted-foreground">
                Appears underneath the video on the lesson page. You can paste
                images or use the image button to upload.
              </p>
            </div>

            <LessonAttachmentsEditor
              items={form.attachments}
              onChange={(items) => setForm({ ...form, attachments: items })}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            data-testid="save-lesson"
            disabled={!form.title.trim() || update.isPending}
            onClick={() =>
              update.mutate({
                lessonId,
                data: {
                  title: form.title.trim(),
                  lessonType: form.lessonType,
                  videoUrl: form.videoUrl || null,
                  durationMinutes: form.durationMinutes
                    ? Number(form.durationMinutes)
                    : null,
                  notes: form.notes || null,
                  attachments: form.attachments
                    .filter((a) => a.label.trim() && a.url.trim())
                    .map((a) => ({
                      label: a.label.trim(),
                      url: a.url.trim(),
                      type: a.type,
                    })),
                },
              })
            }
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            Save lesson
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CourseSettingsProps {
  course: {
    id: string;
    title: string;
    subtitle?: string | null;
    description?: string | null;
    coverImageUrl?: string | null;
  };
}

function CourseSettingsCard({ course }: CourseSettingsProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState(course.title);
  const [subtitle, setSubtitle] = useState(course.subtitle ?? "");
  const [description, setDescription] = useState(course.description ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(
    course.coverImageUrl ?? null,
  );

  const update = useUpdateCourse({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetCourseQueryKey(course.id) });
        qc.invalidateQueries({ queryKey: getListCoursesQueryKey() });
        toast({ title: "Course updated" });
      },
    },
  });

  const dirty =
    title !== course.title ||
    (subtitle || null) !== (course.subtitle ?? null) ||
    (description || null) !== (course.description ?? null) ||
    (coverImageUrl || null) !== (course.coverImageUrl ?? null);

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-display text-xl">Course settings</div>
        <Button
          size="sm"
          disabled={!dirty || update.isPending}
          onClick={() =>
            update.mutate({
              courseId: course.id,
              data: {
                title: title.trim(),
                subtitle: subtitle || null,
                description: description || null,
                coverImageUrl: coverImageUrl || null,
              },
            })
          }
          className="bg-foreground text-background hover:bg-foreground/90"
          data-testid="save-course-settings"
        >
          Save changes
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <div>
          <ThumbnailUploader
            value={coverImageUrl}
            onChange={setCoverImageUrl}
            label="Course thumbnail"
          />
        </div>
      </div>
    </div>
  );
}
