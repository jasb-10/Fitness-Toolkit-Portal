import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  coursesTable,
  chaptersTable,
  lessonsTable,
  lessonProgressTable,
  courseAccessTable,
  dfyProjectsTable,
  activityTable,
  billingTable,
} from "@workspace/db";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import {
  AdminCreateUserBody,
  AdminUpdateUserBody,
  AdminSetUserAccessBody,
  AdminInviteTeamMemberBody,
} from "@workspace/api-zod";
import {
  requireAuth,
  requireRole,
  type AuthedRequest,
} from "../middlewares/auth";
import { sendEmail, newMemberEmail, getPortalUrl } from "../lib/email";
import { summarizeActivity } from "../lib/activity";
import {
  getCompanySettings,
  updateCompanySettings,
} from "../lib/companySettings";
import { isStripeConfigured } from "../lib/stripe";

const router: IRouter = Router();

router.use(requireAuth);
router.use(
  "/admin",
  requireRole(["super_admin", "admin", "team"]),
);

function serUser(u: typeof usersTable.$inferSelect) {
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

router.get("/admin/users", async (_req, res: Response) => {
  const users = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));

  // Compute stats per user
  const totalLessonsAgg = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(lessonsTable);
  const totalLessons = Number(totalLessonsAgg[0]?.count ?? 0);

  const result = await Promise.all(
    users.map(async (u) => {
      const completed = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(lessonProgressTable)
        .where(
          and(
            eq(lessonProgressTable.userId, u.id),
            eq(lessonProgressTable.completed, true),
          ),
        );
      const enrolled = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(courseAccessTable)
        .where(eq(courseAccessTable.userId, u.id));
      const lc = Number(completed[0]?.count ?? 0);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
        completionPct: totalLessons > 0 ? (lc / totalLessons) * 100 : 0,
        lessonsCompleted: lc,
        coursesEnrolled: Number(enrolled[0]?.count ?? 0),
      };
    }),
  );
  res.json(result);
});

router.post(
  "/admin/users",
  requireRole(["super_admin", "admin"]),
  async (req, res: Response) => {
    const body = AdminCreateUserBody.parse(req.body);
    const [created] = await db
      .insert(usersTable)
      .values({
        email: body.email,
        name: body.name,
        role: body.role ?? "student",
      })
      .returning();
    if (created) {
      const tpl = newMemberEmail({
        name: created.name,
        email: created.email,
        role: created.role,
        portalUrl: getPortalUrl(),
      });
      void sendEmail({ to: created.email, ...tpl }).catch(() => {});
    }
    res.status(201).json(serUser(created!));
  },
);

