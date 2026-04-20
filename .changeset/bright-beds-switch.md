---
"@nestjs-port/jsdbc": patch
---

Move Prisma client generation from `postinstall` to `pretest` and `pretypecheck` so install no longer triggers generation work.
