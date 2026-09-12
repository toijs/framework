# @toijs/modular

Compose TypeScript applications with an isomorphic module pattern, explicit DI, and Shell — on Node.js and in the browser.
[![npm version](https://img.shields.io/npm/v/@toijs/modular.svg)](https://www.npmjs.com/package/@toijs/modular)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg)](https://www.typescriptlang.org/)
[![ESM](https://img.shields.io/badge/module-ESM-brightgreen.svg)](https://nodejs.org/api/esm.html)
[![GitHub](https://img.shields.io/badge/github-toijs%2Fframework-181717.svg)](https://github.com/toijs/framework)

## Overview

`@toijs/modular` is an isomorphic **composition pattern** for TypeScript: modules, explicit dependency injection, a bootstrap lifecycle, and a small runtime (`Task`, `Config`, `Metadata`, `Shell`). Use it on **Node.js servers** and in **browser clients**. App hosts (Express, Vue, React, …) plug in through **Shell** kits — this package never embeds HTTP or UI.

It does **not** include HTTP, routing, validation, GraphQL, an ORM, or a renderer. Those belong in the application or in separate kits such as `@toijs/express-kit`, `@toijs/vue-kit`, and `@toijs/typeorm`.

## Why @toijs/modular?

Most TypeScript backends either assemble everything by hand or adopt a full platform such as NestJS. Frontends often wire Pinia/Vuex/React context ad hoc. `@toijs/modular` sits between those options: one composition model for server and client, without inheriting an HTTP server, a CLI, or a decorator-heavy application model.

Constructor dependencies are **explicit**. `@Injectable([UserRepository])` does not read `design:paramtypes`. That is intentional — the container never infers tokens from TypeScript types.
## Features

Implemented in this package:

- **Modules as functions** — a factory returns `{ name, dependencies?, prepare?, register?, ready? }`
- **Dependency injection** — class, value, factory, and existing providers
- **Explicit tokens** — `@Injectable([tokens])`, `@Inject(token)`, `@Optional()`
- **Scopes** — `singleton` (default) and `transient` on class and factory providers
- **Parent/child containers** — `container.createChild()`
- **Lifecycle** — resolve factories, then `await prepare` → `await register` → `ready` (not awaited)
- **Task bus** — `subscribe` / `invoke` (`sequential` or `parallel`)
- **Config** — nested values via dot paths on a metadata-backed store
- **Shell** — host-app bootstrap (`create` / `register` / `ready`) for Express, Vue, React, … kits
- **Isomorphic** — same pattern on Node.js server and browser client
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
| `prepare` | Register providers, subscribe to tasks, define routes in a kit — **awaited** |
| `register` | Create the host (`shell.create`) — **awaited**; kits must **return** the create promise |
| `ready` | After register — **not** awaited; often unused in features |

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

`await Launcher.start()`:

```text
resolve factories (and `dependencies`)
        ↓
await prepare()   × all modules
        ↓
await register()  × all modules
        ↓
     ready()      × all modules   (not awaited)
```

Hooks are `() => void | Promise<void>`. `start()` **awaits** `prepare` and `register` sequentially. **`ready` is not awaited.** Kits that create a host must **return** `shell.create(...)` from `register` so bootstrap waits for the host and `task.root.register` / `task.root.ready`.

`Shell` is the second, host-specific flow used by app-shell kits (Express, Vue, React, …):

```text
await shell.create(fn)
        ↓
await invoke "task.root.register"
        ↓
await invoke "task.root.ready"
```

Feature modules subscribe with `shell.register` / `shell.ready`. They should not call `shell.create`. The same modular pattern runs on Node.js and in the browser; only the kit (shell) changes.
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
 └── shell       host instance (Express, Vue, React, …)

Module factory
 ├── factory body     runs at resolve time
 ├── prepare          awaited by start()
 ├── register         awaited by start()
 └── ready            not awaited
```

Keep domain types and business logic as plain TypeScript. Depend on `@toijs/modular` only at the composition root (modules, `@Injectable`, `container.register`). Same pattern on server and browser; kits supply the app shell.
## Use cases

Fits:

- API process composed with a kit such as `@toijs/express-kit`
- Vue / React SPA composed with a UI kit (`@toijs/vue-kit` or equivalent)
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
| Lifecycle | `await prepare` → `await register` → `ready` (not awaited) | Nest lifecycle hooks |
| HTTP / UI | Not included — Shell + kits (Express, Vue, React, …) | First-class HTTP |
| Runtime | Node.js and browser | Primarily Node.js |
| CLI | Not included | `@nestjs/cli` |
| ORM | Separate `@toijs/typeorm` | Separate `@nestjs/typeorm` etc. |
| Lambda / worker | Usable; no official adapter | Usable; larger bootstrap |
| Ecosystem | Small (`typeorm`, private kits) | Large |
| Learning curve | Small API, unusual module shape | Large API, more tutorials |

Use NestJS when you want a platform. Use `@toijs/modular` when you want isomorphic composition and DI without that platform.
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
| `@toijs/modular` | v1.0.4, `private: false` | Core (isomorphic composition) |
| `@toijs/typeorm` | v1.0.7, `private: false` | `TypeORMModule`, `ConnectionManager` |
| `@toijs/express-kit` | `private: true` | Express `shell.create` + router (server shell) |
| `@toijs/vue-kit` | `private: true` | Vue `shell.create` + router (browser shell) |
| `@toijs/graphql` | `private: true` | Stub — do not treat as shipped |

HTTP, Vue, React, i18n, layout, and device kits live outside this package. They are not required to use the container.
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

- Await `ready` hooks (today only `prepare` / `register` are awaited)
- Request scope
- CJS build
- Official Lambda / SQS examples as packages
- First-party React kit
- Test utilities
- License, changelog, CI, coverage
## Open-source status

| Item | Status |
| --- | --- |
| Version | `1.0.4` |
| License | **Missing** (GitHub `license: null`, no `license` field in `package.json`) |
| Tests | **None** in this package |
| CI | **None** in the repository |
| Changelog | **Missing** |
| Node `engines` | **Not declared** |
| ESM / CJS | ESM only |
| README (previous) | **Missing** — this file is new |

Version `1.0.4` means the package is versioned, not that it has a stability policy. Treat breaking changes as possible until a changelog and semver policy exist.
## License

**NEEDS VERIFICATION.** No license file is present in the package or on [toijs/framework](https://github.com/toijs/framework). Do not assume MIT or any other license until one is published.
