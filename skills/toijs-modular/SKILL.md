---
name: toijs-modular
description: >-
  Build apps with @toijs/modular: Launcher, Module factories, Container DI
  (@Injectable), Task, Config, Metadata, Shell. Use when creating or editing
  modules, bootstrapping API/web apps, registering providers, or wiring
  launcher.task / launcher.config / launcher.shell.
---

# @toijs/modular

Lamtoi composition root. **Not NestJS.** There is no `@Module()`, no `imports` array, no constructor param reflection.

Types and implementation: `@toijs/modular/src/{launcher,di,task,config,metadata}`.

Database work: read `toijs-typeorm` **before** writing entities, repos, or `TypeORMModule`.

## Pick the primitive

| Need | Use |
|------|-----|
| App bootstrap | `new Launcher().modules([...]).start()` |
| Feature / lib wiring | `ModuleFactory` → `{ name, prepare, register, ready }` |
| Services, repos, controllers | `launcher.container` + `@Injectable([tokens])` |
| Cross-module events | `launcher.task.subscribe` / `invoke` |
| App settings | `launcher.config.define` / `resolve("dot.path")` |
| Shared runtime bag | `launcher.metadata.define` / `resolve` / `subscribe` |
| Express / Vue instance | `launcher.shell.create` / `register` / `ready` |

## Bootstrap

Always import `@/required` first (reflect-metadata, dotenv). Then:

```ts
import { Launcher } from "@toijs/modular";

void new Launcher()
  .modules([ConfigModule, /* kits */, /* features */])
  .start();
```

`start()` throws if no modules. Duplicate `name`s are skipped.

## Module factory

A module is a **function**, not a class:

```ts
import type { Module } from "@toijs/modular";
import { Launcher } from "@toijs/modular";

export function AuthModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register([LoginService, LoginController]);
  };

  return { name: "feature.auth", prepare };
}
```

| Field | When |
|-------|------|
| factory body | Runs during resolve (before any hook). Use for `config.define`, `setEntities`, `container.register` of singletons other modules need immediately |
| `prepare` | Subscribe tasks, register DI classes, define routes, i18n, layout |
| `register` | Create the host app (`shell.create`) |
| `ready` | After host exists (rarely used; prefer `shell.ready`) |
| `dependencies` | Extra `ModuleFactory[]` resolved first |

`start()` **awaits** `prepare*` then `register*` in order. `ready*` is fire-and-forget (not awaited).

### Names

| Prefix | Meaning | Example |
|--------|---------|---------|
| `feature.*` | App feature | `feature.auth` |
| `shared.*` | Web shared | `shared.http` |
| `lib.*` | API / kit | `lib.config`, `lib.express-kit` |
| `toijs.*` | Package module | `toijs.typeorm` |

Export `FooModule` from the feature `index.ts`. Pass the factory (not an instance) to `.modules()`.

## Lifecycle vs Shell

Kits own the host. Feature modules **subscribe**; they do not call `shell.create`.

```
resolve factories → prepare* → register* → ready*
```

`Shell.create(fn)` sets the instance, then invokes:

1. `task.root.register` — `shell.register(cb)` (`context.data` is Express or Vue `App`)
2. `task.root.ready` — `shell.ready(cb)`

API (`ExpressKitModule`): `register` → `shell.create(() => express())`; `prepare` wires `shell.register` (router) and `shell.ready` (listen).

Web (`VueKitModule`): `register` → `shell.create` (Vue app + `provide` launcher); `prepare` wires `shell.register` (router). Features use `shell.ready` for Pinia / Toife.

```ts
launcher.shell.ready((context: TaskContext) => {
  (context.data as App).use(createPinia());
});
```

Vue components: `useLauncher` / `useTask` / `useMetadata` from `@toijs/vue-kit` (inject). Do not import a global launcher.

## DI

**Tokens must be explicit.** `@Injectable()` with an empty list does not read constructor types.

```ts
import { Injectable } from "@toijs/modular";

@Injectable([UserRepository, AuthRefreshTokenRepository])
export class LoginService {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: AuthRefreshTokenRepository,
  ) {}
}
```

Register in `prepare` (class as its own token, **singleton** by default):

```ts
launcher.container.register([
  UserRepository,
  LoginService,
  LoginController,
]);
```

Other providers:

```ts
launcher.container.register({ provide: ConnectionManager, useValue: connectionManager });
launcher.container.register({ provide: "TOKEN", useFactory: (c) => ..., inject: [Config] });
launcher.container.register({ provide: IFoo, useClass: Foo, inject: [Bar], scope: "transient" });
```

| API | Notes |
|-----|--------|
| `@Injectable([A, B])` | Constructor token list (preferred) |
| `@Inject(token)` | Per-parameter override (string/symbol/class) |
| `@Optional()` | Missing dep → `undefined` |
| `container.resolve(T)` | Throws if missing |
| `container.tryResolve(T)` | `undefined` if missing |
| `launcher.define("http", http)` | Attach on launcher **and** register in DI |

Built-in values already registered: `Launcher`, `Task`, `Metadata`, `Config`, `Shell`.

Do not add `emitDecoratorMetadata` to skip the inject list — this container ignores design:paramtypes.

## Task

Cross-module bus. Sequential by default (each handler sees previous `result`; `undefined` does not overwrite).

```ts
launcher.task.subscribe("auth.open-login", (ctx: TaskContext) => {
  useLoginModalStore().open(ctx.data as OpenLoginOptions);
});

launcher.task.invoke("auth.open-login", { closable: true });
```

`TaskContext`: `{ data, result, index, end }`. `subscribe` returns an unsubscribe fn.

Names: `feature.action` (`auth.open-login`) or exported constants (`TASK_HTTP_UNAUTHORIZED`, `EVENT_DATABASE_CONNECTED`). Do not invent a second event emitter.

## Config

Stored under metadata key `metadata.config`. `define` **merges** objects.

```ts
export function ConfigModule(launcher: Launcher): Module {
  launcher.config.define(config); // factory body — available before other hooks
  return { name: "lib.config" };
}
```

```ts
launcher.config.resolve("database");       // object
launcher.config.resolve("app.port");       // nested
launcher.config.resolve("servers.0.host"); // array index
```

Put `ConfigModule` first in `.modules([...])`.

## Metadata

Generic key/value + change events (`event.metadata.changed` / `event.metadata.changed.<name>`).

```ts
launcher.metadata.define(METADATA_HTTP, http);
launcher.metadata.resolve(METADATA_HTTP);
launcher.metadata.subscribe("notification.count", (patch) => { /* { key: value } */ });
```

`define(name, value, merge = true)`: objects/arrays merge; pass `false` to replace.

## Attach a capability

```ts
launcher.define("http", httpClient); // launcher.http + DI token "http"
```

Throws if the property already exists.

## Do not

- Write NestJS `@Module({ imports, providers, controllers })`.
- Use `@Injectable()` without `[tokens]` when the constructor has deps.
- Call `shell.create` from a feature — kits own the host.
- Treat `prepare`/`register` as fire-and-forget — `start()` awaits them. `ready` is not awaited.
- Duplicate module `name`s and expect both to run.
- Read `config` in another module's factory body unless `ConfigModule` is listed first (and defines in **its** factory body).
