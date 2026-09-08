# Dependency injection

**Problem.** Services should not construct their collaborators with `new`. Tests should replace a repository without rewriting the service.

**Concept.** A `Container` maps an `InjectionToken` to a provider. Classes declare constructor tokens with `@Injectable([A, B])`. The container constructs `new UseClass(...deps)`.

**Explanation.** This is **not** NestJS-style reflection. `Container` never reads `design:paramtypes`. If the inject list is empty, a class is constructed with **no arguments**.

Supported injection:

| Mechanism | Where | Optional? |
| --- | --- | --- |
| Constructor injection | `@Injectable([TokenA, TokenB])` | Per-index `@Optional()` |
| Token override | `@Inject(token)` on a parameter | Combine with `@Optional()` |
| Factory injection | `useFactory` + `inject: [tokens]` | No — missing token throws |
| Existing | `useExisting` aliases another token | No |

Scopes:

| Scope | Behavior | Who can set it |
| --- | --- | --- |
| `singleton` (default) | One instance per container, cached in `instances` | Class shorthand, `useClass`, `useFactory`; implied for `useValue` / `useExisting` |
| `transient` | New instance every `resolve` | `useClass.scope`, `useFactory.scope` only |

There is **no** request scope.

**Code example — constructor injection**

```ts
import { Injectable } from "@toijs/modular";
import { UserRepository } from "./user.repository.js";

@Injectable([UserRepository])
export class UserService {
  constructor(private readonly users: UserRepository) {}
}
```

**Code example — class / value / factory / existing**

```ts
launcher.container.register([UserRepository, UserService]);

launcher.container.register({
  provide: "app.name",
  useValue: "demo",
});

launcher.container.register({
  provide: "clock",
  useFactory: () => () => Date.now(),
});

launcher.container.register({
  provide: "Users",
  useExisting: UserService,
});
```

**Code example — token + optional**

```ts
import { Inject, Injectable, Optional } from "@toijs/modular";

@Injectable()
export class Mailer {
  constructor(
    @Inject("smtp") private readonly smtp: { host: string },
    @Optional() @Inject("audit") private readonly audit?: { send(e: string): void },
  ) {}
}
```

`@Optional()` is stored as a `Set` of parameter indexes. `resolveInternal(token, true)` returns `undefined` when the token is missing.

**Singleton vs transient**

```ts
launcher.container.register({
  provide: UserService,
  useClass: UserService,
  inject: [UserRepository],
  scope: "transient",
});
```

Re-`register` of the same token **deletes** the cached singleton (`instances.delete`).

**Common mistakes**

- `@Injectable()` with a non-empty constructor and no list — dependencies are not passed.
- Assuming TypeScript types are tokens (`constructor(private users: UserRepository)` without `@Injectable([UserRepository])`).
- `@Optional()` on a factory `inject` list — not supported.
- Expecting `scope: "transient"` on `useValue` — ignored; values are always cached as singleton records.

**Best practices**

- Always pass the inject list matching constructor order.
- Use classes as tokens for application services; use `string` / `symbol` for interfaces and config blobs.
- Register in `prepare`; resolve after the graph is complete.

**When to use.** Any class that needs collaborators.

**When not to use.** Pure functions with no collaborators; do not force them through the container.
