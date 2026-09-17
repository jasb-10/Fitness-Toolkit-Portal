import { Router, type IRouter, type Response } from "express";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  lessonsTable,
  chaptersTable,
  coursesTable,
  lessonProgressTable,
  activityTable,
} from "@workspace/db";
import { and, asc, eq, sql } from "drizzle-orm";
import {
  CreateLessonBody,
  UpdateLessonBody,
  MarkLessonCompleteBody,
} from "@workspace/api-zod";
import {
  requireAuth,
  requireRole,
  type AuthedRequest,
} from "../middlewares/auth";
import { getAccessibleCourseIds } from "../lib/queries";

const router: IRouter = Router();

router.use(requireAuth);

router.post(
  "/chapters/:chapterId/lessons",
  requireRole(["super_admin", "admin"]),
  async (req, res: Response) => {
    const body = CreateLessonBody.parse(req.body);
    const max = await db
      .select({ m: sql<number>`coalesce(max(${lessonsTable.position}), -1)::int` })
      .from(lessonsTable)
      .where(eq(lessonsTable.chapterId, req.params.chapterId!));
    const [l] = await db
      .insert(lessonsTable)
      .values({
        chapterId: req.params.chapterId!,
        title: body.title,
        lessonType: body.lessonType ?? "video",
        videoUrl: body.videoUrl ?? null,
        durationMinutes: body.durationMinutes ?? null,
        notes: body.notes ?? null,
        position: Number(max[0]?.m ?? -1) + 1,
      })
      .returning();
    res.status(201).json({
      id: l!.id,
      chapterId: l!.chapterId,
      title: l!.title,
      position: l!.position,
      lessonType: l!.lessonType,
      videoUrl: l!.videoUrl,
      durationMinutes: l!.durationMinutes,
      published: l!.published,
    });
  },
);

router.get("/lessons/:lessonId", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  const [row] = await db
    .select({
      lesson: lessonsTable,
      courseId: coursesTable.id,
      courseTitle: coursesTable.title,
    })
    .from(lessonsTable)
    .innerJoin(chaptersTable, eq(chaptersTable.id, lessonsTable.chapterId))
    .innerJoin(coursesTable, eq(coursesTable.id, chaptersTable.courseId))
    .where(eq(lessonsTable.id, req.params.lessonId!));
  if (!row) return res.status(404).json({ error: "Not found" });

  const accessible = await getAccessibleCourseIds(ar.userId, ar.userRole);
  if (!accessible.includes(row.courseId))
    return res.status(403).json({ error: "No access" });

  // Touch lastAccessedAt
  const existing = await db
    .select()
    .from(lessonProgressTable)
    .where(
      and(
        eq(lessonProgressTable.userId, ar.userId),
        eq(lessonProgressTable.lessonId, row.lesson.id),
      ),
    );
  if (existing[0]) {
    await db
      .update(lessonProgressTable)
      .set({ lastAccessedAt: new Date() })
      .where(eq(lessonProgressTable.id, existing[0].id));
  } else {
    await db
      .insert(lessonProgressTable)
      .values({
        userId: ar.userId,
        lessonId: row.lesson.id,
        completed: false,
      })
      .onConflictDoNothing();
  }
  await db.insert(activityTable).values({
    userId: ar.userId,
    action: "viewed_lesson",
    target: row.lesson.title,
    metadata: {
      lessonId: row.lesson.id,
      chapterId: row.lesson.chapterId,
      courseId: row.courseId,
    },
  });

  const completed = !!existing[0]?.completed;
  const rawAtts = (row.lesson.attachments ?? []) as Array<{
    id: string;
    label: string;
    url: string;
    kind?: string;
    type?: "link" | "file";
  }>;
  const attachments = rawAtts.map((a) => ({
    id: a.id,
    label: a.label,
    url: a.url,
    type:
      a.type ??
      (a.url.startsWith("/objects/") || a.url.startsWith("/api/storage/")
        ? "file"
        : "link"),
  }));
  res.json({
    id: row.lesson.id,
    chapterId: row.lesson.chapterId,
    title: row.lesson.title,
    position: row.lesson.position,
    lessonType: row.lesson.lessonType,
    videoUrl: row.lesson.videoUrl,
    durationMinutes: row.lesson.durationMinutes,
    published: row.lesson.published,
    courseId: row.courseId,
    courseTitle: row.courseTitle,
    notes: row.lesson.notes,
    attachments,
    completed,
  });
});

router.patch(
  "/lessons/:lessonId",
  requireRole(["super_admin", "admin"]),
  async (req, res: Response) => {
    const body = UpdateLessonBody.parse(req.body);
    const newAtts = body.attachments
      ? body.attachments.map((a) => ({
          id: randomUUID(),
          label: a.label,
          url: a.url,
          kind: "resource" as const,
          type: a.type,
        }))
      : undefined;
    const [l] = await db
      .update(lessonsTable)
      .set({
        title: body.title ?? undefined,
        lessonType: body.lessonType ?? undefined,
        videoUrl: body.videoUrl ?? undefined,
        durationMinutes: body.durationMinutes ?? undefined,
        notes: body.notes ?? undefined,
        position: body.position ?? undefined,
        published: body.published ?? undefined,
        attachments: newAtts,
      })
      .where(eq(lessonsTable.id, req.params.lessonId!))
      .returning();
    res.json({
      id: l!.id,
      chapterId: l!.chapterId,
      title: l!.title,
      position: l!.position,
      lessonType: l!.lessonType,
      videoUrl: l!.videoUrl,
      durationMinutes: l!.durationMinutes,
      published: l!.published,
    });
  },
);

router.delete(
  "/lessons/:lessonId",
  requireRole(["super_admin", "admin"]),
  async (req, res: Response) => {
    await db.delete(lessonsTable).where(eq(lessonsTable.id, req.params.lessonId!));
    res.status(204).end();
  },
);

router.post("/lessons/:lessonId/complete", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  const body = MarkLessonCompleteBody.parse(req.body);
  const existing = await db
    .select()
    .from(lessonProgressTable)
    .where(
      and(
        eq(lessonProgressTable.userId, ar.userId),
        eq(lessonProgressTable.lessonId, req.params.lessonId!),
      ),
    );
  const now = new Date();
  if (existing[0]) {
    const [updated] = await db
      .update(lessonProgressTable)
      .set({
        completed: body.completed,
        completedAt: body.completed ? now : null,
        lastAccessedAt: now,
      })
      .where(eq(lessonProgressTable.id, existing[0].id))
      .returning();
    res.json({
      lessonId: updated!.lessonId,
      completed: updated!.completed,
      completedAt: updated!.completedAt
        ? updated!.completedAt.toISOString()
        : null,
    });
  } else {
    const [created] = await db
      .insert(lessonProgressTable)
      .values({
        userId: ar.userId,
        lessonId: req.params.lessonId!,
        completed: body.completed,
        completedAt: body.completed ? now : null,
        lastAccessedAt: now,
      })
      .returning();
    res.json({
      lessonId: created!.lessonId,
      completed: created!.completed,
      completedAt: created!.completedAt
        ? created!.completedAt.toISOString()
        : null,
    });
  }
  if (body.completed) {
    const [l] = await db
      .select({ title: lessonsTable.title })
      .from(lessonsTable)
      .where(eq(lessonsTable.id, req.params.lessonId!));
    if (l) {
      await db.insert(activityTable).values({
        userId: ar.userId,
        action: "completed_lesson",
        target: l.title,
        metadata: { lessonId: req.params.lessonId },
      });
    }
  }
});

// Avoid unused import warning
void asc;

export default router;
