/**
 * Example 1 — Minimal application
 *
 * Application
 * └── UserService
 */
import { Injectable, Launcher, type Module } from "@toijs/modular";

@Injectable()
class UserService {
  list(): Array<{ id: string; name: string }> {
    return [{ id: "1", name: "Ada" }];
  }
}

function AppModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register([UserService]);
  };

  const ready = () => {
    const users = launcher.container.resolve(UserService);
    console.log(users.list());
  };

  return { name: "app", prepare, ready };
}

await new Launcher().modules([AppModule]).start();
// Expected: [ { id: '1', name: 'Ada' } ]
