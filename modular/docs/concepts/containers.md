# Containers

**Problem.** You need a place to register providers, resolve graphs, detect cycles, and optionally isolate a test or a nested scope.

**Concept.** `Container` holds `providers` and cached `instances`. It may have a `parent`. `createChild()` builds a container that delegates missing tokens upward.

**Explanation.** Public API:

| Method | Behavior |
| --- | --- |
| `register(provider \| provider[])` | Normalize and set; drop cached instance for that token |
| `resolve(token)` | Throw `DI: no provider for token …` if missing |
| `tryResolve(token)` | `undefined` if missing |
| `has(token)` | This map, then parent |
| `createChild()` | `new Container(this)` |
| `clear()` | Local providers, instances, and the resolving set |

**Resolution.** If a singleton is already in `instances`, it is returned even if you later needed a parent override — cache is local. If no local record exists and `parent.has(token)`, the **parent** resolves (parent cache is used). A child can shadow a parent by `register`ing the same token.

**Circular dependencies.** While creating a token, it is added to `resolving`. Re-entering throws:

```text
DI: circular dependency detected: UserService -> OrderService -> UserService
```

There is no `forwardRef`. Break cycles by extracting a third service, using `Task`, or injecting a token resolved later via factory.

**Scope and parent.** A singleton is cached on the container that **created** it. A child `resolve` of a parent-only token stores the instance on the parent, not the child.

**Code example**

```ts
import { Container, Injectable } from "@toijs/modular";

@Injectable()
class Clock {
  now() {
    return 0;
  }
}

const root = new Container();
root.register(Clock);

const child = root.createChild();
child.resolve(Clock); // same class, resolved via parent

child.register({
  provide: Clock,
  useValue: { now: () => 1 },
});
child.resolve(Clock); // shadowed
```

You can use `Container` **without** `Launcher`. `Launcher` always creates its own root container.

**Common mistakes**

- Creating a child and expecting `clear()` on the child to clear the parent.
- Registering on a child but resolving on the parent (parent cannot see child providers).
- Using child containers for HTTP request scope — possible to build yourself, not provided.

**Best practices**

- Application code: use `launcher.container` only.
- Tests: `register` over the production token on the same container, or `createChild()` and register mocks on the child, then resolve from the child.

**When to use.** Always for DI. Child containers for test isolation or short-lived overlays.

**When not to use.** Do not create a new `Container` per module — modules share the launcher container by design.
