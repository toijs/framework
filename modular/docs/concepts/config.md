# Config

**Problem.** Modules need shared settings without importing a global `config.json`.

**Concept.** `Config` stores one object under metadata key `"metadata.config"`. `define` **merges** objects. `resolve` walks dot paths, including array indexes (`servers.0.host`).

**Explanation.** `define(config)` calls `metadata.define("metadata.config", config, true)`. Nested objects are shallow-merged at the config root, not deep-merged through the whole tree (metadata merge is one-level spread).

`resolve()` with no key returns the whole object. Missing paths return `undefined`. No schema validation.

**Code example**

```ts
import { Launcher, type Module } from "@toijs/modular";

export function ConfigModule(launcher: Launcher): Module {
  launcher.config.define({
    app: { port: 3000 },
    database: {
      default: { type: "mysql", host: "localhost" },
    },
  });

  return { name: "lib.config" };
}

// later
launcher.config.resolve("app.port"); // 3000
```

Put `ConfigModule` **first** in `.modules([...])` and define in the **factory body**, not in `prepare`, if other factories read config during resolve.

**Common mistakes**

- Defining config in `prepare` while `TypeORMModule`’s factory already ran (TypeORM reads config in `register`, so `prepare` is still OK for TypeORM; factories that read config in their body are not).
- Expecting deep merge of nested `database.default`.

**Best practices**

- One `ConfigModule` per app.
- Keep secrets in the environment; put `process.env` reads in the config object you `define`.

**When to use.** App settings.

**When not to use.** Per-request state — use a child container or pass arguments.
