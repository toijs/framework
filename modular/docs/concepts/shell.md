# Shell

**Problem.** Express and Vue need one place to create the host instance and let other modules attach (router, listen, pinia).

**Concept.** `Shell` holds `instance` and drives `task.root.register` / `task.root.ready`.

**Explanation.** `@toijs/modular` does not depend on Express or Vue. Kits call `create`. Features only `register` / `ready` subscribe.

`getInstance()` returns whatever `create` stored (may be `undefined` before create).

**Code example — subscribe only (features)**

```ts
import type { TaskContext } from "@toijs/modular";

launcher.shell.ready((context: TaskContext) => {
  const app = context.data;
  // kit-specific
});
```

**Common mistakes**

- Feature modules calling `shell.create`.
- Assuming `create` is sync — it `await`s the callback.

**When to use.** Writing a kit, or attaching to an existing kit’s host.

**When not to use.** Pure workers/scripts with no host object — skip Shell.
