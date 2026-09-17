---
name: Clerk identity across environments
description: Why local users must be reconciled when Clerk issues environment-specific user IDs.
---

Treat a verified matching email as the stable identity when a user signs into preview and production with different Clerk user IDs. Reconcile the existing local account rather than inserting a duplicate, then apply configured owner promotion.

**Why:** Clerk development and production environments can issue different user IDs for the same person. Looking up only by Clerk ID can collide with the database's unique email constraint and prevent role resolution, which hides authorized admin navigation.

**How to apply:** Keep email reconciliation restricted to email addresses Clerk reports as verified. Preserve the existing local user and role, update its Clerk ID, and then run normal configured-owner checks.