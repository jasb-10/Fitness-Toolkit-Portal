import type { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, productEntitlementsTable, usersTable } from "@workspace/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import { sendEmail, welcomeEmail, getPortalUrl } from "../lib/email";
import { recordActivity } from "../lib/activity";

export interface AuthedRequest extends Request {
  userId: string;
  userRole: "owner" | "staff" | "customer" | "super_admin" | "admin" | "team" | "student";
  clerkUserId: string;
}

export function isOwnerRole(role: string): boolean {
  return role === "owner" || role === "super_admin";
}

export function isStaffRole(role: string): boolean {
  return isOwnerRole(role) || role === "staff" || role === "admin" || role === "team";
}

export function isCustomerRole(role: string): boolean {
  return role === "customer" || role === "student";
}

export const PRODUCT_CODES = {
  website: "fitness-website-core",
  extraPages: "fitness-extra-pages",
  campaignStudio: "fitness-campaign-studio",
  metaAds: "fitness-meta-ads",
} as const;

export async function hasProductEntitlement(
  userId: string,
  userRole: string,
  productCode: string,
) {
  if (isStaffRole(userRole)) return true;
  const [entitlement] = await db
    .select({ id: productEntitlementsTable.id })
    .from(productEntitlementsTable)
    .where(
      and(
        eq(productEntitlementsTable.userId, userId),
        eq(productEntitlementsTable.productCode, productCode),
        eq(productEntitlementsTable.status, "active"),
      ),
    )
    .limit(1);
  return Boolean(entitlement);
}

export function requireProductEntitlement(productCode: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ar = req as AuthedRequest;
    if (await hasProductEntitlement(ar.userId, ar.userRole, productCode)) {
      return next();
    }
    return res.status(403).json({ error: "Purchased product access required" });
  };
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
    let localUser = existing[0];
    const configuredOwner =
      Boolean(process.env.PORTAL_OWNER_EMAIL?.trim()) &&
      localUser.email.toLowerCase() ===
        process.env.PORTAL_OWNER_EMAIL!.trim().toLowerCase();
    if (configuredOwner && !isOwnerRole(localUser.role)) {
      localUser = await db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext('fitness-toolkit-owner-bootstrap'))`,
        );
        await tx
          .update(usersTable)
          .set({ role: "customer" })
          .where(sql`${usersTable.role} in ('owner', 'super_admin') and ${usersTable.id} <> ${localUser.id}`);
        const [promoted] = await tx
          .update(usersTable)
          .set({ role: "owner" })
          .where(eq(usersTable.id, localUser.id))
          .returning();
        return promoted ?? localUser;
      });
    }
    const prev = localUser.lastLoginAt;
    const now = new Date();
    const shouldLog =
      !prev || now.getTime() - prev.getTime() > 30 * 60 * 1000;
    await db
      .update(usersTable)
      .set({ lastLoginAt: now })
      .where(eq(usersTable.id, localUser.id));
    if (shouldLog) {
      void recordActivity({
        userId: localUser.id,
        action: "logged_in",
        target: localUser.email,
      });
    }
    await claimEmailEntitlements(localUser.id, localUser.email);
    return localUser;
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

    const primaryEmailVerified =
      cu.primaryEmailAddress?.verification?.status === "verified";
    if (primaryEmailVerified && !email.endsWith("@unknown.local")) {
      const [sameEmailUser] = await db
        .select()
        .from(usersTable)
        .where(sql`lower(${usersTable.email}) = ${email.toLowerCase()}`)
        .limit(1);
      if (sameEmailUser && sameEmailUser.clerkId !== clerkUserId) {
        await db
          .update(usersTable)
          .set({
            clerkId: clerkUserId,
            name,
            avatarUrl,
            lastLoginAt: new Date(),
          })
          .where(eq(usersTable.id, sameEmailUser.id));
        return ensureLocalUser(clerkUserId);
      }
    }
  } catch {
    // Ignore — fallback values used.
  }

  const ownerEmail = process.env.PORTAL_OWNER_EMAIL?.trim().toLowerCase();

  try {
    const created = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext('fitness-toolkit-owner-bootstrap'))`,
      );
      const isConfiguredOwner =
        Boolean(ownerEmail) && email.toLowerCase() === ownerEmail;
      const role = isConfiguredOwner ? "owner" : "customer";
      const [row] = await tx
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
      return row;
    });
    if (created && email && !email.endsWith("@unknown.local")) {
      await claimEmailEntitlements(created.id, email);
      const tpl = welcomeEmail({
        name,
        portalUrl: getPortalUrl(),
          isFirstAdmin: isOwnerRole(created.role),
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
    const allowed = new Set(roles);
    if (allowed.has("owner") || allowed.has("super_admin")) {
      allowed.add("owner");
      allowed.add("super_admin");
    }
    if (allowed.has("staff") || allowed.has("admin") || allowed.has("team")) {
      allowed.add("staff");
      allowed.add("admin");
      allowed.add("team");
      allowed.add("owner");
      allowed.add("super_admin");
    }
    if (allowed.has("customer")) allowed.add("student");
    if (!allowed.has(r)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}
