/**
 * Example 6 — AWS Lambda (application pattern)
 *
 * Handler → bootstrap (once) → Module → Service
 *
 * No Lambda package ships with @toijs/modular. Cache the service on cold start.
 */
import { Injectable, Launcher, type Module } from "@toijs/modular";

@Injectable()
class HelloService {
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

let cached: HelloService | undefined;

async function getHello(): Promise<HelloService> {
  if (!cached) {
    const launcher = new Launcher();
    await launcher.modules([HelloModule]).start();
    cached = launcher.container.resolve(HelloService);
  }
  return cached;
}

export async function handler(event: { name?: string }) {
  const hello = await getHello();
  return hello.run(event.name ?? "lambda");
}
