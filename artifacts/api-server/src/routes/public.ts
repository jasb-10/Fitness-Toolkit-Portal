import { Router, type IRouter, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/public/needs-bootstrap", async (_req, res: Response) => {
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.role, "super_admin"))
    .limit(1);
  res.json({ needsBootstrap: existing.length === 0 });
});

export default router;
