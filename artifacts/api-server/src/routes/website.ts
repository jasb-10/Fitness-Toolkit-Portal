import { Router, type IRouter, type Response } from "express";
import { db, businessProfilesTable, websiteProjectsTable, projectAssetsTable } from "@workspace/db";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();
router.use(requireAuth);
const uuidParams = z.object({ projectId: z.string().uuid() });
const updateBusinessProfileBody = z.object({
  businessName: z.string().optional(), niche: z.string().optional(), location: z.string().optional(),
  service: z.string().optional(), audience: z.string().optional(), conversionGoal: z.string().optional(),
  destinationUrl: z.string().nullable().optional(), brandData: z.record(z.unknown()).optional(),
  evidenceData: z.record(z.unknown()).optional(),
});
const createWebsiteProjectBody = z.object({
  name: z.string().optional(), businessProfileId: z.string().uuid().nullable().optional(),
  briefData: z.record(z.unknown()).optional(),
});
const updateWebsiteProjectBody = createWebsiteProjectBody.extend({
  status: z.string().optional(), currentStage: z.string().optional(),
  styleData: z.record(z.unknown()).optional(),
  sections: z.array(z.record(z.unknown())).optional(),
  progressData: z.array(z.record(z.unknown())).optional(),
});
const registerProjectAssetBody = z.object({
  objectPath: z.string(), fileName: z.string(), contentType: z.string(),
  size: z.number().int().positive(), rightsStatus: z.string().optional(),
});

function date(value: Date) {
  return value.toISOString();
}

function serializeProfile(row: typeof businessProfilesTable.$inferSelect) {
  return { ...row, createdAt: date(row.createdAt), updatedAt: date(row.updatedAt) };
}

function serializeProject(row: typeof websiteProjectsTable.$inferSelect) {
  return { ...row, createdAt: date(row.createdAt), updatedAt: date(row.updatedAt) };
}

function serializeAsset(row: typeof projectAssetsTable.$inferSelect) {
  return { ...row, createdAt: date(row.createdAt) };
}

router.get("/business-profile", async (req, res: Response) => {
  const { userId } = req as unknown as AuthedRequest;
  let [profile] = await db.select().from(businessProfilesTable).where(eq(businessProfilesTable.userId, userId)).limit(1);
  if (!profile) {
    [profile] = await db.insert(businessProfilesTable).values({ userId }).returning();
  }
  return res.json(serializeProfile(profile));
});

router.put("/business-profile", async (req, res: Response) => {
  const { userId } = req as unknown as AuthedRequest;
  const body = updateBusinessProfileBody.parse(req.body);
  const [existing] = await db.select().from(businessProfilesTable).where(eq(businessProfilesTable.userId, userId)).limit(1);
  const values = {
    ...body,
    updatedAt: new Date(),
  };
  const [profile] = existing
    ? await db.update(businessProfilesTable).set(values).where(eq(businessProfilesTable.id, existing.id)).returning()
    : await db.insert(businessProfilesTable).values({ userId, ...values }).returning();
  return res.json(serializeProfile(profile));
});

router.get("/website-projects", async (req, res: Response) => {
  const { userId } = req as unknown as AuthedRequest;
  const rows = await db.select().from(websiteProjectsTable).where(eq(websiteProjectsTable.userId, userId)).orderBy(desc(websiteProjectsTable.updatedAt));
  return res.json(rows.map(serializeProject));
});

router.post("/website-projects", async (req, res: Response) => {
  const { userId } = req as unknown as AuthedRequest;
  const body = createWebsiteProjectBody.parse(req.body ?? {});
  const [project] = await db.insert(websiteProjectsTable).values({
    userId,
    name: body.name ?? "My fitness website",
    businessProfileId: body.businessProfileId ?? null,
    briefData: body.briefData ?? {},
  }).returning();
  return res.status(201).json(serializeProject(project));
});

async function ownedProject(projectId: string, userId: string) {
  const [project] = await db.select().from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId))).limit(1);
  return project;
}

router.get("/website-projects/:projectId", async (req, res: Response) => {
  const { userId } = req as unknown as AuthedRequest;
  const { projectId } = uuidParams.parse(req.params);
  const project = await ownedProject(projectId, userId);
  if (!project) return res.status(404).json({ error: "Website project not found" });
  return res.json(serializeProject(project));
});

router.patch("/website-projects/:projectId", async (req, res: Response) => {
  const { userId } = req as unknown as AuthedRequest;
  const { projectId } = uuidParams.parse(req.params);
  const project = await ownedProject(projectId, userId);
  if (!project) return res.status(404).json({ error: "Website project not found" });
  const body = updateWebsiteProjectBody.parse(req.body);
  const [updated] = await db.update(websiteProjectsTable).set({ ...body, updatedAt: new Date() })
    .where(eq(websiteProjectsTable.id, projectId)).returning();
  return res.json(serializeProject(updated));
});

router.post("/website-projects/:projectId/assets", async (req, res: Response) => {
  const { userId } = req as unknown as AuthedRequest;
  const { projectId } = uuidParams.parse(req.params);
  const project = await ownedProject(projectId, userId);
  if (!project) return res.status(404).json({ error: "Website project not found" });
  const body = registerProjectAssetBody.parse(req.body);
  const [asset] = await db.insert(projectAssetsTable).values({
    projectId, userId, ...body,
  }).returning();
  return res.status(201).json(serializeAsset(asset));
});

export default router;