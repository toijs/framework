# Getting started

**Problem.** You need a first running process that registers a service and resolves it after bootstrap.

**Concept.** One `Launcher`, one or more module factories, providers registered in `prepare`, work done in `ready` (or via `task`).

**Explanation.** `start()` throws `No modules registered` if `modules` is empty. Duplicate `name`s are skipped after the first. A module with a falsy `name` is skipped.

**Code example**

```ts
import { Injectable, Launcher, type Module } from "@toijs/modular";

@Injectable()
class Greeter {
  greet(name: string) {
    return `hello ${name}`;
  }
}

function AppModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register([Greeter]);
  };

  const ready = () => {
    const greeter = launcher.container.resolve(Greeter);
    console.log(greeter.greet("modular"));
  };

  return { name: "app", prepare, ready };
}

await new Launcher().modules([AppModule]).start();
```

Expected: prints `hello modular`.

**Compose several modules**

```ts
await new Launcher()
  .modules([ConfigModule, UserModule, OrderModule])
  .start();
```

Order of `.modules([...])` is the resolve order for those factories. A module’s `dependencies` are resolved **after** that module is recorded (parent first, then deps). That is the opposite of NestJS `imports`.

**Common mistakes**

- Forgetting `container.register` — `resolve` throws `DI: no provider for token …`.
- `@Injectable()` with constructor args but no token list — deps are not injected; they will be `undefined` or construction will miss arguments.
- Using `await` inside `start()`’s hooks and expecting later modules to wait.

**Best practices**

- Name modules with a prefix: `feature.*`, `lib.*`, `toijs.*` (convention in Lamtoi apps, not enforced).
- Register providers in `prepare`, not in `ready`.
- Resolve in `ready` or in a task handler after async infrastructure is up.

**When to use.** Any new app entrypoint.

**When not to use.** Throwaway scripts with a single file and no composition need.
