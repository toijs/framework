/**
 * Example 2 — Module + Service + Repository
 *
 * UserModule
 * ├── UserService
 * └── UserRepository
 */
import { Injectable, Launcher, type Module } from "@toijs/modular";

type User = { id: string; name: string };

@Injectable()
class UserRepository {
  private readonly rows: User[] = [{ id: "1", name: "Ada" }];

  findById(id: string): User | undefined {
    return this.rows.find((row) => row.id === id);
  }
}

@Injectable([UserRepository])
class UserService {
  constructor(private readonly users: UserRepository) {}

  get(id: string): User | undefined {
    return this.users.findById(id);
  }
}

export function UserModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register([UserRepository, UserService]);
  };

  const ready = () => {
    const service = launcher.container.resolve(UserService);
    console.log(service.get("1"));
  };

  return { name: "feature.user", prepare, ready };
}

await new Launcher().modules([UserModule]).start();
// Expected: { id: '1', name: 'Ada' }
