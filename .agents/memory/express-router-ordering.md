---
name: Express router ordering
description: Public API routes must be mounted before child routers with root-level authentication middleware.
---

Mount public webhook routers before any child router that calls `router.use(requireAuth)` without a path prefix.

**Why:** Express enters mounted child routers in parent order. A root-level authentication middleware inside an earlier child router can return `401` before a later public route is considered, making the later endpoint appear broken.

**How to apply:** When adding public health, webhook, or callback endpoints, inspect every previously mounted router for root-level middleware and place the public router before those authenticated routers.