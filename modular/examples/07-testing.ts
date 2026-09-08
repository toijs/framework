/**
 * Example 7 — Testing: replace production repository
 *
 * Production: UserRepository (in-memory stand-in for MySQL)
 * Test:       InMemoryUserRepository on the same token
 *
 * Re-register UserService after the repository so the singleton is rebuilt.
 * Prefer a dedicated test module so production is never constructed.
 */
import { Injectable, Launcher, type Module } from "@toijs/modular";

export class UserRepository {
  findById(_id: string): { id: string; name: string } | undefined {
    throw new Error("use a database in production");
  }
}

@Injectable([UserRepository])
export class UserService {
  constructor(private readonly users: UserRepository) {}

  get(id: string) {
    return this.users.findById(id);
  }
}

export function UserModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register([UserRepository, UserService]);
  };
  return { name: "feature.user", prepare };
}

class InMemoryUserRepository extends UserRepository {
  findById(id: string) {
    return { id, name: "Ada" };
  }
}

/** Safer: never register the production repository. */
function UserTestModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register({
      provide: UserRepository,
      useClass: InMemoryUserRepository,
    });
    launcher.container.register(UserService);
  };
  return { name: "feature.user", prepare };
}

const launcher = new Launcher();
await launcher.modules([UserTestModule]).start();

const service = launcher.container.resolve(UserService);
const user = service.get("1");

if (user?.name !== "Ada") {
  throw new Error("expected in-memory user");
}

console.log(user);
// Expected: { id: '1', name: 'Ada' }
