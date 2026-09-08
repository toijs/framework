# Guide: workers (including SQS)

**Status: application pattern. No SQS package exists in `@toijs/modular`.**

**Problem.** A queue consumer should use the same services as the API.

**Concept.** Bootstrap `Launcher` once per process, then in your poll loop `resolve` a service and call a method. AWS SDK, `sqs-consumer`, etc. are **your** dependencies.

```text
SQS (AWS)
 ↓
your poller / handler  (not provided)
 ↓
Launcher modules
 ↓
Service
 ↓
Repository
```

**Code example**

```ts
import { Injectable, Launcher, type Module } from "@toijs/modular";

@Injectable()
export class JobService {
  async handle(body: string) {
    JSON.parse(body);
  }
}

export function WorkerModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register([JobService]);
  };
  return { name: "feature.worker", prepare };
}

export async function bootstrap() {
  const launcher = new Launcher();
  await launcher.modules([WorkerModule]).start();
  return launcher.container.resolve(JobService);
}

// your infrastructure:
// const jobs = await bootstrap();
// for await (const message of pollSqs()) await jobs.handle(message.body);
```

**Common mistakes**

- Creating a new `Launcher` per message (unnecessary unless you need isolation).
- Assuming `start()` connected the database — wait on `@toijs/typeorm` events if you use it.

**When to use.** Long-running Node processes.

**When not to use.** Lambda-style one-invoke processes — see [lambda](lambda.md).
