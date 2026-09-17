import type { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, productEntitlementsTable, usersTable } from "@workspace/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import { sendEmail, welcomeEmail, getPortalUrl } from "../lib/email";
import { recordActivity } from "../lib/activity";

export interface AuthedRequest extends Request {
  userId: string;
  userRole: "super_admin" | "admin" | "team" | "student";
  clerkUserId: string;
}

async function claimEmailEntitlements(userId: string, email: string) {
  if (!email || email.endsWith("@unknown.local")) return;
  try {
    await db
      .update(productEntitlementsTable)
      .set({ userId, updatedAt: new Date() })
      .where(
        and(
          isNull(productEntitlementsTable.userId),
          sql`lower(${productEntitlementsTable.purchaserEmail}) = ${email.toLowerCase()}`,
        ),
      );
  } catch {
    // Product tables may not exist during the initial database migration.
  }
}

export async function ensureLocalUser(clerkUserId: string) {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkUserId))
    .limit(1);
  if (existing[0]) {
    const prev = existing[0].lastLoginAt;
    const now = new Date();
    const shouldLog =
      !prev || now.getTime() - prev.getTime() > 30 * 60 * 1000;
    await db
      .update(usersTable)
      .set({ lastLoginAt: now })
      .where(eq(usersTable.id, existing[0].id));
    if (shouldLog) {
      void recordActivity({
        userId: existing[0].id,
        action: "logged_in",
        target: existing[0].email,
      });
    }
    await claimEmailEntitlements(existing[0].id, existing[0].email);
    return existing[0];
  }

  let email = `${clerkUserId}@unknown.local`;
  let name = "New Member";
  let avatarUrl: string | null = null;
  try {
    const cu = await clerkClient.users.getUser(clerkUserId);
    email =
      cu.primaryEmailAddress?.emailAddress ??
      cu.emailAddresses[0]?.emailAddress ??
      email;
    name =
      [cu.firstName, cu.lastName].filter(Boolean).join(" ").trim() ||
      cu.username ||
      email.split("@")[0] ||
      "New Member";
    avatarUrl = cu.imageUrl ?? null;
  } catch {
    // Ignore — fallback values used.
  }

  // Public signups are students. The optional owner email is the only account
  // that may bootstrap administrator access.
  const ownerEmail = process.env.PORTAL_OWNER_EMAIL?.trim().toLowerCase();
  const role = ownerEmail && email.toLowerCase() === ownerEmail
    ? "super_admin"
    : "student";

  try {
    const [created] = await db
      .insert(usersTable)
      .values({
        clerkId: clerkUserId,
        email,
        name,
        avatarUrl,
        role,
        lastLoginAt: new Date(),
      })
      .returning();
    if (created && email && !email.endsWith("@unknown.local")) {
      await claimEmailEntitlements(created.id, email);
      const tpl = welcomeEmail({
        name,
        portalUrl: getPortalUrl(),
        isFirstAdmin: role === "super_admin",
      });
      void sendEmail({ to: email, ...tpl }).catch(() => {});
    }
    return created;
  } catch {
    // A concurrent request created the row first — fetch and return it.
    const [row] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkUserId))
      .limit(1);
    if (row) return row;
    throw new Error("Failed to create or fetch local user");
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const user = await ensureLocalUser(clerkUserId);
    (req as AuthedRequest).userId = user.id;
    (req as AuthedRequest).userRole = user.role as AuthedRequest["userRole"];
    (req as AuthedRequest).clerkUserId = clerkUserId;
    return next();
  } catch (err) {
    req.log?.error({ err }, "Failed to ensure local user");
    return res.status(500).json({ error: "Auth bootstrap failed" });
  }
}

export function requireRole(roles: AuthedRequest["userRole"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const r = (req as AuthedRequest).userRole;
    if (!roles.includes(r)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}
