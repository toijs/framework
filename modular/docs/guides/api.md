# Guide: HTTP API

**Problem.** You want an HTTP API composed from modules.

**Concept.** `@toijs/modular` does **not** ship HTTP. In Lamtoi apps, `@toijs/express-kit` (`private: true`) calls `shell.create(() => express())` and listens on `config.app.port`. Feature modules `router.define` from that kit.

**Explanation.** If the Express kit is unavailable to you, bootstrap your own host in a kit-shaped module: `prepare` subscribes to `shell.register` / `shell.ready`; `register` calls `shell.create`.

This page is a **composition pattern**, not a promise that Express is part of `@toijs/modular`.

**Code example — feature without claiming kit APIs**

```ts
import { Injectable, Launcher, type Module } from "@toijs/modular";

@Injectable()
export class HealthService {
  status() {
    return { ok: true };
  }
}

export function HealthModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register([HealthService]);
  };
  return { name: "feature.health", prepare };
}
```

Wire HTTP in **your** kit using `launcher.container.resolve(HealthService)` inside a request handler.

**Common mistakes**

- Documenting `router.define` as a `modular` API — it lives in `@toijs/express-kit`.

**When to use.** API processes.

**When not to use.** If you need NestJS OpenAPI, versioning, and adapters today — use Nest or add those libraries yourself.
