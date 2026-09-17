import { db } from "@workspace/db";
import {
  coursesTable,
  chaptersTable,
  lessonsTable,
  lessonProgressTable,
  courseAccessTable,
} from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";

export async function getAccessibleCourseIds(
  userId: string,
  role: string,
): Promise<string[]> {
  if (role === "super_admin" || role === "admin" || role === "team") {
    const all = await db.select({ id: coursesTable.id }).from(coursesTable);
    return all.map((c) => c.id);
  }
  const rows = await db
    .select({ id: courseAccessTable.courseId })
    .from(courseAccessTable)
    .where(eq(courseAccessTable.userId, userId));
  return rows.map((r) => r.id);
}

export async function getProgressSummary(userId: string, role: string) {
  const accessible = await getAccessibleCourseIds(userId, role);
  if (accessible.length === 0) {
    return { totalLessons: 0, completedLessons: 0 };
  }
  const totals = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(lessonsTable)
    .innerJoin(chaptersTable, eq(chaptersTable.id, lessonsTable.chapterId))
    .where(
      and(
        inArray(chaptersTable.courseId, accessible),
        eq(lessonsTable.published, true),
      ),
    );
  const completed = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(lessonProgressTable)
    .innerJoin(lessonsTable, eq(lessonsTable.id, lessonProgressTable.lessonId))
    .innerJoin(chaptersTable, eq(chaptersTable.id, lessonsTable.chapterId))
    .where(
      and(
        eq(lessonProgressTable.userId, userId),
        eq(lessonProgressTable.completed, true),
        inArray(chaptersTable.courseId, accessible),
      ),
    );
  return {
    totalLessons: Number(totals[0]?.count ?? 0),
    completedLessons: Number(completed[0]?.count ?? 0),
  };
}
