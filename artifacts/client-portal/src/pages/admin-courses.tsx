import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  useListCourses,
  useCreateCourse,
  useDeleteCourse,
  getListCoursesQueryKey,
} from "@workspace/api-client-react";
import { AdminShell, AdminPageHeader } from "@/components/AdminShell";
import { AdminOnly } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useToast } from "@/hooks/use-toast";
import { ThumbnailUploader, thumbnailUrl } from "@/components/ThumbnailUploader";

export default function AdminCoursesPage() {
  return (
    <AdminOnly>
      <Inner />
    </AdminOnly>
  );
}

function Inner() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useListCourses();
  const create = useCreateCourse({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListCoursesQueryKey() });
        toast({ title: "Course created" });
      },
    },
  });
  const del = useDeleteCourse({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListCoursesQueryKey() });
        toast({ title: "Course deleted" });
      },
    },
  });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Admin"
        title="Courses"
        description="Create courses, then build out their chapters and lessons."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="new-course"
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                New course
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New course</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ct">Title</Label>
                  <Input
                    id="ct"
                    data-testid="course-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cs">Subtitle</Label>
                  <Input
                    id="cs"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cd">Description</Label>
                  <Textarea
                    id="cd"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>
                <ThumbnailUploader
                  value={coverImageUrl}
                  onChange={setCoverImageUrl}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  data-testid="save-course"
                  disabled={!title.trim() || create.isPending}
                  onClick={() => {
                    create.mutate(
                      {
                        data: {
                          title: title.trim(),
                          subtitle: subtitle || null,
                          description: description || null,
                          coverImageUrl: coverImageUrl || null,
                        },
                      },
                      {
                        onSuccess: () => {
                          setOpen(false);
                          setTitle("");
                          setSubtitle("");
                          setDescription("");
                          setCoverImageUrl(null);
                        },
                      },
                    );
                  }}
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="px-10 py-10">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-8 py-16 text-center">
            <div className="font-display text-2xl">No courses yet</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Click "New course" to add your first course.
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-border bg-card">
            {data!.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-4 border-b border-border px-6 py-5 last:border-0"
              >
                {(() => {
                  const t = thumbnailUrl(c.coverImageUrl);
                  return t ? (
                    <img
                      src={t}
                      alt=""
                      className="h-14 w-24 flex-none rounded-md border border-border object-cover"
                    />
                  ) : (
                    <div className="h-14 w-24 flex-none rounded-md border border-border bg-foreground" />
                  );
                })()}
                <div className="min-w-0 flex-1">
                  <div className="font-display text-xl text-foreground">
                    {c.title}
                  </div>
                  {c.subtitle && (
                    <div className="text-sm text-muted-foreground">
                      {c.subtitle}
                    </div>
                  )}
                  <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                    {c.totalLessons} lessons
                  </div>
                </div>
                <Link href={`/admin/courses/${c.id}/edit`}>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid={`edit-course-${c.id}`}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`delete-course-${c.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete course?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the course and all its chapters and lessons.
                        This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => del.mutate({ courseId: c.id })}
                        className="bg-foreground text-background hover:bg-foreground/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}
