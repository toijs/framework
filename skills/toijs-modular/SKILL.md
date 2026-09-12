---
name: toijs-modular
description: >-
  Build apps with @toijs/modular: Launcher, Module factories, Container DI
  (@Injectable), Task, Config, Metadata, Shell. Use when creating or editing
  modules, bootstrapping API/web apps, registering providers, or wiring
  launcher.task / launcher.config / launcher.shell. Isomorphic pattern for
  Node.js server and browser clients with Express / Vue / React shells.
---

# @toijs/modular

Lamtoi **composition pattern** (not a framework). Same API on **Node.js server** and **browser client**. Host frameworks (Express, Vue, React, …) plug in via **Shell** kits — modular never embeds HTTP or UI.

**Not NestJS.** There is no `@Module()`, no `imports` array, no constructor param reflection.

Types and implementation: `@toijs/modular/src/{launcher,di,task,config,metadata}`.

Database work: read `toijs-typeorm` **before** writing entities, repos, or `TypeORMModule`.

## Pick the primitive

| Need | Use |
|------|-----|
| App bootstrap | `await new Launcher().modules([...]).start()` |
| Feature / lib wiring | `ModuleFactory` → `{ name, prepare, register, ready }` |
| Services, repos, controllers | `launcher.container` + `@Injectable([tokens])` |
| Cross-module events | `launcher.task.subscribe` / `invoke` |
| App settings | `launcher.config.define` / `resolve("dot.path")` |
| Shared runtime bag | `launcher.metadata.define` / `resolve` / `subscribe` |
| Express / Vue / React host | `launcher.shell.create` / `register` / `ready` |

## Bootstrap

Always import `@/required` first (reflect-metadata, dotenv) in Node apps. Then:

```ts
import { Launcher } from "@toijs/modular";

await new Launcher()
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
| `prepare` | Subscribe tasks, register DI classes, define routes, i18n, layout — **awaited** by `start()` |
| `register` | Create the host (`shell.create`) — **awaited**; must **return** the create promise |
| `ready` | After host exists — **not** awaited (fire-and-forget); prefer `shell.ready` for host work |
| `dependencies` | Extra `ModuleFactory[]` resolved first |

### `start()` lifecycle

```text
resolve factories → await prepare* → await register* → ready* (not awaited)
```

Hooks are `() => void | Promise<void>`. Return promises from `prepare` / `register` when async work must finish before the next phase.

### Names

| Prefix | Meaning | Example |
|--------|---------|---------|
| `feature.*` | App feature | `feature.auth` |
| `shared.*` | Web shared | `shared.http` |
| `lib.*` | API / kit | `lib.config`, `lib.express-kit` |
| `toijs.*` | Package module | `toijs.typeorm` |

Export `FooModule` from the feature `index.ts`. Pass the factory (not an instance) to `.modules()`.

## Lifecycle vs Shell

Modular is isomorphic; **kits** choose the shell:

| Side | Kit | `shell.create` returns |
|------|-----|------------------------|
| Server | `ExpressKitModule` | Express app |
| Browser | `VueKitModule` (or a React kit) | Vue `App` / React root |
| Worker / CLI | none | skip Shell |

Kits own the host. Feature modules **subscribe**; they do not call `shell.create`.

```
resolve factories → await prepare* → await register* → ready*
```

`Shell.create(fn)` sets the instance, then invokes:

1. `task.root.register` — `shell.register(cb)` (`context.data` is Express, Vue `App`, React root, …)
2. `task.root.ready` — `shell.ready(cb)`

API (`ExpressKitModule`): `prepare` wires `shell.register` (router) and `shell.ready` (listen); `register` **returns** `shell.create(() => express())`.

Web (`VueKitModule`): `prepare` wires `shell.register` (router); `register` **returns** `shell.create` (Vue app + `provide` launcher). Features use `shell.ready` for Pinia / Toife / mount.

```ts
launcher.shell.ready((context: TaskContext) => {
  (context.data as App).use(createPinia());
});
```

Kit `register` must return the create promise:

```ts
const register = () => launcher.shell.create(() => createApp());
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
- Fire-and-forget `shell.create` inside `register` — **return** the promise so `start()` awaits the host.
- Assume `ready` is awaited — it is not; use `prepare`/`register` for ordered async.
- Duplicate module `name`s and expect both to run.
- Read `config` in another module's factory body unless `ConfigModule` is listed first (and defines in **its** factory body).
- Treat modular as Node-only — browser SPAs use the same pattern with a UI shell kit.
