# Installation

**Problem.** Consumers need a supported install path, module format, and TypeScript settings that match the real runtime.

**Concept.** `@toijs/modular` is an ESM package (`"type": "module"`) that exports a single entry: `@toijs/modular`.

**Explanation.**

```bash
pnpm add @toijs/modular
```

`package.json` exports:

```json
{
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js"
  }
}
```

There is **no** `require` / CJS export. There is **no** `engines` field. Intended runtime is Node.js 18+ with native ESM. **NEEDS VERIFICATION** on older Node versions.

**TypeScript**

The package is built with TypeScript `~5.9.3`, `target: ES2022`, `module: ESNext`, `strict: true`. It does **not** enable `experimentalDecorators` in its own `tsconfig` because it *defines* decorators rather than applying them to its own classes.

Consuming apps that use `@Injectable` should enable class decorators. `@Inject` and `@Optional` are `ParameterDecorator`s and require `experimentalDecorators: true`. This container **ignores** `emitDecoratorMetadata` / `design:paramtypes`.

**Peer dependencies.** None. `reflect-metadata` is not a dependency and is not used by the DI metadata (symbols on the constructor).

**Code example**

```ts
import {
  Config,
  Container,
  Injectable,
  Inject,
  Launcher,
  Metadata,
  Optional,
  Shell,
  Task,
  type Module,
  type ModuleFactory,
} from "@toijs/modular";
```

**Common mistakes**

- Importing a subpath (`@toijs/modular/di`) — only `.` is exported.
- Expecting `require("@toijs/modular")` to work.
- Adding `emitDecoratorMetadata` to “make DI work”; it will not.

**Best practices**

- Import types with `import type` where you only need `Module` / `TaskContext`.
- Pin a version until a changelog exists; `1.0.3` has no published stability policy.

**When to use.** New ESM TypeScript projects.

**When not to use.** Bundlers or runtimes that cannot load ESM-only packages without extra config.
