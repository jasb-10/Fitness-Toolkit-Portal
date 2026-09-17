import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import {
  dfyProjectsTable,
  dfyProjectUpdatesTable,
  dfyMilestonesTable,
  usersTable,
} from "@workspace/db";
import { asc, desc, eq } from "drizzle-orm";
import {
  CreateProjectBody,
  UpdateProjectBody,
  AddProjectUpdateBody,
  AddProjectMilestoneBody as CreateMilestoneBody,
  UpdateProjectMilestoneBody as UpdateMilestoneBody,
} from "@workspace/api-zod";
import {
  requireAuth,
  requireRole,
  type AuthedRequest,
} from "../middlewares/auth";

const router: IRouter = Router();

router.use(requireAuth);

function isStaff(role: string) {
  return role === "super_admin" || role === "admin" || role === "team";
}

router.get("/dfy/projects", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  const projects = isStaff(ar.userRole)
    ? await db
        .select({
          p: dfyProjectsTable,
          clientName: usersTable.name,
        })
        .from(dfyProjectsTable)
        .leftJoin(usersTable, eq(usersTable.id, dfyProjectsTable.clientUserId))
        .orderBy(desc(dfyProjectsTable.createdAt))
    : await db
        .select({
          p: dfyProjectsTable,
          clientName: usersTable.name,
        })
        .from(dfyProjectsTable)
        .leftJoin(usersTable, eq(usersTable.id, dfyProjectsTable.clientUserId))
        .where(eq(dfyProjectsTable.clientUserId, ar.userId))
        .orderBy(desc(dfyProjectsTable.createdAt));

  res.json(
    projects.map(({ p, clientName }) => ({
      id: p.id,
      clientUserId: p.clientUserId,
      clientName: clientName ?? "",
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
  );
});

router.post(
  "/dfy/projects",
  requireRole(["super_admin", "admin", "team"]),
  async (req, res: Response) => {
    const body = CreateProjectBody.parse(req.body);
    const [p] = await db
      .insert(dfyProjectsTable)
      .values({
        title: body.title,
        description: body.description ?? null,
        clientUserId: body.clientUserId,
        status: body.status ?? "in_progress",
      })
      .returning();
    const [client] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, p!.clientUserId));
    res.status(201).json({
      id: p!.id,
      clientUserId: p!.clientUserId,
      clientName: client?.name ?? "",
      title: p!.title,
      description: p!.description,
      status: p!.status,
      progressPct: p!.progressPct,
      nextMilestone: p!.nextMilestone,
      nextMilestoneDate: p!.nextMilestoneDate
        ? p!.nextMilestoneDate.toISOString()
        : null,
      createdAt: p!.createdAt.toISOString(),
    });
  },
);

router.get("/dfy/projects/:projectId", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  const [row] = await db
    .select({ p: dfyProjectsTable, clientName: usersTable.name })
    .from(dfyProjectsTable)
    .leftJoin(usersTable, eq(usersTable.id, dfyProjectsTable.clientUserId))
    .where(eq(dfyProjectsTable.id, req.params.projectId!));
  if (!row) return res.status(404).json({ error: "Not found" });
  if (!isStaff(ar.userRole) && row.p.clientUserId !== ar.userId)
    return res.status(403).json({ error: "Forbidden" });

  const updates = await db
    .select({ u: dfyProjectUpdatesTable, name: usersTable.name })
    .from(dfyProjectUpdatesTable)
    .leftJoin(usersTable, eq(usersTable.id, dfyProjectUpdatesTable.authorUserId))
    .where(eq(dfyProjectUpdatesTable.projectId, row.p.id))
    .orderBy(desc(dfyProjectUpdatesTable.createdAt));
  const milestones = await db
    .select()
    .from(dfyMilestonesTable)
    .where(eq(dfyMilestonesTable.projectId, row.p.id))
    .orderBy(asc(dfyMilestonesTable.position));

  res.json({
    id: row.p.id,
    clientUserId: row.p.clientUserId,
    clientName: row.clientName ?? "",
    title: row.p.title,
    description: row.p.description,
    status: row.p.status,
    progressPct: row.p.progressPct,
    nextMilestone: row.p.nextMilestone,
    nextMilestoneDate: row.p.nextMilestoneDate
      ? row.p.nextMilestoneDate.toISOString()
      : null,
    createdAt: row.p.createdAt.toISOString(),
    updates: updates.map(({ u, name }) => ({
      id: u.id,
      projectId: u.projectId,
      authorName: name ?? "Team",
      body: u.body,
      createdAt: u.createdAt.toISOString(),
    })),
    milestones: milestones.map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      dueDate: m.dueDate ? m.dueDate.toISOString() : null,
    })),
  });
});

