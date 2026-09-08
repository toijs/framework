# @toijs/modular

Compose TypeScript applications with modules, explicit dependency injection, and a small runtime.

[![npm version](https://img.shields.io/npm/v/@toijs/modular.svg)](https://www.npmjs.com/package/@toijs/modular)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg)](https://www.typescriptlang.org/)
[![ESM](https://img.shields.io/badge/module-ESM-brightgreen.svg)](https://nodejs.org/api/esm.html)
[![GitHub](https://img.shields.io/badge/github-toijs%2Fframework-181717.svg)](https://github.com/toijs/framework)

## Overview

`@toijs/modular` is a composition layer for TypeScript applications. It provides a module factory, a dependency injection container, a bootstrap lifecycle, and a small set of runtime services (`Task`, `Config`, `Metadata`, `Shell`).

It does **not** include HTTP, routing, validation, GraphQL, or an ORM. Those belong in the application or in separate kits such as `@toijs/express-kit` and `@toijs/typeorm`.

## Why @toijs/modular?

Most TypeScript backends either assemble everything by hand or adopt a full platform such as NestJS. `@toijs/modular` sits between those options: you get modules and DI without inheriting an HTTP server, a CLI, or a decorator-heavy application model.

Constructor dependencies are **explicit**. `@Injectable([UserRepository])` does not read `design:paramtypes`. That is intentional — the container never infers tokens from TypeScript types.

## Features

Implemented in this package:

- **Modules as functions** — a factory returns `{ name, dependencies?, prepare?, register?, ready? }`
- **Dependency injection** — class, value, factory, and existing providers
- **Explicit tokens** — `@Injectable([tokens])`, `@Inject(token)`, `@Optional()`
- **Scopes** — `singleton` (default) and `transient` on class and factory providers
- **Parent/child containers** — `container.createChild()`
- **Lifecycle** — resolve factories, then `prepare` → `register` → `ready`
- **Task bus** — `subscribe` / `invoke` (`sequential` or `parallel`)
- **Config** — nested values via dot paths on a metadata-backed store
- **Shell** — host-app bootstrap (`create` / `register` / `ready`) used by kits

Not in this package:

- HTTP server, router, controllers as a framework primitive
- Request-scoped providers
- NestJS-style `@Module({ imports, providers })`
- First-party Lambda, SQS, or worker adapters
- Tests, changelog, and a published license (see [Open-source status](#open-source-status))

## Installation

```bash
npm install @toijs/modular
# or
pnpm add @toijs/modular
```

The package is **ESM-only** (`"type": "module"`). Node.js 18+ is the intended runtime; `engines` is not declared yet.

Enable class decorators in the consuming project. `@Injectable` is a class decorator. `@Inject` and `@Optional` are parameter decorators and need `experimentalDecorators` in `tsconfig.json`.

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

`emitDecoratorMetadata` is **not** required and is **not** read by this container.

## Quick Start

```ts
import { Injectable, Launcher, type Module } from "@toijs/modular";

@Injectable()
class UserService {
  list() {
    return [{ id: "1", name: "Ada" }];
  }
}

function AppModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register([UserService]);
  };

  const ready = () => {
    const users = launcher.container.resolve(UserService);
    console.log(users.list());
  };

  return { name: "app", prepare, ready };
}

await new Launcher().modules([AppModule]).start();
```

`start()` throws if `.modules()` was never called with at least one factory.

## Module example

A module is a **function**, not a class. There is no `@Module()` decorator.

```ts
import { Launcher, type Module } from "@toijs/modular";
import { UserService } from "./user.service.js";
import { UserRepository } from "./user.repository.js";

export function UserModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register([UserRepository, UserService]);
  };

  return { name: "feature.user", prepare };
}
```

Optional fields:

| Field | Role |
| --- | --- |
| `name` | Required identity. Duplicate names are **skipped**. Empty names are skipped. |
| `dependencies` | Extra `ModuleFactory[]` resolved after this module is recorded |
| `prepare` | Register providers, subscribe to tasks, define routes in a kit |
| `register` | Create the host (`shell.create`) — used by kits, not feature modules |
| `ready` | After register; often unused in features |

The factory body runs during resolve, **before** any lifecycle hook. Put `config.define` there so later factories can read config.

## Dependency Injection example

Tokens must be listed. An empty `@Injectable()` does not inspect constructor types.

```ts
import { Injectable } from "@toijs/modular";
import { UserRepository } from "./user.repository.js";

@Injectable([UserRepository])
export class UserService {
  constructor(private readonly users: UserRepository) {}

  find(id: string) {
    return this.users.findById(id);
  }
}
```

Register the class as its own token (singleton by default):

```ts
launcher.container.register([UserRepository, UserService]);
```

## Provider example

```ts
import { ConnectionManager } from "@toijs/typeorm";

// Class as its own token
launcher.container.register(UserService);

// Value
launcher.container.register({
  provide: ConnectionManager,
  useValue: connectionManager,
});

// Factory
launcher.container.register({
  provide: "clock",
  useFactory: () => () => Date.now(),
});

// Existing (alias)
launcher.container.register({
  provide: "Users",
  useExisting: UserService,
});

// Class with explicit inject list and transient scope
launcher.container.register({
  provide: UserService,
  useClass: UserService,
  inject: [UserRepository],
  scope: "transient",
});
```

`useValue` and `useExisting` are always stored as singletons. `scope` is honored only on `useClass` and `useFactory`.

## Token injection

```ts
import { Inject, Injectable, Optional } from "@toijs/modular";

const CONFIG = Symbol("config");

@Injectable()
class ReportService {
  constructor(
    @Inject(CONFIG) private readonly config: { env: string },
    @Optional() @Inject("logger") private readonly logger?: { info(msg: string): void },
  ) {}
}

launcher.container.register({ provide: CONFIG, useValue: { env: "test" } });
launcher.container.register(ReportService);
```

`@Optional()` only applies to **class constructor** parameters. Factory `inject` arrays cannot mark a dependency optional; a missing token throws.

## Lifecycle

`Launcher.start()`:

```text
resolve factories (and `dependencies`)
        ↓
     prepare()   × all modules   (not awaited)
        ↓
     register()  × all modules   (not awaited)
        ↓
     ready()     × all modules   (not awaited)
```

Hooks are typed as `() => void`. Async functions are allowed by TypeScript but **`start()` does not await them**. Sequence async work with `launcher.task.subscribe` / `invoke` (this is how `@toijs/typeorm` signals `event.database.connected`).

`Shell` is a second, host-specific flow used by kits:

```text
shell.create(fn)
        ↓
invoke "task.root.register"
        ↓
invoke "task.root.ready"
```

Feature modules subscribe with `shell.register` / `shell.ready`. They should not call `shell.create`.

## Application composition

```ts
import { Launcher } from "@toijs/modular";
import { TypeORMModule } from "@toijs/typeorm";
import { ConfigModule } from "./config.module.js";
import { DatabaseModule } from "./database.module.js";
import { UserModule } from "./user.module.js";
import { OrderModule } from "./order.module.js";

await new Launcher()
  .modules([
    ConfigModule,     // factory body: config.define
    TypeORMModule,    // separate package
    DatabaseModule,   // setEntities before TypeORM register
    UserModule,
    OrderModule,
  ])
  .start();
```

`Launcher` constructs a `Container` and registers itself plus `Task`, `Metadata`, `Config`, and `Shell` as value providers.

`launcher.define("http", client)` attaches a property on the launcher **and** registers it in DI. It throws if the property already exists.

## Testing

There is no test helper in this package. Replace a production provider with a test double by registering over the same token:

```ts
import { Launcher } from "@toijs/modular";
import { UserModule } from "./user.module.js";
import { UserRepository } from "./user.repository.js";
import { InMemoryUserRepository } from "./user.repository.memory.js";

const launcher = new Launcher();
await launcher.modules([UserModule]).start();

launcher.container.register({
  provide: UserRepository,
  useClass: InMemoryUserRepository,
});

const users = launcher.container.resolve(UserRepository);
```

`register` deletes any cached singleton for that token, so the next `resolve` builds a new instance.

`container.tryResolve(token)` returns `undefined` instead of throwing. `container.has(token)` walks parent containers.

## Architecture

```text
Launcher
 ├── container   DI (providers, resolve, child containers)
 ├── task        named handler bus
 ├── metadata    key/value + change events
 ├── config      metadata-backed settings (dot paths)
 └── shell       host instance (Express, Vue, …)

Module factory
 ├── factory body     runs at resolve time
 ├── prepare
 ├── register
 └── ready
```

Keep domain types and business logic as plain TypeScript. Depend on `@toijs/modular` only at the composition root (modules, `@Injectable`, `container.register`).

## Use cases

Fits:

- API process composed with a kit such as `@toijs/express-kit`
- Vue SPA composed with `@toijs/vue-kit`
- CLI / batch scripts that need modules + DI
- Long-running workers, if **you** wire the consumer (no SQS adapter ships here)
- Lambda handlers, if **you** bootstrap `Launcher` per cold start (no Lambda adapter ships here)

Does not fit as a drop-in:

- Teams that want NestJS’s HTTP, OpenAPI, microservices, and ecosystem
- Request-scoped per-HTTP-request providers
- Effect-style typed functional programming
- CommonJS-only deployments

## Comparison

| | `@toijs/modular` | NestJS |
| --- | --- | --- |
| DI | Explicit tokens, class/value/factory/existing | Reflection + tokens, large provider model |
| Module | Function factory | `@Module()` class |
| Lifecycle | `prepare` → `register` → `ready` (sync call, not awaited) | Nest lifecycle hooks |
| HTTP | Not included | First-class |
| CLI | Not included | `@nestjs/cli` |
| ORM | Separate `@toijs/typeorm` | Separate `@nestjs/typeorm` etc. |
| Lambda / worker | Usable; no official adapter | Usable; larger bootstrap |
| Ecosystem | Small (`typeorm`, private kits) | Large |
| Learning curve | Small API, unusual module shape | Large API, more tutorials |

Use NestJS when you want a platform. Use `@toijs/modular` when you want composition and DI without that platform.

A longer comparison with Effect and plain Node.js is in [docs/guides/comparison.md](docs/guides/comparison.md).

## API overview

| Export | Kind |
| --- | --- |
| `Launcher` | Bootstrap: `modules()`, `start()`, `define()`, `container`, `task`, `config`, `metadata`, `shell` |
| `Container` | `register`, `resolve`, `tryResolve`, `has`, `createChild`, `clear` |
| `Injectable`, `Inject`, `Optional` | Decorators |
| `Task` | `subscribe`, `unsubscribe`, `invoke(name, data?, type?)` |
| `Config` | `define`, `resolve(path?)` |
| `Metadata` | `define`, `resolve`, `subscribe`, `invoke` |
| `Shell` | `create`, `register`, `ready`, `getInstance` |
| `SCOPE_SINGLETON`, `SCOPE_TRANSIENT` | `"singleton"` / `"transient"` |
| `TASK_ROOT_REGISTER`, `TASK_ROOT_READY` | Shell task names |
| `METADATA_CONFIG`, `EVENT_METADATA_CHANGED` | Config / metadata keys |

## Packages / integrations

| Package | Status | Role |
| --- | --- | --- |
| `@toijs/modular` | v1.0.3, `private: false` | Core |
| `@toijs/typeorm` | v1.0.7, `private: false` | `TypeORMModule`, `ConnectionManager` |
| `@toijs/express-kit` | `private: true` | Express `shell.create` + router |
| `@toijs/vue-kit` | `private: true` | Vue `shell.create` + router |
| `@toijs/graphql` | `private: true` | Stub — do not treat as shipped |

HTTP, Vue, i18n, layout, and device kits live outside this package. They are not required to use the container.

## Documentation

- [Documentation index](docs/README.md)
- [Modules](docs/concepts/modules.md)
- [Dependency injection](docs/concepts/dependency-injection.md)
- [Containers](docs/concepts/containers.md)
- [Lifecycle](docs/concepts/lifecycle.md)
- [Architecture](docs/guides/architecture.md)
- [Examples](examples/README.md)

## Contributing

There is no `CONTRIBUTING.md` yet. Source of truth is `src/` in this package. Do not add NestJS APIs “for familiarity” — this runtime is not NestJS.

## Roadmap

Not implemented, not scheduled in-repo (ideas only):

- Awaited module hooks
- Request scope
- CJS build
- Official Lambda / SQS examples as packages
- Test utilities
- License, changelog, CI, coverage

## Open-source status

| Item | Status |
| --- | --- |
| Version | `1.0.3` |
| License | **Missing** (GitHub `license: null`, no `license` field in `package.json`) |
| Tests | **None** in this package |
| CI | **None** in the repository |
| Changelog | **Missing** |
| Node `engines` | **Not declared** |
| ESM / CJS | ESM only |
| README (previous) | **Missing** — this file is new |

Version `1.0.3` means the package is versioned, not that it has a stability policy. Treat breaking changes as possible until a changelog and semver policy exist.

## License

**NEEDS VERIFICATION.** No license file is present in the package or on [toijs/framework](https://github.com/toijs/framework). Do not assume MIT or any other license until one is published.
