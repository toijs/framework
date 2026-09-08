# Guide: AWS Lambda

**Status: application pattern. No Lambda adapter exists in `@toijs/modular`.**

**Problem.** A Lambda handler should call application services without Nest’s extra bootstrap, but still use DI.

**Concept.** Create the `Launcher` **outside** the per-invoke handler (cold start), `await start()`, cache the resolved service, call it in `handler`.

```text
Lambda Handler
 ↓
cached bootstrap (Launcher.start)
 ↓
Module
 ↓
Service
```

**Code example**

```ts
import { Injectable, Launcher, type Module } from "@toijs/modular";

@Injectable()
export class HelloService {
  run(name: string) {
    return { message: `hello ${name}` };
  }
}

function HelloModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register([HelloService]);
  };
  return { name: "feature.hello", prepare };
}

let hello: HelloService | undefined;

async function getHello() {
  if (!hello) {
    const launcher = new Launcher();
    await launcher.modules([HelloModule]).start();
    hello = launcher.container.resolve(HelloService);
  }
  return hello;
}

export async function handler(event: { name?: string }) {
  const service = await getHello();
  return service.run(event.name ?? "lambda");
}
```

**Caveats**

- Cold start includes module `prepare`/`register`/`ready`. Async TypeORM connect is **not** awaited by `start()` — gate on `event.database.connected` or connect in your own awaited function before serving.
- Bundle ESM for your Lambda runtime; this package has no CJS export.
- No official Middy middleware.

**When to use.** Small handlers that share domain modules with an API.

**When not to use.** You already standardized on NestJS + `@codegenie/serverless-express` and need that ecosystem.