router.get("/admin/users/:userId", async (req, res: Response) => {
  const [u] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.params.userId!));
  if (!u) return res.status(404).json({ error: "Not found" });

  const courses = await db.select().from(coursesTable);
  const access = await db
    .select()
    .from(courseAccessTable)
    .where(eq(courseAccessTable.userId, u.id));
  const accessSet = new Set(access.map((a) => a.courseId));

  const courseAccess = await Promise.all(
    courses.map(async (c) => {
      const totals = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(lessonsTable)
        .innerJoin(chaptersTable, eq(chaptersTable.id, lessonsTable.chapterId))
        .where(eq(chaptersTable.courseId, c.id));
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
            eq(lessonProgressTable.userId, u.id),
            eq(lessonProgressTable.completed, true),
          ),
        );
      return {
        courseId: c.id,
        courseTitle: c.title,
        hasAccess: accessSet.has(c.id),
        completedLessons: Number(done[0]?.count ?? 0),
        totalLessons: Number(totals[0]?.count ?? 0),
      };
    }),
  );

  const recent = await db
    .select()
    .from(activityTable)
    .where(eq(activityTable.userId, u.id))
    .orderBy(desc(activityTable.createdAt))
    .limit(20);

  const totalLessonsAgg = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(lessonsTable);
  const completedAgg = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(lessonProgressTable)
    .where(
      and(
        eq(lessonProgressTable.userId, u.id),
        eq(lessonProgressTable.completed, true),
      ),
    );
  const totalLessons = Number(totalLessonsAgg[0]?.count ?? 0);
  const completedLessons = Number(completedAgg[0]?.count ?? 0);

  const summary = await summarizeActivity(u.id);

  res.json({
    user: serUser(u),
    courseAccess,
    recentActivity: recent.map((a) => ({
      id: a.id,
      action: a.action,
      target: a.target,
      path: a.path ?? null,
      metadata: a.metadata ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
    completionPct:
      totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
    totalLessons,
    completedLessons,
    activitySummary: summary,
  });
});

router.get(
  "/admin/users/:userId/activity",
  async (req, res: Response) => {
    const userId = req.params.userId!;
    const limit = Math.min(
      Math.max(Number.parseInt(String(req.query.limit ?? "50"), 10) || 50, 1),
      200,
    );
    const offset = Math.max(
      Number.parseInt(String(req.query.offset ?? "0"), 10) || 0,
      0,
    );
    const action =
      typeof req.query.action === "string" && req.query.action !== "all"
        ? req.query.action
        : null;

    const where = action
      ? and(eq(activityTable.userId, userId), eq(activityTable.action, action))
      : eq(activityTable.userId, userId);

    const rows = await db
      .select()
      .from(activityTable)
      .where(where)
      .orderBy(desc(activityTable.createdAt))
      .limit(limit)
      .offset(offset);

    const totalRow = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(activityTable)
      .where(where);

    res.json({
      total: Number(totalRow[0]?.count ?? 0),
      items: rows.map((a) => ({
        id: a.id,
        action: a.action,
        target: a.target,
        path: a.path ?? null,
        metadata: (a.metadata as Record<string, unknown>) ?? null,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  },
);

router.patch(
  "/admin/users/:userId",
  requireRole(["super_admin", "admin"]),
  async (req, res: Response) => {
    const ar = req as AuthedRequest;
    const body = AdminUpdateUserBody.parse(req.body);
    if (body.role === "super_admin" && ar.userRole !== "super_admin") {
      return res
        .status(403)
        .json({ error: "Only super admin can grant super admin role" });
    }
    const [u] = await db
      .update(usersTable)
      .set({
        name: body.name ?? undefined,
        email: body.email ?? undefined,
        role: body.role ?? undefined,
      })
      .where(eq(usersTable.id, req.params.userId!))
      .returning();
    res.json(serUser(u!));
  },
);

router.delete(
  "/admin/users/:userId",
  requireRole(["super_admin"]),
  async (req, res: Response) => {
    await db.delete(usersTable).where(eq(usersTable.id, req.params.userId!));
    res.status(204).end();
  },
);

router.post(
  "/admin/users/:userId/reset-password",
  requireRole(["super_admin", "admin"]),
  async (req, res: Response) => {
    const [u] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.params.userId!));
    if (!u) return res.status(404).json({ error: "Not found" });
    let resetUrl = "";
    let message = "Send the user the reset link below.";
    try {
      if (u.clerkId) {
        const ticket = await clerkClient.signInTokens.createSignInToken({
          userId: u.clerkId,
          expiresInSeconds: 60 * 60 * 24,
        });
        resetUrl = ticket.url;
        message = "One-time sign-in link generated. Share with the user.";
      } else {
        message =
          "User has not signed in yet — invite them via the team flow first.";
      }
    } catch (err) {
      req.log?.error({ err }, "reset password failed");
      message = "Could not generate link automatically.";
    }
    res.json({ resetUrl, message });
  },
);

router.put(
  "/admin/users/:userId/access",
  requireRole(["super_admin", "admin"]),
  async (req, res: Response) => {
    const body = AdminSetUserAccessBody.parse(req.body);
    const userId = req.params.userId!;
    await db.delete(courseAccessTable).where(eq(courseAccessTable.userId, userId));
    if (body.courseIds.length) {
      await db
        .insert(courseAccessTable)
        .values(body.courseIds.map((cid) => ({ userId, courseId: cid })));
    }
    const courses = await db.select().from(coursesTable);
    const accessSet = new Set(body.courseIds);
    const result = await Promise.all(
      courses.map(async (c) => {
        const totals = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(lessonsTable)
          .innerJoin(chaptersTable, eq(chaptersTable.id, lessonsTable.chapterId))
          .where(eq(chaptersTable.courseId, c.id));
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
              eq(lessonProgressTable.userId, userId),
              eq(lessonProgressTable.completed, true),
            ),
          );
        return {
          courseId: c.id,
          courseTitle: c.title,
          hasAccess: accessSet.has(c.id),
          completedLessons: Number(done[0]?.count ?? 0),
          totalLessons: Number(totals[0]?.count ?? 0),
        };
      }),
    );
    res.json(result);
  },
);

router.get("/admin/team", async (_req, res: Response) => {
  const team = await db
    .select()
    .from(usersTable)
    .where(ne(usersTable.role, "student"))
    .orderBy(desc(usersTable.createdAt));
  res.json(team.map(serUser));
});

router.post(
  "/admin/team",
  requireRole(["super_admin", "admin"]),
  async (req, res: Response) => {
    const ar = req as AuthedRequest;
    const body = AdminInviteTeamMemberBody.parse(req.body);
    if (body.role === "super_admin" && ar.userRole !== "super_admin") {
      return res
        .status(403)
        .json({ error: "Only super admin can invite super admins" });
    }
    const [created] = await db
      .insert(usersTable)
      .values({
        email: body.email,
        name: body.name,
        role: body.role,
      })
      .onConflictDoNothing()
      .returning();
    if (!created) {
      const [existing] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, body.email));
      return res.status(201).json(serUser(existing!));
    }
    res.status(201).json(serUser(created));
  },
);

