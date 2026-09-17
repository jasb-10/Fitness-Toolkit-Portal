import { Router, type IRouter, type Response } from "express";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";
import {
  recordActivity,
  CLIENT_ALLOWED_ACTIONS,
  type ActivityAction,
} from "../lib/activity";

const router: IRouter = Router();

router.use(requireAuth);

const ALLOWED = new Set<string>(CLIENT_ALLOWED_ACTIONS);

interface RawEvent {
  action?: unknown;
  target?: unknown;
  path?: unknown;
  metadata?: unknown;
}

interface CleanEvent {
  action: ActivityAction;
  target: string;
  path: string | null;
  metadata: Record<string, unknown> | null;
}

function clean(e: RawEvent): CleanEvent | null {
  if (typeof e?.action !== "string" || !ALLOWED.has(e.action)) return null;
  if (typeof e.target !== "string" || e.target.length === 0) return null;
  return {
    action: e.action as ActivityAction,
    target: e.target.slice(0, 500),
    path:
      typeof e.path === "string" && e.path.length > 0
        ? e.path.slice(0, 500)
        : null,
    metadata:
      e.metadata && typeof e.metadata === "object" && !Array.isArray(e.metadata)
        ? (e.metadata as Record<string, unknown>)
        : null,
  };
}

router.post("/events", async (req, res: Response) => {
  const ar = req as AuthedRequest;
  const body = req.body as RawEvent | { events?: RawEvent[] };
  const raw: RawEvent[] = Array.isArray((body as { events?: RawEvent[] })?.events)
    ? (body as { events: RawEvent[] }).events.slice(0, 50)
    : [body as RawEvent];

  const events = raw.map(clean).filter((e): e is CleanEvent => e !== null);

  await Promise.all(
    events.map((e) =>
      recordActivity({
        userId: ar.userId,
        action: e.action,
        target: e.target,
        path: e.path,
        metadata: e.metadata,
      }),
    ),
  );
  res.status(204).end();
});

export default router;
