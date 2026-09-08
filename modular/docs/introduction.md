# Introduction

**Problem.** TypeScript applications need a way to split features, wire dependencies, and start in a defined order. A full HTTP framework is one answer. Manual `new Service(new Repo())` is another. `@toijs/modular` is a third: composition and DI without an HTTP runtime.

**Concept.** The unit of composition is a **module factory**: a function that receives a `Launcher` and returns a `Module`. The `Launcher` owns a `Container` and the runtime services `Task`, `Config`, `Metadata`, and `Shell`.

**Explanation.** You list factories on `new Launcher().modules([...]).start()`. `start()` resolves each factory (and `dependencies`), then calls `prepare`, `register`, and `ready` on every module, in that order. Providers live on **one** container (`launcher.container`) unless you create a child yourself.

**What it provides**

- Module factories and a three-hook lifecycle
- Explicit DI (`@Injectable([tokens])`, class/value/factory/existing)
- A named task bus for cross-module coordination
- Config and metadata stores
- A shell for host libraries (Express, Vue) to create an app instance

**What it does not provide**

- HTTP, routing, pipes, guards, OpenAPI
- Request-scoped providers
- An ORM (see `@toijs/typeorm`)
- A CLI generator
- Official AWS Lambda or SQS packages

**Code example**

```ts
import { Launcher, type Module } from "@toijs/modular";

function HelloModule(_launcher: Launcher): Module {
  return {
    name: "hello",
    ready: () => {
      console.log("ready");
    },
  };
}

await new Launcher().modules([HelloModule]).start();
```

**Common mistakes**

- Treating this as NestJS: there is no `@Module()`, no `imports` array, no constructor type reflection.
- Assuming `start()` waits for async `register` (it does not).
- Calling `shell.create` from a feature module (kits own the host).

**Best practices**

- Put `ConfigModule` first so `config.define` runs in that factory body before other factories.
- Keep domain classes free of `Launcher` except at the module boundary.
- Use `task.subscribe` for work that must run after an async side effect (database connect).

**When to use.** You want modules + DI in TypeScript, and you will choose HTTP (or none) yourself.

**When not to use.** You need NestJS’s platform, Effect’s typed runtime, or a documented, licensed, tested framework with a community.
