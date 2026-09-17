---
name: Orval Zod compatibility
description: Why API validator generation includes a Zod 3 compatibility rewrite.
---

Keep the post-generation Zod 3 compatibility rewrite in the API specification code-generation command unless the workspace deliberately upgrades to Zod 4.

**Why:** The installed Orval generator emits Zod 4 shorthand constructors for integer, UUID, and URL schemas, while the workspace runtime uses Zod 3. The TypeScript build can succeed with warnings but the generated validators then fail when loaded.

**How to apply:** Whenever the OpenAPI client and validators are regenerated, ensure the compatibility step runs before type checking or API bundling. Remove it only after verifying the whole workspace uses Zod 4 and the generated validators load without warnings.