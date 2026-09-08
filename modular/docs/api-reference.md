# API reference

Public exports from `@toijs/modular` (`src/index.ts` re-exports launcher, metadata, config, task, di).

## Launcher

```ts
class Launcher {
  task: Task;
  metadata: Metadata;
  container: Container;
  shell: Shell;
  config: Config;
  options: { modules: ModuleFactory[] };
  instances: Map<string, Module>;

  modules(modules: ModuleFactory[]): this;
  define<K extends string, V>(key: K, value: V, token?: InjectionToken<V>): this & Record<K, V>;
  start(): Promise<void>;
}
```

Errors: `No modules registered`; `Launcher: property "…" already exists`.

## Module types

```ts
type Module = {
  name: string;
  dependencies?: ModuleFactory[];
  prepare?: () => void;
  register?: () => void;
  ready?: () => void;
};

type ModuleFactory = (launcher: Launcher) => Module;
```

## Container

See [containers](concepts/containers.md) and [providers](concepts/providers.md).

Errors: `DI: no provider for token …`; `DI: circular dependency detected: …`; `DI: invalid provider definition`.

Token display: strings quoted, symbols as `Symbol(description)`, classes as `.name` or `AnonymousClass`.

## Decorators

```ts
function Injectable(inject?: InjectionToken[]): ClassDecorator;
function Inject(token: InjectionToken): ParameterDecorator;
function Optional(): ParameterDecorator;
```

Helpers (exported): `getInjectableMetadata`, `getInjectMetadata`, `getOptionalMetadata`, `resolveInjectTokens`.

## Task

```ts
type TaskInvokeType = "sequential" | "parallel";
type TaskContext = { data: unknown; result: unknown; index: number; end: boolean };
type TaskHandler = (context: TaskContext) => unknown | Promise<unknown>;

class Task {
  subscribe(name: string, fn: TaskHandler): () => void;
  unsubscribe(name: string, fn: unknown): void;
  invoke(name: string, data?: unknown, type?: TaskInvokeType): Promise<unknown>;
}
```

## Config / Metadata / Shell

Documented in [config](concepts/config.md), [metadata](concepts/metadata.md), [shell](concepts/shell.md).

## Constants

| Name | Value |
| --- | --- |
| `SCOPE_SINGLETON` | `"singleton"` |
| `SCOPE_TRANSIENT` | `"transient"` |
| `TASK_ROOT_REGISTER` | `"task.root.register"` |
| `TASK_ROOT_READY` | `"task.root.ready"` |
| `METADATA_CONFIG` | `"metadata.config"` |
| `EVENT_METADATA_CHANGED` | `"event.metadata.changed"` |
| `META_INJECTABLE` | `Symbol.for("lamtoi.di.injectable")` |
| `META_INJECT` | `Symbol.for("lamtoi.di.inject")` |
| `META_OPTIONAL` | `Symbol.for("lamtoi.di.optional")` |

## Not exported as Nest lookalikes

There is no `Module` decorator, `forwardRef`, `Global`, `Request`, `Scope.REQUEST`, or `OnModuleInit`.
