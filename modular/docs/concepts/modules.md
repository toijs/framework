# Modules

**Problem.** Features need a boundary for registration without a global `main.ts` that lists every class.

**Concept.** A module is a **factory function** `(launcher: Launcher) => Module`. It is not a class and not a NestJS `@Module()`.

```text
Module
 ├── name
 ├── dependencies?   extra factories, resolved after this module
 ├── providers       via launcher.container.register (not a field)
 ├── lifecycle       prepare → register → ready
 └── composition     listed on Launcher.modules([...])
```

**Explanation.** `Module` in source:

```ts
export type Module = {
  name: string;
  dependencies?: ModuleFactory[];
  prepare?: () => void;
  register?: () => void;
  ready?: () => void;
};

export type ModuleFactory = (launcher: Launcher) => Module;
```

There is **no** `providers`, `imports`, `exports`, or `controllers` array on `Module`. Providers are registered on the shared `launcher.container`.

**When each piece runs**

| Step | When | Typical work |
| --- | --- | --- |
| Factory body | During `resolveModuleInstances`, before any hook | `config.define`, `setEntities`, register values other factories need immediately |
| `prepare` | After all listed factories (and deps) are resolved | `container.register`, `task.subscribe`, kit `router.define`, `shell.register` |
| `register` | After every `prepare` | Kits: `shell.create` |
| `ready` | After every `register` | Rare in features; kits may listen via `shell.ready` instead |

`Launcher.start()` does **not** await hooks. `TypeORMModule.register` is `async` in `@toijs/typeorm` and races with later code unless you wait on `event.database.connected`.

**Dependencies.** If `UserModule` returns `dependencies: [SharedModule]`, the instances list is `[UserModule, …SharedModule]`. `UserModule`’s factory and later its `prepare` run **before** `SharedModule`’s `prepare`. Do not put “must run first” logic in a dependency; put that module **earlier** in `.modules([...])`.

**Duplicate names.** `instances` is a `Map<string, Module>`. A second factory with the same `name` is skipped entirely (factory already ran; hooks are not added). Empty `name` is skipped.

**Code example**

```ts
import { Launcher, type Module } from "@toijs/modular";
import { UserRepository } from "./user.repository.js";
import { UserService } from "./user.service.js";

export function UserModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register([UserRepository, UserService]);
  };

  return {
    name: "feature.user",
    prepare,
  };
}
```

**Nesting**

```ts
export function AppModule(launcher: Launcher): Module {
  return {
    name: "app",
    dependencies: [UserModule, OrderModule],
  };
}
```

Prefer a flat `.modules([UserModule, OrderModule])` until you understand the parent-first dependency order.

**Common mistakes**

- Writing `export class UserModule {}` with `@Module({ providers: [...] })` — that API does not exist.
- Expecting per-module containers or `exports` — all modules share `launcher.container`.
- Listing a module twice with different factories but the same `name`.
- Putting async connect in `register` and resolving a repository in the same tick in `ready`.

**Best practices**

- One feature → one factory → one `name`.
- Register only that feature’s classes.
- Export the factory from the feature `index.ts`. Pass the function, not `UserModule()`.

**When to use.** Any feature or library that needs to register providers or subscribe to tasks.

**When not to use.** A single class with no composition; just `new Container().register(...).resolve(...)` if you do not need `Launcher`.
