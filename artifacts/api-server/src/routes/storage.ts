import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { db, projectAssetsTable, websiteProjectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isStaffRole, requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();
const requestUploadUrlBody = z.object({
  name: z.string().min(1),
  size: z.number().int().positive(),
  contentType: z.string().min(1),
  projectId: z.string().uuid().optional(),
});

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 */
router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  const parsed = requestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
     const { name, size, contentType, projectId } = parsed.data;
     const ar = req as AuthedRequest;
     if (!projectId) {
       res.status(400).json({ error: "projectId is required for customer assets" });
       return;
     }
     if (size > 25 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp", "image/svg+xml"].includes(contentType)) {
       res.status(400).json({ error: "Only image files up to 25 MB are allowed" });
       return;
     }
     const [project] = await db.select({ id: websiteProjectsTable.id, userId: websiteProjectsTable.userId })
       .from(websiteProjectsTable)
       .where(eq(websiteProjectsTable.id, projectId))
       .limit(1);
     if (!project || (project.userId !== ar.userId && !isStaffRole(ar.userRole))) {
       res.status(404).json({ error: "Website project not found" });
       return;
     }

    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
     res.json({ uploadURL, objectPath, metadata: { name, size, contentType, projectId } });
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get("/storage/objects/*path", requireAuth, async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
     const ar = req as AuthedRequest;
     const [asset] = await db.select({ userId: projectAssetsTable.userId })
       .from(projectAssetsTable)
       .where(eq(projectAssetsTable.objectPath, objectPath))
       .limit(1);
     if (!asset) {
       res.status(404).json({ error: "Asset not registered" });
       return;
     }
     if (asset.userId !== ar.userId && !isStaffRole(ar.userRole)) {
       res.status(403).json({ error: "Forbidden" });
       return;
     }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
