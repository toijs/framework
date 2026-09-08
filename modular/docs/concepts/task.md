# Task

**Problem.** Modules need to coordinate without importing each other (database connected, HTTP unauthorized, shell created).

**Concept.** `Task` is an in-process named handler bus. It is not a job queue, not SQS, and not an event-emitter library with wildcards.

**Explanation.**

```ts
subscribe(name, fn) → unsubscribe
unsubscribe(name, fn)
invoke(name, data = null, type: "sequential" | "parallel" = "sequential")
```

`TaskContext`: `{ data, result, index, end }` (`end` is `true` for the last sequential handler). Parallel invoke does not fill `result` / `index` / `end` the same way — handlers receive `{ data }` only.

Sequential: each handler’s return value replaces `result` unless it is `undefined`.

**Code example**

```ts
import type { TaskContext } from "@toijs/modular";

const stop = launcher.task.subscribe("feature.user.created", (context: TaskContext) => {
  console.log(context.data);
});

await launcher.task.invoke("feature.user.created", { id: "1" });
stop();
```

Built-in names used by `Shell`: `task.root.register`, `task.root.ready`.

**Common mistakes**

- Treating `invoke` as fire-and-forget across processes — handlers are in the same Node process.
- Relying on parallel `result` aggregation beyond `Promise.all` of return values.

**Best practices**

- Use dotted names: `event.database.connected`, `feature.auth.open-login`.
- Export constants for names (as `@toijs/typeorm` does).

**When to use.** Cross-module signals and shell hooks.

**When not to use.** Domain events you want on a message bus; background jobs; retries.
