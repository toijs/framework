# Providers

**Problem.** Not every dependency is a constructable class. You also need constants, factories, and aliases.

**Concept.** `Provider` is a union: a class constructor, or an object with `provide` plus one of `useClass` / `useValue` / `useFactory` / `useExisting`.

**Explanation.** `Container.normalize` decides the kind:

1. `typeof provider === "function"` → class provider, token = class, `inject = resolveInjectTokens(class)`, scope singleton
2. `"useValue" in provider` → value, scope singleton
3. `"useExisting" in provider` → alias, scope singleton
4. `"useFactory" in provider` → factory, `inject ?? []`, scope singleton unless `"transient"`
5. `"useClass" in provider` → class, `inject` from `provider.inject` **or** class decorators
6. else → throws `DI: invalid provider definition`

Detection uses `"useValue" in provider` etc. A malformed object that happens to contain `useValue` is treated as a value provider.

**Code example**

```ts
import { UserService } from "./user.service.js";
import { UserRepository } from "./user.repository.js";

// 1. Class shorthand
launcher.container.register(UserService);

// 2. Value
launcher.container.register({
  provide: "maxRetries",
  useValue: 3,
});

// 3. Factory
launcher.container.register({
  provide: UserService,
  useFactory: (users: UserRepository) => new UserService(users),
  inject: [UserRepository],
  scope: "singleton",
});

// 4. Existing
launcher.container.register({
  provide: "PrimaryUsers",
  useExisting: UserService,
});

// 5. useClass (interface token → implementation)
launcher.container.register({
  provide: UserRepository,
  useClass: MysqlUserRepository,
  inject: [ConnectionManager],
});
```

`register` accepts one provider or an array. It returns `this` for chaining.

**Common mistakes**

- Passing `{ provide: X, useClass: Y }` **and** expecting `@Injectable` on `Y` to be ignored when `inject` is a non-empty array — explicit `inject` wins (`resolveInjectTokens`).
- Using both `useValue` and `useClass` on one object — `useValue` wins because it is checked first.

**Best practices**

- Prefer class shorthand in features.
- Use `useValue` for `ConnectionManager` singletons and config objects already constructed.
- Use `useClass` when the token is not the implementation class (tests, alternate DBs).

**When to use.** Always, when registering with `container.register`.

**When not to use.** Do not invent extra provider kinds (`useAsync`, `useModule`) — they are not implemented.
