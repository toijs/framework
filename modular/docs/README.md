# @toijs/modular documentation

Source of truth: `src/` in this package. If a sentence here disagrees with source, trust the source.

## Status

| | |
| --- | --- |
| Implemented | Modules, DI container, decorators, Task, Config, Metadata, Shell, Launcher |
| Experimental | None marked in source. Treat undocumented edge cases as unstable. |
| Not implemented | HTTP, request scope, CJS, tests, license, changelog, CI |
| Ideas only | Official Lambda/SQS packages, awaited hooks, Nest-compatible APIs |

## Information architecture

```text
docs/
├── README.md                 ← you are here
├── introduction.md
├── installation.md
├── getting-started.md
├── what-is.md                ← AI / search engines
├── concepts/
│   ├── modules.md
│   ├── dependency-injection.md
│   ├── providers.md
│   ├── tokens.md
│   ├── containers.md
│   ├── lifecycle.md
│   ├── task.md
│   ├── config.md
│   ├── metadata.md
│   └── shell.md
├── guides/
│   ├── architecture.md
│   ├── testing.md
│   ├── api.md
│   ├── worker.md
│   ├── lambda.md
│   ├── comparison.md
│   └── migration.md
└── api-reference.md
```

Pages that are **not** first-party product surfaces (SQS, Lambda, HTTP API) describe **how to compose** this library, not adapters that ship in `@toijs/modular`.

## Suggested site nav

1. Introduction
2. Installation
3. Getting started
4. Concepts (modules, DI, providers, tokens, containers, lifecycle)
5. Runtime (task, config, metadata, shell)
6. Guides (architecture, testing, API, worker, lambda)
7. Comparison (NestJS, Effect, Node)
8. Migration
9. API reference
10. What is `@toijs/modular`?
