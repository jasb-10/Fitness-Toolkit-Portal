# Portal — Members-Only Client Portal

A Thinkific-style monochrome portal that combines a hosted master class library, a done-for-you (DFY) project tracking section, and full admin tooling for managing members, courses, and team access.

## Architecture

- **Monorepo** managed by pnpm workspaces (see `pnpm-workspace.yaml`).
- **artifacts/api-server** — Express API (port 8080). Auth via Clerk; first sign-in upserts a local user (first signup with no existing super_admin is auto-promoted to super_admin).
- **artifacts/client-portal** — React + Vite + Wouter + TanStack Query frontend. Generated hooks come from `@workspace/api-client-react` (orval).
- **artifacts/mockup-sandbox** — design preview server.
- **lib/db** — Drizzle schema (PostgreSQL via DATABASE_URL): users, courses, chapters, lessons, attachments, lesson_progress, course_access, dfy_projects, milestones, project_updates, billing.
- **lib/api-spec / api-zod / api-client-react** — OpenAPI spec → generated zod schemas + react-query hooks.

## Roles

`super_admin`, `admin`, `team`, `student`.
- Admin pages gated client-side via `RoleGate` (`StaffOnly`, `AdminOnly`).
- API enforces role at endpoint level via `requireRole(...)`.

## Branding

- Strict monochrome black/white only. Headings use Fraunces (serif), body uses Inter.
- No emojis anywhere in UI.
- Clerk modals use a custom appearance (`src/lib/clerkAppearance.ts`) that matches the same monochrome system.

## Routes (frontend)

- `/` landing (signed-out) → redirects signed-in users to `/dashboard`
- `/dashboard` welcome video, progress stats, course grid, continue-learning, active projects
- `/courses`, `/courses/:id` Thinkific-style player (sidebar with chapter accordion + search + completion circles + sticky title bar + Complete & Continue)
- `/projects`, `/projects/:id` DFY project list, milestones + threaded updates
- `/settings/profile`, `/settings/billing` user-managed account info
- `/upsell-1`, `/upsell-2` placeholder slots for premium add-on courses
- `/support` student help center: searchable articles grouped by category + FAQ list (no chat or refund form here — those live in the floating widget)
- Floating support chat bubble (`SupportWidget`) is rendered inside `AppShell` on every signed-in portal screen. It is the only entry point to the AI assistant and the only way for students to request a refund.
- `/admin`, `/admin/users`, `/admin/users/:id`, `/admin/courses`, `/admin/courses/:id/edit`, `/admin/team` admin tooling including curriculum builder
- `/admin/support` (super_admin / admin only) — articles + FAQ CRUD with AI drafting, KB sources (manual or URL fetch with SSRF protections), refund queue moderation, assistant + refund settings

## Object storage / file uploads

- App Storage (GCS) is provisioned via `setupObjectStorage()`. Server uses `lib/objectStorage.ts` + `lib/objectAcl.ts` and exposes `POST /storage/uploads/request-url` + `GET /storage/objects/*` (mounted in `routes/index.ts` via `routes/storage.ts`).
- Client uploads use `components/ThumbnailUploader.tsx`: `<input type="file">` → `POST request-url` → direct `PUT` to the presigned GCS URL → returns `objectPath` saved into the DB column.
- Helper `thumbnailUrl(objectPath)` in the same file builds the serving URL (`{basePath}/api/storage{objectPath}`) so images render via the API.

## Course thumbnails

- Stored in `courses.cover_image_url`. Settable when creating a course (admin "New course" dialog) and editable on the curriculum builder via the new "Course settings" card at the top of `/admin/courses/:id/edit`.
- The `/courses` (Master Class) library and `/admin/courses` list both render the uploaded image; with no thumbnail they fall back to the original solid black tile.

## Lesson editor (admin) & player

- Each lesson has one rich-text body (`lessons.notes`, HTML) and one unified attachments list (`lessons.attachments` jsonb, each `{id,label,url,type:"link"|"file"}`).
- Admin lesson dialog (`admin-course-edit.tsx`) uses `components/RichTextEditor.tsx` (TipTap: StarterKit + Link + Image + Placeholder; bold/italic/strike/code, H1–H3, bullet/numbered lists, blockquote callouts, dividers, links, image upload via `/api/storage/uploads/request-url`, undo/redo) and `components/LessonAttachmentsEditor.tsx` (single combined "Templates & resources" list — admins can "Add link" or "Upload file"; uploaded files (≤25 MB) go straight to GCS).
- Player (`course-player.tsx`) renders the rich body sanitized with DOMPurify inside `prose prose-neutral`, then a single "Templates & resources" grid where files show a download icon + "Tap to download" and links show an external-link icon + "Open link". Old `summary` / separate templates / separate resources / separate notes UI is gone.
- API: `LessonDetail` returns `notes` + `attachments[]`; `UpdateLessonBody` accepts `notes` + `attachments[]`. Legacy `kind=template|resource` is still tolerated when reading old DB rows (mapped to `type=link|file` based on URL prefix) but writes only use the new shape.

## Conventions

