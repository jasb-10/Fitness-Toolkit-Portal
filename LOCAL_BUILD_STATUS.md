# Fitness Toolkit portal: local build status

This is a local working copy of the exported Replit development project. It has
not been published, synced back to Replit, connected to a live GHL funnel, or
verified against live purchase events. Do not sell any unfinished product yet.

## What the current local pass changed

- Website copy generation now asks for a coherent, fact-grounded page narrative
  and stores generated copy/section layouts for preview and HTML export.
- The support assistant no longer automatically decides or executes refunds.
  Refund requests are routed for owner review; the actual payment refund remains
  in the payment platform.
- Extra Pages stays disabled in the GHL mapping because its current screen only
  saves a page plan, not finished pages.
- GHL events now reject conflicting duplicate event IDs, expose failed events
  for owner retry, and process retries as entitlement actions rather than only
  resending an invitation. Product-specific refund and chargeback events can
  revoke access even if that product has since been disabled for new sales.
- New Clerk identities cannot claim purchased access or become the owner from
  an unverified primary email address.
- Browser-side website drafts are keyed to the Clerk identity instead of one
  shared set of keys; the API still owns the saved project.
- The website builder no longer pretends a fallback page is an AI-generated
  result when account setup is incomplete. Image uploads check the server
  response and only list successful uploads. Non-image files are not claimed
  as supported until an ingestion pipeline exists.
- The owner/admin link now sits at the bottom of the customer navigation.
  A second, undecided bump has a disabled mapping so it cannot unlock by
  accident. Failed-payment notices are logged but cannot reverse an earlier
  settled purchase.
- The website now offers four opening compositions, and its services/process
  sections can use evidence-grounded cards and steps. Customers can edit
  generated section headings and paragraphs; optional unsupported sections
  are omitted rather than filled with raw intake text.
- The HTML export and preview were visually checked with four synthetic
  business briefs (strength, Pilates, yoga and online running coaching).
  Approval/download requires a usable booking or contact destination and a
  customer-supplied image instead of silently shipping a demonstration photo.
- AI requests now reserve attempts on the server: two full drafts and ten
  assisted copy edits for the one website project per user. The new columns
  require the database change in `lib/db/WEBSITE_ALLOWANCES.sql` before this
  API can run in Replit. Failed AI requests count against the allowance;
  owner handling for genuine service failures is still needed.
- Approval now checks the contact destination and a project-owned uploaded
  hero image on the server. The browser sends the latest brief and design
  with approval so a pending autosave cannot invalidate the check.
- Browser autosaves now run in order and pause during AI generation. A failed
  replacement generation keeps the previous saved draft instead of dropping
  the customer into an empty state. Server writes are refused during active
  generation, including an atomic check when the write is committed.
- The review screen can return to the four opening layouts without consuming
  an AI draft. A separate button requests another full draft and visibly shows
  the remaining allowance. Concurrent generation attempts are rejected.

## Not ready to launch

1. The website is still based on a narrow fixed page composition. Four hero
   choices and editable section text improve it, but it needs stronger image
   and brand handling, editable cards/steps, full preview/export parity, and
   mobile visual QA. The current demonstration imagery can be niche-wrong.
2. The current Extra Pages flow does not generate or export connected pages.
3. Campaign Studio and Meta Ad Launch Pack are placeholders. Their mappings
   must remain disabled until deliverables, usage policies, and QA exist.
4. The new server-enforced AI allowance has not been exercised against a real
   Replit database or checked for all concurrency/failure paths. Do not infer
   readiness from the local typecheck.
5. The project does not have an end-to-end test suite. The API-wide typecheck
   already reports unrelated legacy errors; edited files were individually
   checked for TypeScript diagnostics. Build/deployment must be verified in
   Replit's runtime, not assumed from this local Windows environment. A local
   Vite build also cannot start because the exported dependency install lacks
   Rollup's optional Windows native module; this is not evidence of a passing
   or failing Replit/Linux build.
6. Real GHL event field availability, product identity on partial refunds,
   failed-payment behaviour, Clerk invitation delivery, production database
   migrations, and the actual owner checkout journey need sandbox tests.
7. Existing help articles and saved support settings may still describe the
   old course/template product; audit them in the admin UI before launch.
8. The website project update endpoint no longer accepts progress fields and
   only allows approval after a generated draft and server-side
   asset/destination validation. A dedicated approval endpoint and live
   concurrency test would still make this easier to maintain.
9. The original portal template's setup guide was inspected, but the two
   lengthy Greg videos have not been completely revalidated in this local
   pass. Do not treat the GHL/admin configuration as a verified reproduction
   of their walkthrough.

## Safe transfer sequence

Use a **private** GitHub repository/branch and connect the existing Replit
project to that repository. Review the diff before merging; do not replace its
production environment or Clerk keys. Keep `.env` files, webhook secrets,
private keys, uploaded customer assets, and database exports out of Git.
Preserve the three unrelated archive changes in `.agents` and `screenshots`
unless the owner explicitly asks to restore them.

After sync, configure only test GHL products first, run paid/duplicate/
refund/chargeback/failed/unmapped and invitation tests in the actual environment,
then publish a tested release. A secret saved in Replit is not proof that GHL
workflows are connected.