router.patch(
  "/dfy/projects/:projectId",
  requireRole(["super_admin", "admin", "team"]),
  async (req, res: Response) => {
    const body = UpdateProjectBody.parse(req.body);
    const [p] = await db
      .update(dfyProjectsTable)
      .set({
        title: body.title ?? undefined,
        description: body.description ?? undefined,
        status: body.status ?? undefined,
        progressPct: body.progressPct ?? undefined,
        nextMilestone: body.nextMilestone ?? undefined,
        nextMilestoneDate: body.nextMilestoneDate
          ? new Date(body.nextMilestoneDate)
          : undefined,
      })
      .where(eq(dfyProjectsTable.id, req.params.projectId!))
      .returning();
    const [client] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, p!.clientUserId));
    res.json({
      id: p!.id,
      clientUserId: p!.clientUserId,
      clientName: client?.name ?? "",
      title: p!.title,
      description: p!.description,
      status: p!.status,
      progressPct: p!.progressPct,
      nextMilestone: p!.nextMilestone,
      nextMilestoneDate: p!.nextMilestoneDate
        ? p!.nextMilestoneDate.toISOString()
        : null,
      createdAt: p!.createdAt.toISOString(),
    });
  },
);

router.post(
  "/dfy/projects/:projectId/updates",
  async (req, res: Response) => {
    const ar = req as AuthedRequest;
    const body = AddProjectUpdateBody.parse(req.body);
    const [p] = await db
      .select()
      .from(dfyProjectsTable)
      .where(eq(dfyProjectsTable.id, req.params.projectId!));
    if (!p) return res.status(404).json({ error: "Not found" });
    if (!isStaff(ar.userRole) && p.clientUserId !== ar.userId)
      return res.status(403).json({ error: "Forbidden" });

    const [u] = await db
      .insert(dfyProjectUpdatesTable)
      .values({
        projectId: p.id,
        authorUserId: ar.userId,
        body: body.body,
      })
      .returning();
    const [author] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, ar.userId));
    res.status(201).json({
      id: u!.id,
      projectId: u!.projectId,
      authorName: author?.name ?? "User",
      body: u!.body,
      createdAt: u!.createdAt.toISOString(),
    });
  },
);

router.post(
  "/dfy/projects/:projectId/milestones",
  requireRole(["super_admin", "admin", "team"]),
  async (req, res: Response) => {
    const body = CreateMilestoneBody.parse(req.body);
    const [project] = await db
      .select({ id: dfyProjectsTable.id })
      .from(dfyProjectsTable)
      .where(eq(dfyProjectsTable.id, req.params.projectId!));
    if (!project) return res.status(404).json({ error: "Project not found" });
    const existing = await db
      .select({ position: dfyMilestonesTable.position })
      .from(dfyMilestonesTable)
      .where(eq(dfyMilestonesTable.projectId, req.params.projectId!));
    const nextPos =
      existing.length === 0
        ? 0
        : Math.max(...existing.map((e) => e.position)) + 1;
    const [m] = await db
      .insert(dfyMilestonesTable)
      .values({
        projectId: req.params.projectId!,
        title: body.title,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        position: nextPos,
      })
      .returning();
    res.status(201).json({
      id: m!.id,
      title: m!.title,
      status: m!.status,
      dueDate: m!.dueDate ? m!.dueDate.toISOString() : null,
    });
  },
);

router.patch(
  "/dfy/milestones/:milestoneId",
  requireRole(["super_admin", "admin", "team"]),
  async (req, res: Response) => {
    const body = UpdateMilestoneBody.parse(req.body);
    const patch: Record<string, unknown> = {};
    if (body.title !== undefined) patch.title = body.title;
    if (body.status !== undefined) patch.status = body.status;
    if ("dueDate" in body) {
      patch.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }
    const [m] = await db
      .update(dfyMilestonesTable)
      .set(patch)
      .where(eq(dfyMilestonesTable.id, req.params.milestoneId!))
      .returning();
    if (!m) return res.status(404).json({ error: "Not found" });
    res.json({
      id: m.id,
      title: m.title,
      status: m.status,
      dueDate: m.dueDate ? m.dueDate.toISOString() : null,
    });
  },
);

router.delete(
  "/dfy/milestones/:milestoneId",
  requireRole(["super_admin", "admin", "team"]),
  async (req, res: Response) => {
    await db
      .delete(dfyMilestonesTable)
      .where(eq(dfyMilestonesTable.id, req.params.milestoneId!));
    res.status(204).end();
  },
);

export default router;
