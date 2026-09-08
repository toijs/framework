# Metadata

**Problem.** Arbitrary runtime values (HTTP client, feature flags) need a store and change notifications.

**Concept.** `Metadata` is a string-key map plus `task.invoke` on change.

**Explanation.**

- `define(name, value, merge = true)` — arrays concat; non-null objects shallow-merge; otherwise replace. `merge: false` replaces.
- `resolve(name)` — value or `undefined`.
- `invoke(name, args?)` — if the stored value is a function, call it; else a no-op function.
- `subscribe(listener)` — all changes (`event.metadata.changed`), immediately called with the full store.
- `subscribe(name, listener)` — `event.metadata.changed.<name>`, immediately called with `{ [name]: value }`.

**Code example**

```ts
launcher.metadata.define("feature.flags", { beta: true });
launcher.metadata.resolve("feature.flags");

const stop = launcher.metadata.subscribe("feature.flags", (patch) => {
  console.log(patch);
});
```

Config is metadata. Prefer `launcher.config` for app settings.

**Common mistakes**

- `subscribe("x")` without a listener — returns a no-op unsubscribe.
- Storing class instances and expecting merge to deep-clone them.

**When to use.** Shared runtime bag and simple pub/sub for that bag.

**When not to use.** Domain event sourcing; large state management (use your UI store or a DB).
