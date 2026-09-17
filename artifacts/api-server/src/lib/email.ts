import { Resend } from "resend";

interface ResendCreds {
  apiKey: string;
  fromEmail: string | null;
}

let cachedCreds: ResendCreds | null = null;
let cachedAt = 0;
const CACHE_MS = 60_000;

async function fetchResendCreds(): Promise<ResendCreds | null> {
  const now = Date.now();
  if (cachedCreds && now - cachedAt < CACHE_MS) return cachedCreds;

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) return null;

  try {
    const r = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=resend`,
      {
        headers: {
          Accept: "application/json",
          "X-Replit-Token": xReplitToken,
        },
      },
    );
    if (!r.ok) return null;
    const data = (await r.json()) as {
      items?: Array<{
        settings?: { api_key?: string; from_email?: string | null };
      }>;
    };
    const settings = data.items?.[0]?.settings;
    if (!settings?.api_key) return null;
    cachedCreds = {
      apiKey: settings.api_key,
      fromEmail: settings.from_email ?? null,
    };
    cachedAt = now;
    return cachedCreds;
  } catch {
    return null;
  }
}

export async function isResendConfigured(): Promise<boolean> {
  const creds = await fetchResendCreds();
  return Boolean(creds?.apiKey);
}

export interface ResendStatus {
  configured: boolean;
  fromEmail: string | null;
  error: string | null;
}

export async function probeResend(): Promise<ResendStatus> {
  const creds = await fetchResendCreds();
  if (!creds) {
    return { configured: false, fromEmail: null, error: null };
  }
  try {
    const client = new Resend(creds.apiKey);
    // Lightweight ping: list domains. Returns 401 if key is bad.
    const r = await client.domains.list();
    if (r.error) {
      return { configured: true, fromEmail: creds.fromEmail, error: r.error.message };
    }
    return { configured: true, fromEmail: creds.fromEmail, error: null };
  } catch (err) {
    return {
      configured: true,
      fromEmail: creds.fromEmail,
      error: err instanceof Error ? err.message : "Failed to reach Resend",
    };
  }
}

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(
  args: SendEmailArgs,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const creds = await fetchResendCreds();
  if (!creds) {
    return { ok: false, error: "Resend is not connected." };
  }
  const from = args.from ?? creds.fromEmail;
  if (!from) {
    return {
      ok: false,
      error:
        "No 'from' address configured on the Resend connection. Add a verified sender in the Resend dashboard.",
    };
  }
  try {
    const client = new Resend(creds.apiKey);
    const { data, error } = await client.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id ?? "" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Send failed",
    };
  }
}

// ---------- Templates ----------

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
<tr><td style="padding:28px 32px 8px 32px;">
<div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#666;">${title}</div>
</td></tr>
<tr><td style="padding:8px 32px 28px 32px;font-size:15px;line-height:1.6;color:#222;">
${bodyHtml}
</td></tr>
</table>
<div style="font-size:11px;color:#999;margin-top:16px;">You received this because you have an account on this client portal.</div>
</td></tr>
</table>
</body></html>`;
}

export function welcomeEmail(opts: {
  name: string;
  portalUrl: string;
  isFirstAdmin: boolean;
}): { subject: string; html: string; text: string } {
  const subject = opts.isFirstAdmin
    ? "Welcome — your portal is ready"
    : "Welcome to the portal";
  const intro = opts.isFirstAdmin
    ? `Your account is set up as the <strong>super admin</strong>. You can configure courses, invite team members, and customize everything from the admin area.`
    : `You're all set up. Jump into the dashboard to start your first lesson or check on your projects.`;
  const html = shell(
    "Welcome",
    `<p>Hi ${escapeHtml(opts.name)},</p>
     <p>${intro}</p>
     <p style="margin-top:24px;"><a href="${escapeAttr(opts.portalUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">Open portal</a></p>`,
  );
  const text = `Hi ${opts.name},\n\n${opts.isFirstAdmin ? "Your account is set up as the super admin." : "You're all set up."}\n\nOpen the portal: ${opts.portalUrl}`;
  return { subject, html, text };
}

export function refundStatusEmail(opts: {
  name: string;
  status: string;
  amount: string | null;
  reason: string;
  decisionNote: string | null;
  portalUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Refund request ${opts.status}`;
  const amountLine = opts.amount ? `<p><strong>Amount:</strong> $${escapeHtml(opts.amount)}</p>` : "";
  const noteLine = opts.decisionNote
    ? `<p style="background:#fafafa;border-left:3px solid #111;padding:10px 14px;margin-top:18px;">${escapeHtml(opts.decisionNote).replace(/\n/g, "<br/>")}</p>`
    : "";
  const html = shell(
    "Refund update",
    `<p>Hi ${escapeHtml(opts.name)},</p>
     <p>Your refund request has been <strong>${escapeHtml(opts.status)}</strong>.</p>
     ${amountLine}
     <p><strong>Reason you provided:</strong><br/>${escapeHtml(opts.reason).replace(/\n/g, "<br/>")}</p>
     ${noteLine}
     <p style="margin-top:24px;"><a href="${escapeAttr(opts.portalUrl)}" style="color:#111;text-decoration:underline;">Open the portal</a></p>`,
  );
  const text = `Hi ${opts.name},\n\nYour refund request has been ${opts.status}.\n${opts.amount ? `Amount: $${opts.amount}\n` : ""}Reason: ${opts.reason}${opts.decisionNote ? `\n\nNote from the team:\n${opts.decisionNote}` : ""}\n\nPortal: ${opts.portalUrl}`;
  return { subject, html, text };
}

export function newMemberEmail(opts: {
  name: string;
  email: string;
  role: string;
  portalUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = "You've been added to the portal";
  const html = shell(
    "Account created",
    `<p>Hi ${escapeHtml(opts.name)},</p>
     <p>An admin created an account for you on the portal as a <strong>${escapeHtml(opts.role)}</strong>.</p>
     <p>Sign in with this email address: <strong>${escapeHtml(opts.email)}</strong>. You'll be prompted to set a password on your first visit.</p>
     <p style="margin-top:24px;"><a href="${escapeAttr(opts.portalUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">Open portal</a></p>`,
  );
  const text = `Hi ${opts.name},\n\nAn admin added you to the portal as a ${opts.role}.\nSign in with: ${opts.email}\n\nPortal: ${opts.portalUrl}`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

export function getPortalUrl(): string {
  // Honor an explicit override first; else use the public dev domain.
  const override = process.env.PORTAL_PUBLIC_URL;
  if (override) return override.replace(/\/$/, "");
  const dev = process.env.REPLIT_DEV_DOMAIN;
  if (dev) return `https://${dev}`;
  return "https://localhost";
}
