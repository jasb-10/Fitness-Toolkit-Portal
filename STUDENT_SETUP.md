# Client Portal — Student Setup Guide

Welcome! You've just forked your own copy of the Client Portal template. Follow the steps below in order and you'll have a working portal in under 10 minutes.

If you get stuck on any step, scroll to the **Troubleshooting** section at the bottom.

---

## Step 1 — Open your forked project

After clicking **Fork** (or **Use Template**), Replit will create a private copy of the project in your account and open it for you.

You should see three workflows in the left sidebar:

- `artifacts/api-server: API Server` — the backend
- `artifacts/client-portal: web` — the portal frontend
- `artifacts/mockup-sandbox: Component Preview Server` — design preview tool

Don't click **Run** yet — first we need to add a few secrets.

---

## Step 2 — Create a free Clerk account (required, ~3 min)

The portal uses Clerk for sign-in / sign-up.

1. Go to **https://clerk.com** and sign up for a free account.
2. Click **+ Create application**.
3. Give it any name (e.g. "My Client Portal"). Enable **Email** as a sign-in method. You can leave the rest at defaults.
4. Once created, open the **API keys** page in the Clerk dashboard. You'll need two values:
   - **Publishable key** (starts with `pk_test_…`)
   - **Secret key** (starts with `sk_test_…`)

Keep this tab open — you'll paste these in the next step.

---

## Step 3 — Add your secrets in Replit

Open the **Secrets** pane in your Replit workspace (the padlock icon in the left sidebar). Add these one at a time:

### Required secrets

| Secret name | Where it comes from |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk → API keys → Publishable key |
| `CLERK_SECRET_KEY` | Clerk → API keys → Secret key |
| `SESSION_SECRET` | Make up any long random string (40+ characters of letters/numbers) |

### Already provided automatically

These are set up for you by Replit when you fork — you don't need to touch them:

- `DATABASE_URL` — your private Postgres database
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS` — file uploads

### Optional secrets (add later if you want these features)

| Secret name | Feature it unlocks |
|---|---|
| `STRIPE_SECRET_KEY` | Real Stripe invoices on the billing page (get from https://dashboard.stripe.com → Developers → API keys) |
| `RESEND_API_KEY` | Send refund-status emails to customers (get from https://resend.com) |

The portal works fine without the optional ones — you'll just see local-only invoices and emails will be skipped.

---

## Step 4 — Initialize the database

Open the **Shell** tab in Replit and run:

```
pnpm install
pnpm --filter @workspace/db run db:push
```

The first command installs all dependencies (only needed once). The second creates all the database tables in your fresh Postgres instance.

---

## Step 5 — Start the app

Click the green **Run** button at the top of the workspace. All three workflows will start automatically.

Once you see "Server listening" in the API Server logs and "ready" in the web logs, click the **Webview** tab — your portal is live.

---

## Step 6 — Create your admin account

This is the most important step.

1. In the live portal, click **Sign up**.
2. Use your real email — this account will become the **super admin** of the portal.
3. Verify your email when Clerk sends the code.

> The **first** person to sign up is automatically promoted to **super admin**. Make sure that's *you*, not a test user. If you accidentally sign up with the wrong account first, delete it from the Clerk dashboard and from the **Users** table in the database, then sign up again.

You'll now see the **Admin** area in the left sidebar.

---

## Step 7 — Make it yours

In the admin area you can:

- **Settings → Company branding** — set your business name, logo, support email, and website.
- **Courses** — create your master class, add chapters and video lessons, upload notes/summaries.
- **Curriculum** — set up DFY project templates students will work through.
- **Support → Articles & FAQ** — write help articles, or click **Bulk generate articles with AI** to draft a full library based on your course content.
- **Team** — invite teammates and assign admin/team roles.
- **Users** — view your students and manage their access.

---

## Step 8 — Publish to a real URL (when ready)

When you're happy with how the portal looks, open the **Publishing** pane (rocket icon, right sidebar) and click **Publish**. You'll get a `.replit.app` URL you can share with your customers — or you can attach your own custom domain.

---

## Troubleshooting

**The portal won't load / shows a blank page**
Check the workflow logs (left sidebar → click each workflow). The most common cause is a missing or mistyped secret. Double-check that `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are spelled exactly as shown above.

**Sign-up fails with a Clerk error**
Make sure you enabled **Email** as a sign-in method in your Clerk application settings, and that the publishable key (`pk_test_…`) and secret key (`sk_test_…`) are from the **same** Clerk application.

**I signed up but I'm not an admin**
The auto-promotion only happens for the very first user. Open the Shell and run:
```
pnpm --filter @workspace/db run db:studio
```
…then in the `users` table, change your row's `role` to `super_admin`.

**"Bulk generate articles with AI" doesn't do anything**
That feature uses Replit's built-in AI integration, which is included automatically — no extra key needed. If it fails, check the API Server logs for the specific error message.

**I broke something and want to start over**
Use Replit's **History** pane (clock icon) to roll back to an earlier checkpoint, or simply re-fork the original template.

---

## Need help?

Reach out to your course instructor or check the course discussion area. Happy building!
