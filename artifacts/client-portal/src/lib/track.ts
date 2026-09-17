import { trackEvent } from "@workspace/api-client-react";

type ClientAction =
  | "viewed_page"
  | "downloaded_attachment"
  | "opened_link"
  | "started_video"
  | "video_progress"
  | "completed_video"
  | "opened_support_chat"
  | "downloaded_invoice";

interface TrackInput {
  target: string;
  path?: string;
  metadata?: Record<string, unknown>;
}

interface QueuedEvent extends TrackInput {
  action: ClientAction;
}

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_MS = 1500;
const MAX_BATCH = 25;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, FLUSH_MS);
}

async function flush() {
  flushTimer = null;
  if (queue.length === 0) return;
  const batch = queue.splice(0, MAX_BATCH);
  try {
    await trackEvent({ events: batch });
  } catch {
    // Drop on failure — analytics is best-effort.
  }
  if (queue.length > 0) scheduleFlush();
}

export function track(action: ClientAction, input: TrackInput): void {
  queue.push({
    action,
    target: input.target.slice(0, 500),
    path: input.path ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
    metadata: input.metadata,
  });
  scheduleFlush();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (queue.length === 0) return;
    try {
      const url = `${import.meta.env.BASE_URL}api/events`;
      navigator.sendBeacon?.(
        url,
        new Blob([JSON.stringify({ events: queue })], { type: "application/json" }),
      );
      queue = [];
    } catch {
      // ignore
    }
  });
}
