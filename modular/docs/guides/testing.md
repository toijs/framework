# Testing

**Problem.** Production uses MySQL; tests should not.

**Concept.** The container keys implementations by token. Re-register the same token with a fake. `register` drops the cached singleton.

**Explanation.** There is **no** `@toijs/modular/testing` package. Use your runner (node:test, vitest, etc.). **NEEDS VERIFICATION**: this package currently has zero tests of its own.

**Code example**

```ts
import { Injectable, Launcher, type Module } from "@toijs/modular";

class UserRepository {
  findById(_id: string): { id: string } | undefined {
    throw new Error("production");
  }
}

@Injectable([UserRepository])
class UserService {
  constructor(private readonly users: UserRepository) {}
  get(id: string) {
    return this.users.findById(id);
  }
}

function UserModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register([UserRepository, UserService]);
  };
  return { name: "feature.user", prepare };
}

class InMemoryUserRepository extends UserRepository {
  findById(id: string) {
    return { id };
  }
}

const launcher = new Launcher();
await launcher.modules([UserModule]).start();

launcher.container.register({
  provide: UserRepository,
  useClass: InMemoryUserRepository,
});

const service = launcher.container.resolve(UserService);
```

**Caveat.** `UserService` is a singleton already constructed with the production `UserRepository` if something resolved it during `start()`. Re-register **both** `UserRepository` and `UserService`, or register fakes **before** any resolve, or use `scope: "transient"` on the service in tests.

Safer pattern — register mocks before `start`, or use a TestModule instead of UserModule:

```ts
function UserTestModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register({
      provide: UserRepository,
      useClass: InMemoryUserRepository,
    });
    launcher.container.register(UserService);
  };
  return { name: "feature.user", prepare };
}
```

Child container:

```ts
const child = launcher.container.createChild();
child.register({ provide: UserRepository, useClass: InMemoryUserRepository });
child.register({
  provide: UserService,
  useClass: UserService,
  inject: [UserRepository],
});
```

**Common mistakes**

- Mocking after the singleton service was already built.
- Expecting NestJS `overrideProvider`.

**Best practices**

- Prefer a test module factory over mutating production after start.
- Resolve with `tryResolve` when absence is the assertion.

**When to use.** Any test of an `@Injectable` class.

**When not to use.** Unit-test a pure function without the container.