- Use generated hooks from `@workspace/api-client-react` and the matching `getXxxQueryKey` helpers for invalidation.
- Always use `import.meta.env.BASE_URL` (via `lib/utils.ts` `basePath`) when forming URLs — never hard-code root-relative paths.
- Use `useClerk().openUserProfile()` for password / connected accounts management.
- Admin password reset uses Clerk `signInTokens.createSignInToken` and returns a one-time `resetUrl`.

## Support module

- Backend: `routes/support.ts` (read-only KB, conversations, AI chat via OpenAI `gpt-5.2` with KB + course outline context) and `routes/admin-support.ts` (article CRUD, AI article/FAQ generation in JSON mode, KB sources with hardened URL fetcher, refund queue, settings, Stripe status).
- Refunds are tool-driven by the chat assistant. The model gets a `request_refund(reason, amount?)` function tool. Server logic in `processRefundTool`:
  1. Denies if the billing record is older than `refundDaysWindow` and writes a denied row.
  2. If `STRIPE_SECRET_KEY` is set + `autoApproveUnderAmount` is configured + amount is under threshold (or unspecified), tries to find the user's most recent successful charge via `stripe.customers.list({ email })` + `stripe.charges.list`, then calls `stripe.refunds.create`. Stores `stripeRefundId` and marks `processed`.
  3. Otherwise inserts a `pending` refund_request row for admin review.
- Admin queue at `/admin/support` still lets staff manually issue, approve, or deny refunds (with charge ID input + "Refund via Stripe" button). The Settings tab shows live Stripe connection status (`/admin/support/stripe-status`).
- Stripe SDK lives in `artifacts/api-server/src/lib/stripe.ts`; key is read from `STRIPE_SECRET_KEY` (env/secret only — never hard-coded).
- Billing/invoice history (`artifacts/api-server/src/lib/invoices.ts`, `routes/invoices.ts`): unified list at `GET /me/invoices` merges Stripe invoices (only when `billing.stripeCustomerId` is server-bound — no email auto-discovery) with local rows. PDF download at `GET /me/invoices/:id/download?source=stripe|local` either redirects to Stripe's hosted PDF or streams a pdfkit-rendered PDF using company branding settings. Activity is recorded with `downloaded_invoice` action. Admin endpoint `PUT /admin/users/:userId/stripe-customer` binds the customer ID server-side. Company branding is stored in `settingsTable` key `company` and managed via `GET/PUT /admin/company` (PUT requires super_admin); the frontend admin Settings tab includes a `CompanyBrandingCard`.
- KB URL ingestion blocks non-http(s), private/loopback/link-local hosts (incl. AWS metadata), and rejects redirects.

## DFY admin editing

- `PATCH /dfy/projects/:id` lets staff edit status, progress, and next milestone.
- `POST /dfy/projects/:id/milestones`, `PATCH /dfy/milestones/:id`, `DELETE /dfy/milestones/:id` for full milestone CRUD. Inline panel rendered on the project detail page for staff.

## Transactional email (Resend)
- Connector `conn_resend_01KMP2TA673EEPMJ6XEJH1X1V3` (`resend@4.0.0` in api-server). Credentials fetched per-call from `REPLIT_CONNECTORS_HOSTNAME` (60s in-process cache).
- `lib/email.ts` exports `sendEmail`, `probeResend`, and templates: `welcomeEmail`, `newMemberEmail`, `refundStatusEmail`. Sender is the `from_email` configured on the Resend connection.
- Hooks:
  - `middlewares/auth.ts ensureLocalUser` → welcome email on first user creation (skips synthetic `@unknown.local`); flags first super_admin.
  - `routes/admin.ts POST /admin/users` → "you've been added" email.
  - `routes/admin-support.ts PATCH /admin/support/refund-requests/:id` → status email on transitions to approved/denied/processed/failed.
- Status endpoint: `GET /admin/support/resend-status` → `{configured, fromEmail, error}`. Surfaced via `ResendStatusCard` in admin Settings tab.
- Clerk-driven emails (signup verification, password reset, magic link) are NOT sent through Resend by us. Configure Clerk's "Custom SMTP" in the Clerk dashboard (Resend supports SMTP) if branded auth emails are wanted.
- `getPortalUrl()` honors `PORTAL_PUBLIC_URL` override, else `REPLIT_DEV_DOMAIN`.

## Roadmap / Notes

- **Stripe (or other payment processor) integration** — planned. Owners should be able to connect their own Stripe account (or alternative processor) from the admin area so the portal can surface sales data — recent charges, MRR/total revenue, refunds, and per-customer purchase history alongside their member record. Likely path: a "Connect Stripe" button on `/admin` that runs Stripe Connect OAuth, persists the account credentials, then a new `/admin/billing` (or section under `/admin`) showing live sales pulled from the connected account.

## Seed

`artifacts/api-server/src/seed.ts` runs `runSeedIfEmpty` on boot when the courses table is empty:
- 1 demo student + 1 demo team user (no Clerk linkage)
- 2 courses (Master Class with 3 chapters / 7 lessons + VIP Bonus Vault) with attachments
- 1 sample DFY project with milestones and updates
