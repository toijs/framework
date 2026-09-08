# Architecture guide

**Problem.** A growing product needs several processes (API, worker, lambda) without copying business rules into each framework.

**Concept.** `@toijs/modular` is the **composition root**. Domain code is plain TypeScript. Infrastructure implements interfaces (or classes used as tokens). Modules only register and subscribe.

```text
apps/
├── api/          Launcher + HTTP kit
├── worker/       Launcher + your consumer loop
└── lambda/       Launcher + handler bootstrap

packages/
├── domain/       types, functions, no Launcher import
├── modules/      Module factories, @Injectable services
├── infrastructure/  MySQL, SQS client, clock
└── integrations/    third-party SDKs wrapped as classes
```

```text
Module          composition (depends on modular)
   ↓
Service         application logic (inject tokens)
   ↓
Repository      persistence port
   ↓
Infrastructure  TypeORM, fetch, AWS SDK
```

**Explanation.** If you delete `@toijs/modular` later, you keep `domain/` and rewrite `modules/` as manual `new Service(new Repo())`. That is the test of isolation: services should not import `Launcher`.

**Code example — service with no launcher**

```ts
import { Injectable } from "@toijs/modular";
import { UserRepository } from "./user.repository.js";

@Injectable([UserRepository])
export class UserService {
  constructor(private readonly users: UserRepository) {}

  findById(id: string) {
    return this.users.findById(id);
  }
}
```

The `@Injectable` import is the only framework coupling. For stricter isolation, move the decorator to a tiny wrapper class in `modules/` and keep `UserService` undecorated — not required today, but that is the off-ramp.

**Database.** Use `@toijs/typeorm` (`TypeORMModule` + `ConnectionManager`). Register entities in an app `DatabaseModule` factory body. Do not `new DataSource()` in features. See the typeorm package; it is not part of `modular`.

**HTTP.** Use a kit or raw Node `http`. Controllers in Lamtoi apps are `@Injectable` classes; routing is `@toijs/express-kit`, not this package.

**Multiple apps, one domain.** Each app has its own `main.ts` and `.modules([...])`. Share `UserService` via a workspace package. Do not share one `Launcher` instance across processes.

**Common mistakes**

- Importing `launcher` into a repository.
- Putting SQL in a controller because the module file is “the feature”.
- One giant `AppModule` that registers every class.

**Best practices**

- Feature folder: `module`, `services`, `repositories`, (optional) `controllers`.
- Prefix names: `feature.user`, `lib.config`, `toijs.typeorm`.
- Config first, then infrastructure modules, then features.

**When to use.** Any multi-package TypeScript product.

**When not to use.** A 50-line script — skip the folder layout.
