# nestjs-port-commons

Shared packages used across the `nestjs-port` family of projects. This pnpm-managed monorepo publishes four ESM-only packages that provide the common primitives — JDBC-style data access, observability, retry, and testing helpers — that other `nestjs-port/*` repositories depend on.

> **Status:** pre-1.0 (0.0.x). APIs may shift until the first stable release.

## Packages

| Package                                              | Version | Purpose                                                                  |
| ---------------------------------------------------- | ------- | ------------------------------------------------------------------------ |
| [`@nestjs-port/core`](./packages/core)               | 0.0.3   | Foundational primitives — Observation, Retry, Logging, Metrics, HTTP/SSE |
| [`@nestjs-port/jsdbc`](./packages/jsdbc)             | 0.0.3   | `JsdbcTemplate` over TypeORM / Prisma / Drizzle / Sequelize / MikroORM   |
| [`@nestjs-port/observation`](./packages/observation) | 0.0.1   | OpenTelemetry bridge for the core Observation API                        |
| [`@nestjs-port/testing`](./packages/testing)         | 0.0.2   | Recording loggers and `TestObservationRegistry`                          |

## Prerequisites

- **Node.js** ≥ 22.12.0 — these packages are published as ESM-only and rely on `require(esm)` to remain consumable from CommonJS callers.
- **pnpm** ≥ 10

## Install

Each package is published independently on npm. Install only what you need, plus the optional peer dependencies matching your stack.

```bash
pnpm add @nestjs-port/core rxjs
```

```bash
# JDBC integration on top of TypeORM
pnpm add @nestjs-port/jsdbc @nestjs-port/core typeorm @nestjs/typeorm
```

```bash
# OpenTelemetry observability wiring
pnpm add @nestjs-port/observation @nestjs-port/core @opentelemetry/api
```

## Usage

### `@nestjs-port/core`

Spring-style `RetryTemplate`:

```ts
import {
  RetryTemplate,
  RetryPolicy,
  ExponentialBackOff,
} from "@nestjs-port/core";

const policy = RetryPolicy.builder()
  .maxRetries(4)
  .backOff(new ExponentialBackOff(200, 2))
  .build();

const retry = new RetryTemplate(policy);
const user = await retry.execute(() => fetchUser(id), "fetchUser");
```

The package also ships `AlsObservationRegistry` (AsyncLocalStorage-backed), `LoggerFactory`, `FetchHttpClient`, `sseStream`, and the `ms()` duration helper — each mirroring its Spring/Micrometer counterpart.

### `@nestjs-port/jsdbc`

Bootstrap against your existing ORM and inject `JsdbcTemplate`:

```ts
import { Module } from "@nestjs/common";
import { TypeOrmJsdbcModule } from "@nestjs-port/jsdbc/typeorm";
import {
  InjectJsdbcTemplate,
  type JsdbcTemplate,
  sql,
} from "@nestjs-port/jsdbc";

@Module({ imports: [TypeOrmJsdbcModule.forRoot()] })
export class AppModule {}

export class UserRepository {
  constructor(@InjectJsdbcTemplate() private readonly jdbc: JsdbcTemplate) {}

  findActive() {
    return this.jdbc.queryForList<{ id: number; email: string }>(
      sql`SELECT id, email FROM users WHERE status = ${"active"}`,
    );
  }

  async deactivate(id: number) {
    await this.jdbc.transaction(async () => {
      await this.jdbc.update(
        sql`UPDATE users SET status = 'inactive' WHERE id = ${id}`,
      );
    });
  }
}
```

Row mappers mirror Spring's `RowMapper<T>` contract — pick by integration:

```ts
import { ZodRowMapper, SingleColumnRowMapper } from "@nestjs-port/jsdbc";
import { ClassTransformerRowMapper } from "@nestjs-port/jsdbc/class-transformer";
```

`./class-transformer` is a dedicated subpath so `class-transformer` is only loaded when you reach for it.

Available subpaths: `./typeorm`, `./prisma`, `./drizzle`, `./sequelize`, `./mikroorm`, `./class-transformer`.

### `@nestjs-port/observation`

Wire OpenTelemetry handlers into the core `ObservationRegistry`:

```ts
import { Module } from "@nestjs/common";
import { IgnoredMeters, ObservationModule } from "@nestjs-port/observation";

@Module({
  imports: [
    ObservationModule.forRoot({
      ignoredMeters: [IgnoredMeters.LONG_TASK_TIMER],
    }),
  ],
})
export class AppModule {}
```

Both `OtelTracingObservationHandler` and `OtelMeterObservationHandler` are registered automatically through `ObservationProviderPostProcessor`.

### `@nestjs-port/testing`

Assert on recorded logs and observations without touching stdout or OTel exporters:

```ts
import { RecordingLoggerFactory } from "@nestjs-port/testing";
import { TestObservationRegistry } from "@nestjs-port/testing";

const loggers = new RecordingLoggerFactory();
const registry = TestObservationRegistry.builder().build();
// ... exercise the unit under test, then inspect registry/loggers in expectations
```

## Development

This repository is a pnpm workspace orchestrated by Turborepo.

```bash
pnpm install
pnpm build        # tsc -p tsconfig.build.json in every package
pnpm typecheck
pnpm test         # vitest run per package
pnpm lint         # oxlint
pnpm format       # oxfmt --write
```

Formatting and linting are handled by [`oxfmt`](https://oxc.rs) and [`oxlint`](https://oxc.rs); the build is plain `tsc` with `module: NodeNext` and `verbatimModuleSyntax: true`.

### Release workflow

Versioning and publishing are driven by [Changesets](https://github.com/changesets/changesets) for npm, and the package-local `jsr.json` files are kept in sync with the package versions:

```bash
pnpm changeset              # describe your change
pnpm changeset:status       # preview pending version bumps
```

The `Changesets` GitHub Action opens a release PR and publishes to npm when merged to `main`. For JSR, publish from each package directory after the version bump has been applied.

## License

Apache-2.0. See [LICENSE](./LICENSE).
