# Lifecycle

**Problem.** Modules must register providers before a host exists, and a host must exist before listen/mount.

**Concept.** Two flows exist. Do not mix them up.

## 1. Launcher module lifecycle (source of truth)

```text
modules([...]) stored on launcher.options.modules
        ↓
start()
        ↓
resolveModuleInstances
  for each factory:
    instance = factory(launcher)     // factory body
    skip if name missing or duplicate
    store in launcher.instances
    recurse instance.dependencies    // AFTER the parent is stored
        ↓
for each instance: prepare?.()       // not awaited
        ↓
for each instance: register?.()      // not awaited
        ↓
for each instance: ready?.()         // not awaited
```

This is **not** `onModuleInit` / Nest lifecycle. Hook names are `prepare`, `register`, `ready`.

`start()` is `async` only because `resolveModuleInstances` is `async`. The inner loop does not `await` factories or hooks (factories are sync in the type). Returning a `Promise` from `prepare` is ignored.

## 2. Shell / host lifecycle (kits)

```text
shell.create(callback)
        ↓
instance = await callback()
        ↓
task.invoke("task.root.register", instance)
        ↓
task.invoke("task.root.ready", instance)
```

`shell.register(fn)` = `task.subscribe("task.root.register", fn)`.  
`shell.ready(fn)` = `task.subscribe("task.root.ready", fn)`.

Kits call `create` from **their** `register` hook. Features call `shell.register` / `shell.ready` from **their** `prepare` so the subscription exists before `create` runs.

Because all `prepare` hooks run before all `register` hooks, a feature’s `prepare` (subscribe) runs before a kit’s `register` (`create`). That ordering is why the split exists.

**Code example — feature**

```ts
export function UserModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register([UserService]);
  };
  return { name: "feature.user", prepare };
}
```

**Code example — kit-shaped host (do not copy into features)**

```ts
export function ExpressKitModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.shell.register((context) => {
      // context.data is the express app
    });
    launcher.shell.ready((context) => {
      // listen
    });
  };

  const register = () => {
    void launcher.shell.create(() => {
      return createApp();
    });
  };

  return { name: "toijs.express-kit", prepare, register };
}
```

**Async infrastructure.** `@toijs/typeorm` connects inside `register` and then `task.invoke("event.database.connected", name)`. Repositories that run in the same turn as `start()` may see no connection. Subscribe to that event, or handle a missing connection.

**Common mistakes**

- `await`ing `start()` and assuming the database is connected (TypeORM’s `register` is not awaited).
- Calling `shell.create` from two modules — the second overwrites `instance`; both still invoke root tasks.
- Putting `container.register` only in `ready` while another module’s `prepare` already `resolve`d the token.

**Best practices**

- Features: `prepare` only.
- Kits: `prepare` (subscribe) + `register` (`create`).
- Async: `task.subscribe`, not “make the hook async and hope”.

**When to use.** Every application that calls `start()`.

**When not to use.** If you only need `Container`, skip `Launcher` and you skip this lifecycle.