router.get("/admin/stats", async (_req, res: Response) => {
  const totalUsers = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(usersTable);
  const totalCourses = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(coursesTable);
  const totalLessons = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(lessonsTable);
  const activeProjects = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(dfyProjectsTable)
    .where(ne(dfyProjectsTable.status, "delivered"));

  // Avg completion across users with progress
  const userCompletion = await db
    .select({
      userId: lessonProgressTable.userId,
      done: sql<number>`sum(case when ${lessonProgressTable.completed} then 1 else 0 end)::int`,
    })
    .from(lessonProgressTable)
    .groupBy(lessonProgressTable.userId);
  const total = Number(totalLessons[0]?.c ?? 0);
  const avgCompletionPct =
    total > 0 && userCompletion.length > 0
      ? userCompletion.reduce((acc, u) => acc + Number(u.done) / total, 0) /
        userCompletion.length *
        100
      : 0;

  const recentSignups = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt))
    .limit(5);

  res.json({
    totalUsers: Number(totalUsers[0]?.c ?? 0),
    totalCourses: Number(totalCourses[0]?.c ?? 0),
    totalLessons: total,
    activeProjects: Number(activeProjects[0]?.c ?? 0),
    avgCompletionPct,
    recentSignups: recentSignups.map(serUser),
  });
});

router.put(
  "/admin/users/:userId/stripe-customer",
  requireRole(["super_admin", "admin"]),
  async (req, res: Response) => {
    const userId = req.params.userId!;
    const raw = (req.body ?? {}) as { stripeCustomerId?: unknown };
    const next =
      typeof raw.stripeCustomerId === "string" && raw.stripeCustomerId.trim()
        ? raw.stripeCustomerId.trim()
        : null;
    const [existing] = await db
      .select()
      .from(billingTable)
      .where(eq(billingTable.userId, userId));
    if (!existing) {
      await db.insert(billingTable).values({
        userId,
        stripeCustomerId: next,
      });
    } else {
      await db
        .update(billingTable)
        .set({ stripeCustomerId: next })
        .where(eq(billingTable.userId, userId));
    }
    res.json({ stripeCustomerId: next });
  },
);

router.get("/admin/company", async (_req, res: Response) => {
  const settings = await getCompanySettings();
  res.json({ settings, stripeConfigured: isStripeConfigured() });
});

router.put("/admin/company", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  if (ar.userRole !== "super_admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const allowed = [
    "name",
    "legalName",
    "supportEmail",
    "website",
    "taxId",
    "logoUrl",
    "addressLine1",
    "addressLine2",
    "city",
    "region",
    "postalCode",
    "country",
    "invoiceFooter",
  ] as const;
  const patch: Record<string, string | null> = {};
  for (const k of allowed) {
    if (k in body) {
      const v = body[k];
      patch[k] = typeof v === "string" && v.length > 0 ? v : null;
    }
  }
  const settings = await updateCompanySettings(patch);
  res.json({ settings, stripeConfigured: isStripeConfigured() });
});

export default router;
