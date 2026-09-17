import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  billingTable,
  invoicesTable,
  coursesTable,
  chaptersTable,
  lessonsTable,
  lessonProgressTable,
  dfyProjectsTable,
  productEntitlementsTable,
} from "@workspace/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  UpdateMeBody,
  UpdateBillingBody,
} from "@workspace/api-zod";
import {
  requireAuth,
  type AuthedRequest,
} from "../middlewares/auth";
import {
  getAccessibleCourseIds,
  getProgressSummary,
} from "../lib/queries";

const router: IRouter = Router();

router.use(requireAuth);

function serializeUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
  };
}

router.get("/me", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  const [u] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, ar.userId));
  if (!u) return res.status(404).json({ error: "Not found" });
  const summary = await getProgressSummary(ar.userId, ar.userRole);
  const entitlements = await db
    .select({ productCode: productEntitlementsTable.productCode })
    .from(productEntitlementsTable)
    .where(
      and(
        eq(productEntitlementsTable.userId, ar.userId),
        eq(productEntitlementsTable.status, "active"),
      ),
    );
  res.json({
    user: serializeUser(u),
    entitlements: entitlements.map((item) => item.productCode),
    totalLessons: summary.totalLessons,
    completedLessons: summary.completedLessons,
  });
});

router.patch("/me", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  const body = UpdateMeBody.parse(req.body);
  const [updated] = await db
    .update(usersTable)
    .set({
      name: body.name ?? undefined,
      avatarUrl: body.avatarUrl ?? undefined,
      bio: body.bio ?? undefined,
    })
    .where(eq(usersTable.id, ar.userId))
    .returning();
  res.json(serializeUser(updated!));
});

async function ensureBilling(userId: string) {
  const existing = await db
    .select()
    .from(billingTable)
    .where(eq(billingTable.userId, userId));
  if (existing[0]) return existing[0];
  const [created] = await db
    .insert(billingTable)
    .values({ userId })
    .returning();
  return created!;
}

router.get("/me/billing", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  const b = await ensureBilling(ar.userId);
  const inv = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.userId, ar.userId))
    .orderBy(desc(invoicesTable.date));
  res.json({
    plan: b.plan,
    status: b.status,
    billingEmail: b.billingEmail,
    company: b.company,
    addressLine1: b.addressLine1,
    addressLine2: b.addressLine2,
    city: b.city,
    region: b.region,
    postalCode: b.postalCode,
    country: b.country,
    nextInvoiceDate: b.nextInvoiceDate ? b.nextInvoiceDate.toISOString() : null,
    invoices: inv.map((i) => ({
      id: i.id,
      date: i.date.toISOString(),
      amount: String(i.amount),
      status: i.status,
      description: i.description,
    })),
  });
});

router.patch("/me/billing", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  await ensureBilling(ar.userId);
  const body = UpdateBillingBody.parse(req.body);
  await db
    .update(billingTable)
    .set({
      billingEmail: body.billingEmail ?? null,
      company: body.company ?? null,
      addressLine1: body.addressLine1 ?? null,
      addressLine2: body.addressLine2 ?? null,
      city: body.city ?? null,
      region: body.region ?? null,
      postalCode: body.postalCode ?? null,
      country: body.country ?? null,
    })
    .where(eq(billingTable.userId, ar.userId));
  // Echo
  return router.handle(
    Object.assign(req, { method: "GET", url: "/me/billing" }) as never,
    res,
    () => {},
  );
});

router.get("/dashboard", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  const accessible = await getAccessibleCourseIds(ar.userId, ar.userRole);
  const courses = accessible.length
    ? await db
        .select()
        .from(coursesTable)
        .where(inArray(coursesTable.id, accessible))
    : [];

  const courseProgress = await Promise.all(
    courses.map(async (c) => {
      const totals = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(lessonsTable)
        .innerJoin(chaptersTable, eq(chaptersTable.id, lessonsTable.chapterId))
        .where(
          and(
            eq(chaptersTable.courseId, c.id),
            eq(lessonsTable.published, true),
          ),
        );
      const done = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(lessonProgressTable)
        .innerJoin(
          lessonsTable,
          eq(lessonsTable.id, lessonProgressTable.lessonId),
        )
        .innerJoin(chaptersTable, eq(chaptersTable.id, lessonsTable.chapterId))
        .where(
          and(
            eq(chaptersTable.courseId, c.id),
            eq(lessonProgressTable.userId, ar.userId),
            eq(lessonProgressTable.completed, true),
          ),
        );
      const total = Number(totals[0]?.count ?? 0);
      const completed = Number(done[0]?.count ?? 0);
      return {
        id: c.id,
        title: c.title,
        coverImageUrl: c.coverImageUrl,
        completedLessons: completed,
        totalLessons: total,
        completionPct: total > 0 ? (completed / total) * 100 : 0,
      };
    }),
  );

  const recent = await db
    .select({
      lessonId: lessonsTable.id,
      lessonTitle: lessonsTable.title,
      courseId: coursesTable.id,
      courseTitle: coursesTable.title,
      lastAccessedAt: lessonProgressTable.lastAccessedAt,
    })
    .from(lessonProgressTable)
    .innerJoin(lessonsTable, eq(lessonsTable.id, lessonProgressTable.lessonId))
    .innerJoin(chaptersTable, eq(chaptersTable.id, lessonsTable.chapterId))
    .innerJoin(coursesTable, eq(coursesTable.id, chaptersTable.courseId))
    .where(eq(lessonProgressTable.userId, ar.userId))
    .orderBy(desc(lessonProgressTable.lastAccessedAt))
    .limit(5);

  const projects = await db
    .select()
    .from(dfyProjectsTable)
    .where(eq(dfyProjectsTable.clientUserId, ar.userId))
    .orderBy(desc(dfyProjectsTable.createdAt));

  const summary = await getProgressSummary(ar.userId, ar.userRole);
  const totalDuration = await db
    .select({
      sum: sql<number>`coalesce(sum(${lessonsTable.durationMinutes}), 0)::int`,
    })
    .from(lessonProgressTable)
    .innerJoin(lessonsTable, eq(lessonsTable.id, lessonProgressTable.lessonId))
    .where(
      and(
        eq(lessonProgressTable.userId, ar.userId),
        eq(lessonProgressTable.completed, true),
      ),
    );

  res.json({
    welcomeVideoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    welcomeMessage:
      "Welcome to your portal. Take your time, complete the lessons in order, and reach out anytime through your project portal if you need a hand.",
    courses: courseProgress,
    recentLessons: recent.map((r) => ({
      lessonId: r.lessonId,
      lessonTitle: r.lessonTitle,
      courseId: r.courseId,
      courseTitle: r.courseTitle,
      lastAccessedAt: r.lastAccessedAt.toISOString(),
    })),
    activeProjects: projects.map((p) => ({
      id: p.id,
      clientUserId: p.clientUserId,
      clientName: "",
      title: p.title,
      description: p.description,
      status: p.status,
      progressPct: p.progressPct,
      nextMilestone: p.nextMilestone,
      nextMilestoneDate: p.nextMilestoneDate
        ? p.nextMilestoneDate.toISOString()
        : null,
      createdAt: p.createdAt.toISOString(),
    })),
    stats: {
      totalLessons: summary.totalLessons,
      completedLessons: summary.completedLessons,
      completionPct:
        summary.totalLessons > 0
          ? (summary.completedLessons / summary.totalLessons) * 100
          : 0,
      streakDays: 3,
      hoursWatched:
        Math.round((Number(totalDuration[0]?.sum ?? 0) / 60) * 10) / 10,
    },
  });
});

export default router;
