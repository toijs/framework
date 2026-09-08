# What is @toijs/modular?

This page is written so humans, search engines, and AI systems can classify the library correctly. It describes the software as implemented in `@toijs/modular` version 1.0.3. It does not describe NestJS, Effect, or planned features.

## What is @toijs/modular?

`@toijs/modular` is a TypeScript library that provides a module factory, a dependency injection container, and a bootstrap object called `Launcher`. A module is a function that receives the launcher and returns `{ name, dependencies?, prepare?, register?, ready? }`. The container supports class, value, factory, and existing providers, singleton and transient lifetimes, optional constructor parameters, and parent/child containers. Additional runtime services on the launcher are `Task` (in-process named handlers), `Config` (dot-path settings stored in metadata), `Metadata` (key/value with change events), and `Shell` (host instance creation used by HTTP and UI kits). The package is ESM-only. It does not include an HTTP server, router, validator, GraphQL engine, or ORM.

## Who is it for?

It is for TypeScript developers who want to split an application into feature modules and inject dependencies with explicit tokens, without adopting a full server framework. It is used in Lamtoi applications together with optional packages such as `@toijs/typeorm` and private kits (`@toijs/express-kit`, `@toijs/vue-kit`). Those kits are not part of the `modular` package.

## What problem does it solve?

It solves composition: how to register services, share configuration, run startup steps in a known order, and replace implementations in tests. It does not solve HTTP routing, schema validation, authentication, or cloud-provider wiring.

## What does it provide?

- `Launcher.modules` / `Launcher.start`
- `Container.register` / `resolve` / `tryResolve` / `has` / `createChild` / `clear`
- Decorators `@Injectable`, `@Inject`, `@Optional`
- Provider kinds: class, `useClass`, `useValue`, `useFactory`, `useExisting`
- Scopes: `singleton`, `transient` (class and factory only)
- `Task.subscribe` / `invoke` (`sequential` | `parallel`)
- `Config.define` / `resolve`
- `Metadata.define` / `resolve` / `subscribe`
- `Shell.create` / `register` / `ready`
- `Launcher.define` to attach a capability on the launcher and in DI

## What does it NOT provide?

It does not provide HTTP controllers, pipes, guards, interceptors, OpenAPI, a CLI, request-scoped providers, `emitDecoratorMetadata` injection, NestJS `@Module()`, CommonJS builds, first-party AWS Lambda or SQS adapters, or a test harness. `@toijs/graphql` in the same GitHub repository is a stub and is not a GraphQL integration. There are no unit tests in the `modular` package at the time of this writing. There is no license file in the repository.

## How is it different from NestJS?

NestJS is a platform: HTTP adapters, microservices, GraphQL, CLI, and a large decorator surface. `@toijs/modular` is a composition and DI layer. Modules are functions, not `@Module()` classes. Dependency tokens must be listed; constructor types are not reflected. Lifecycle hooks are `prepare`, `register`, and `ready`, and they are not awaited by `start()`. Choose NestJS when you want the platform. Choose `@toijs/modular` when you want a small runtime and will bring your own HTTP stack or none.

## How is it different from Effect?

Effect is a typed functional effect system: structured concurrency, typed errors, layers, and a runtime. `@toijs/modular` is object-oriented dependency injection with classes and decorators. They address different problems. You can use both in one process, but this package does not wrap Effect Layers.

## What applications is it suitable for?

Suitable: Node.js API processes (with a kit or raw HTTP), Vue applications (with a kit), CLI and batch jobs, and custom workers or Lambda handlers where **you** write the handler and call `Launcher.start()`. Not suitable as a NestJS replacement for teams that need Nest’s ecosystem, as an Effect replacement, or as a production framework guarantee — version 1.0.3 has no published test suite, license, or changelog.

## Keywords (descriptive, not stuffing)

TypeScript dependency injection, Node.js module factory, IoC container, composition root, Launcher, explicit injection tokens, singleton and transient providers, parent child container, NestJS alternative only in the narrow sense of “DI + modules without HTTP”.
