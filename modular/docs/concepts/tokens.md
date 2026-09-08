# Tokens

**Problem.** The container needs a key for each registration. TypeScript interfaces are erased at runtime.

**Concept.** An `InjectionToken<T>` is `string | symbol | Constructor<T> | AbstractConstructor<T>`.

**Explanation.** Class tokens are the usual case: register `UserService`, resolve `UserService`. String and symbol tokens are for values and for “interface” slots.

`@Injectable([tokens])` stores the list on `Symbol.for("lamtoi.di.injectable")`. `@Inject(token)` stores a sparse array on `Symbol.for("lamtoi.di.inject")`. `@Optional()` stores indexes on `Symbol.for("lamtoi.di.optional")`.

`resolveInjectTokens(target, explicit?)`:

1. If `explicit` is a non-empty array, use it (`useClass.inject`).
2. Else merge `@Inject` slots over `@Injectable` list (same index: `@Inject` wins).

**Code example**

```ts
import { Inject, Injectable } from "@toijs/modular";

export const LOGGER = Symbol("logger");

export type Logger = { info(message: string): void };

@Injectable()
export class OrderService {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}
}

launcher.container.register({
  provide: LOGGER,
  useValue: { info: (message: string) => console.log(message) },
});
launcher.container.register(OrderService);
```

Built-in tokens already registered by `new Launcher()`:

- `Launcher`
- `Task`
- `Metadata`
- `Config`
- `Shell`

You can `@Injectable([Config])` without registering `Config` yourself.

`launcher.define("http", client)` registers token `"http"` (or a custom third argument) **and** sets `launcher.http`.

**Common mistakes**

- Using a TypeScript `interface` as a token — it is not a value.
- Two packages using the same string `"config"` for different shapes.
- Forgetting that `define` throws if the property already exists on `Launcher`.

**Best practices**

- Prefer `symbol` or classes over generic strings.
- Export tokens from the feature that owns them.

**When to use.** Every provider.

**When not to use.** Do not add `InjectionToken` helper classes from other libraries; this package uses the union above.
