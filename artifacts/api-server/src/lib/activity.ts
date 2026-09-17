import { db } from "@workspace/db";
import {
  activityTable,
  lessonsTable,
  chaptersTable,
  lessonProgressTable,
  coursesTable,
  refundRequestsTable,
} from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";

export type ActivityAction =
  // Server-emitted
  | "logged_in"
  | "viewed_lesson"
  | "completed_lesson"
  | "requested_refund"
  | "course_access_granted"
  | "course_access_revoked"
  // Client-emitted
  | "viewed_page"
  | "downloaded_attachment"
  | "opened_link"
  | "started_video"
  | "video_progress"
  | "completed_video"
  | "opened_support_chat"
  | "downloaded_invoice";

export const CLIENT_ALLOWED_ACTIONS: ReadonlyArray<ActivityAction> = [
  "viewed_page",
  "downloaded_attachment",
  "opened_link",
  "started_video",
  "video_progress",
  "completed_video",
  "opened_support_chat",
  "downloaded_invoice",
];

export interface RecordActivityInput {
  userId: string;
  action: ActivityAction | string;
  target: string;
  path?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function recordActivity(input: RecordActivityInput): Promise<void> {
  try {
    await db.insert(activityTable).values({
      userId: input.userId,
      action: input.action,
      target: input.target.slice(0, 500),
      path: input.path?.slice(0, 500) ?? null,
      metadata: input.metadata ?? null,
    });
  } catch {
    // Activity logging never fails the host request.
  }
}

export interface ActivitySummary {
  totalEvents: number;
  lessonsCompleted: number;
  totalLessons: number;
  completionPct: number;
  furthestChapter: { courseTitle: string; chapterTitle: string; chapterIndex: number } | null;
  lastSeenAt: string | null;
  firstSeenAt: string | null;
  refundRequests: number;
  recentActions: Array<{ action: string; target: string; at: string }>;
  downloads: number;
  videoCompletions: number;
}

export async function summarizeActivity(userId: string): Promise<ActivitySummary> {
  const totalRow = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(activityTable)
    .where(eq(activityTable.userId, userId));
  const totalEvents = Number(totalRow[0]?.count ?? 0);

  const totalLessonsRow = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(lessonsTable);
  const totalLessons = Number(totalLessonsRow[0]?.count ?? 0);

  const completedLessonsRow = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(lessonProgressTable)
    .where(
      and(
        eq(lessonProgressTable.userId, userId),
        eq(lessonProgressTable.completed, true),
      ),
    );
  const lessonsCompleted = Number(completedLessonsRow[0]?.count ?? 0);

  // Furthest chapter — the chapter of the most recently completed lesson.
  // This naturally scopes to the user's currently active course rather than
  // mixing positions across all enrolled courses.
  const furthestRow = await db
    .select({
      courseTitle: coursesTable.title,
      chapterTitle: chaptersTable.title,
      chapterPosition: chaptersTable.position,
    })
    .from(lessonProgressTable)
    .innerJoin(lessonsTable, eq(lessonsTable.id, lessonProgressTable.lessonId))
    .innerJoin(chaptersTable, eq(chaptersTable.id, lessonsTable.chapterId))
    .innerJoin(coursesTable, eq(coursesTable.id, chaptersTable.courseId))
    .where(
      and(
        eq(lessonProgressTable.userId, userId),
        eq(lessonProgressTable.completed, true),
      ),
    )
    .orderBy(desc(lessonProgressTable.completedAt), desc(chaptersTable.position))
    .limit(1);

  const furthest = furthestRow[0]
    ? {
        courseTitle: furthestRow[0].courseTitle,
        chapterTitle: furthestRow[0].chapterTitle,
        chapterIndex: furthestRow[0].chapterPosition + 1,
      }
    : null;

  const firstLast = await db
    .select({
      first: sql<string | null>`min(${activityTable.createdAt})`,
      last: sql<string | null>`max(${activityTable.createdAt})`,
    })
    .from(activityTable)
    .where(eq(activityTable.userId, userId));
  const toIso = (v: string | Date | null | undefined): string | null => {
    if (!v) return null;
    return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
  };
  const firstSeenIso = toIso(firstLast[0]?.first ?? null);
  const lastSeenIso = toIso(firstLast[0]?.last ?? null);

  const refundsRow = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(refundRequestsTable)
    .where(eq(refundRequestsTable.userId, userId));
  const refundRequests = Number(refundsRow[0]?.count ?? 0);

  const downloadsRow = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(activityTable)
    .where(
      and(
        eq(activityTable.userId, userId),
        eq(activityTable.action, "downloaded_attachment"),
      ),
    );
  const downloads = Number(downloadsRow[0]?.count ?? 0);

  const videoDoneRow = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(activityTable)
    .where(
      and(
        eq(activityTable.userId, userId),
        eq(activityTable.action, "completed_video"),
      ),
    );
  const videoCompletions = Number(videoDoneRow[0]?.count ?? 0);

  const recent = await db
    .select({
      action: activityTable.action,
      target: activityTable.target,
      createdAt: activityTable.createdAt,
    })
    .from(activityTable)
    .where(eq(activityTable.userId, userId))
    .orderBy(desc(activityTable.createdAt))
    .limit(15);

  return {
    totalEvents,
    lessonsCompleted,
    totalLessons,
    completionPct: totalLessons
      ? Math.round((lessonsCompleted / totalLessons) * 100)
      : 0,
    furthestChapter: furthest,
    lastSeenAt: lastSeenIso,
    firstSeenAt: firstSeenIso,
    refundRequests,
    downloads,
    videoCompletions,
    recentActions: recent.map((r) => ({
      action: r.action,
      target: r.target,
      at: r.createdAt.toISOString(),
    })),
  };
}

export function summaryToPromptText(summary: ActivitySummary): string {
  const lines = [
    `Lessons completed: ${summary.lessonsCompleted} / ${summary.totalLessons} (${summary.completionPct}%).`,
    summary.furthestChapter
      ? `Furthest reached: chapter ${summary.furthestChapter.chapterIndex} ("${summary.furthestChapter.chapterTitle}") of "${summary.furthestChapter.courseTitle}".`
      : "Has not completed any lessons yet.",
    `Total tracked events: ${summary.totalEvents}. Resource downloads: ${summary.downloads}. Videos finished: ${summary.videoCompletions}.`,
    summary.refundRequests > 0
      ? `Has previously opened ${summary.refundRequests} refund request(s).`
      : "No prior refund requests.",
    summary.firstSeenAt && summary.lastSeenAt
      ? `Active from ${summary.firstSeenAt} to ${summary.lastSeenAt}.`
      : "",
  ].filter(Boolean);
  return lines.join("\n");
}
