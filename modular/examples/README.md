# Examples

Reference TypeScript matching `@toijs/modular` public APIs. These files are not a runnable workspace (no separate `package.json` / test runner). Copy into an ESM project that depends on `@toijs/modular`.

| # | Path | What it shows |
| --- | --- | --- |
| 1 | [01-minimal.ts](01-minimal.ts) | `Launcher` + one service |
| 2 | [02-module-service-repository.ts](02-module-service-repository.ts) | `UserModule` → service → repository |
| 3 | [03-multiple-modules.ts](03-multiple-modules.ts) | Several feature modules |
| 4 | [04-database.ts](04-database.ts) | `@toijs/typeorm` as it exists |
| 5 | [05-sqs-worker.ts](05-sqs-worker.ts) | Pattern only — no SQS package |
| 6 | [06-lambda.ts](06-lambda.ts) | Pattern only — no Lambda package |
| 7 | [07-testing.ts](07-testing.ts) | Replace repository token |

Example 4 needs `pnpm add @toijs/typeorm typeorm mysql2`. Do not run it without a real `database` config.
