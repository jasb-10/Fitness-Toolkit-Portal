import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import {
  coursesTable,
  chaptersTable,
  lessonsTable,
  lessonProgressTable,
  courseAccessTable,
} from "@workspace/db";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  CreateCourseBody,
  UpdateCourseBody,
  CreateChapterBody,
  UpdateChapterBody,
} from "@workspace/api-zod";
import {
  requireAuth,
  requireRole,
  type AuthedRequest,
} from "../middlewares/auth";
import { getAccessibleCourseIds } from "../lib/queries";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/courses", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  const accessible = await getAccessibleCourseIds(ar.userId, ar.userRole);
  if (accessible.length === 0) return res.json([]);
  const courses = await db
    .select()
    .from(coursesTable)
    .where(inArray(coursesTable.id, accessible))
    .orderBy(asc(coursesTable.position));
  const result = await Promise.all(
    courses.map(async (c) => {
      const t = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(lessonsTable)
        .innerJoin(chaptersTable, eq(chaptersTable.id, lessonsTable.chapterId))
        .where(eq(chaptersTable.courseId, c.id));
      return {
        id: c.id,
        title: c.title,
        subtitle: c.subtitle,
        coverImageUrl: c.coverImageUrl,
        totalLessons: Number(t[0]?.count ?? 0),
        published: c.published,
      };
    }),
  );
  res.json(result);
});

router.post(
  "/courses",
  requireRole(["super_admin", "admin"]),
  async (req, res: Response) => {
    const body = CreateCourseBody.parse(req.body);
    const [c] = await db
      .insert(coursesTable)
      .values({
        title: body.title,
        subtitle: body.subtitle ?? null,
        description: body.description ?? null,
        coverImageUrl: body.coverImageUrl ?? null,
      })
      .returning();
    res.status(201).json({
      id: c!.id,
      title: c!.title,
      subtitle: c!.subtitle,
      description: c!.description,
      coverImageUrl: c!.coverImageUrl,
      published: c!.published,
      createdAt: c!.createdAt.toISOString(),
    });
  },
);

router.get("/courses/:courseId", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  const { courseId } = req.params;
  const accessible = await getAccessibleCourseIds(ar.userId, ar.userRole);
  if (!accessible.includes(courseId!))
    return res.status(403).json({ error: "No access" });

  const [c] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, courseId!));
  if (!c) return res.status(404).json({ error: "Not found" });

  const chapters = await db
    .select()
    .from(chaptersTable)
    .where(eq(chaptersTable.courseId, c.id))
    .orderBy(asc(chaptersTable.position));

  const lessonsByChapter = new Map<string, (typeof lessonsTable.$inferSelect)[]>();
  if (chapters.length) {
    const allLessons = await db
      .select()
      .from(lessonsTable)
      .where(
        inArray(
          lessonsTable.chapterId,
          chapters.map((ch) => ch.id),
        ),
      )
      .orderBy(asc(lessonsTable.position));
    for (const l of allLessons) {
      const arr = lessonsByChapter.get(l.chapterId) ?? [];
      arr.push(l);
      lessonsByChapter.set(l.chapterId, arr);
    }
  }

  const completed = await db
    .select({ id: lessonProgressTable.lessonId })
    .from(lessonProgressTable)
    .innerJoin(lessonsTable, eq(lessonsTable.id, lessonProgressTable.lessonId))
    .innerJoin(chaptersTable, eq(chaptersTable.id, lessonsTable.chapterId))
    .where(
      and(
        eq(chaptersTable.courseId, c.id),
        eq(lessonProgressTable.userId, ar.userId),
        eq(lessonProgressTable.completed, true),
      ),
    );

  res.json({
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    description: c.description,
    coverImageUrl: c.coverImageUrl,
    published: c.published,
    createdAt: c.createdAt.toISOString(),
    chapters: chapters.map((ch) => ({
      id: ch.id,
      courseId: ch.courseId,
      title: ch.title,
      position: ch.position,
      lessons: (lessonsByChapter.get(ch.id) ?? []).map((l) => ({
        id: l.id,
        chapterId: l.chapterId,
        title: l.title,
        position: l.position,
        lessonType: l.lessonType,
        videoUrl: l.videoUrl,
        durationMinutes: l.durationMinutes,
        published: l.published,
      })),
    })),
    completedLessonIds: completed.map((c) => c.id),
  });
});

router.patch(
  "/courses/:courseId",
  requireRole(["super_admin", "admin"]),
  async (req, res: Response) => {
    const body = UpdateCourseBody.parse(req.body);
    const [c] = await db
      .update(coursesTable)
      .set({
        title: body.title ?? undefined,
        subtitle: body.subtitle ?? undefined,
        description: body.description ?? undefined,
        coverImageUrl: body.coverImageUrl ?? undefined,
        published: body.published ?? undefined,
      })
      .where(eq(coursesTable.id, req.params.courseId!))
      .returning();
    res.json({
      id: c!.id,
      title: c!.title,
      subtitle: c!.subtitle,
      description: c!.description,
      coverImageUrl: c!.coverImageUrl,
      published: c!.published,
      createdAt: c!.createdAt.toISOString(),
    });
  },
);

router.delete(
  "/courses/:courseId",
  requireRole(["super_admin", "admin"]),
  async (req, res: Response) => {
    await db.delete(coursesTable).where(eq(coursesTable.id, req.params.courseId!));
    res.status(204).end();
  },
);

router.post(
  "/courses/:courseId/chapters",
  requireRole(["super_admin", "admin"]),
  async (req, res: Response) => {
    const body = CreateChapterBody.parse(req.body);
    const max = await db
      .select({ m: sql<number>`coalesce(max(${chaptersTable.position}), -1)::int` })
      .from(chaptersTable)
      .where(eq(chaptersTable.courseId, req.params.courseId!));
    const [ch] = await db
      .insert(chaptersTable)
      .values({
        courseId: req.params.courseId!,
        title: body.title,
        position: Number(max[0]?.m ?? -1) + 1,
      })
      .returning();
    res.status(201).json({
      id: ch!.id,
      courseId: ch!.courseId,
      title: ch!.title,
      position: ch!.position,
    });
  },
);

router.patch(
  "/chapters/:chapterId",
  requireRole(["super_admin", "admin"]),
  async (req, res: Response) => {
    const body = UpdateChapterBody.parse(req.body);
    const [ch] = await db
      .update(chaptersTable)
      .set({
        title: body.title ?? undefined,
        position: body.position ?? undefined,
      })
      .where(eq(chaptersTable.id, req.params.chapterId!))
      .returning();
    res.json({
      id: ch!.id,
      courseId: ch!.courseId,
      title: ch!.title,
      position: ch!.position,
    });
  },
);

router.delete(
  "/chapters/:chapterId",
  requireRole(["super_admin", "admin"]),
  async (req, res: Response) => {
    await db.delete(chaptersTable).where(eq(chaptersTable.id, req.params.chapterId!));
    res.status(204).end();
  },
);

export default router;
