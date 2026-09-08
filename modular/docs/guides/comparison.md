# Comparison

Fair comparison of **what exists in source today**, not a ranking.

## @toijs/modular vs NestJS

| | `@toijs/modular` (1.0.3) | NestJS |
| --- | --- | --- |
| DI | Explicit token lists; no `design:paramtypes` | Reflection + tokens; large provider API |
| Module | Function `(launcher) => Module` | `@Module()` class, `imports` / `exports` |
| Lifecycle | `prepare` → `register` → `ready`, not awaited | `OnModuleInit`, app enable shutdown hooks |
| HTTP | Not included | First-class (`@nestjs/platform-express`, fastify) |
| CLI | Not included | `@nestjs/cli` |
| ORM integration | Separate `@toijs/typeorm` | `@nestjs/typeorm`, Prisma recipes, etc. |
| Ecosystem | Tiny; several kits `private: true` | Large |
| Runtime abstraction | `Shell` for a host instance | HTTP adapter, microservices |
| Learning curve | Small surface, unusual module shape | Large surface, many tutorials |
| Lambda | Pattern only | Pattern + community adapters |
| Worker | Pattern only | Pattern + `@nestjs/bull`, microservices |
| Documentation | This folder; previously missing | Extensive |
| Community | GitHub `toijs/framework`, 0 stars at capture | Large |
| Tests in core package | None | Large suite |
| License | **Missing** | MIT |

### When to use @toijs/modular

- You want modules + DI and will choose HTTP yourself.
- You already run Lamtoi kits.
- You want explicit tokens and a small runtime.

### When to use NestJS

- You want HTTP, OpenAPI, guards, interceptors, and a documented platform.
- You hire for NestJS and need that ecosystem.
- You need request scope, testing utilities, and a license.

Do not claim `@toijs/modular` is “better than NestJS”. It is smaller and incomplete relative to NestJS’s product scope.

## @toijs/modular vs Effect vs NestJS vs Node.js

| | `@toijs/modular` | Effect | NestJS | Node.js only |
| --- | --- | --- | --- | --- |
| DI | OOP container | Layers / services | OOP container + reflection | Manual |
| Module architecture | Function modules | Layer composition | `@Module` | Folders |
| Programming model | Classes + decorators | Typed effects (pipe) | Classes + decorators | Anything |
| Runtime abstraction | `Launcher` + `Shell` | Effect runtime, fibers | Nest application | `http` / `worker_threads` |
| Learning curve | Low–medium | High | Medium–high | Low |
| Error handling | Throw / return | Typed failures | Filters / exceptions | Throw |
| Concurrency | Whatever you write | Structured concurrency | Whatever you write | Whatever you write |
| Ecosystem | Small | Growing (Effect) | Large | npm |
| Use cases | Composition root | Correctness-heavy domains | Product APIs | Scripts, custom stacks |

`@toijs/modular` and Effect do **not** compete as the same product. Effect models typed effects and concurrency. Modular models registration and object graphs. NestJS models a server platform. Plain Node.js models nothing — you assemble it.

## Other DI libraries

Worth comparing when choosing only a container: InversifyJS, tsyringe, Awilix, typed-inject. Modular adds **module factories, lifecycle, task, config, metadata, shell** on top of a container. If you need only `register`/`resolve`, those libraries are more established.

## False claims to avoid

- No benchmark vs NestJS exists in this repository.
- No “zero overhead” measurement exists.
- “Production-ready” is not demonstrated by tests, license, or public adoption metrics.
