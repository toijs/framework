# Migration

## From Node.js without DI → @toijs/modular

**Before:** `const service = new UserService(new UserRepository())`.

**After:**

1. Add `@Injectable([UserRepository])` on `UserService`.
2. Create `UserModule` that `container.register([UserRepository, UserService])`.
3. `await new Launcher().modules([UserModule]).start()`.
4. `launcher.container.resolve(UserService)` at the edge (HTTP handler, CLI, worker loop).

Keep constructors unchanged except for the decorator and token list.

## From NestJS → @toijs/modular

Only map APIs that **exist**.

| NestJS | `@toijs/modular` | Notes |
| --- | --- | --- |
| `@Module({ providers })` | `Module` factory + `container.register` | No `imports`/`exports`/`controllers` fields |
| `imports: [OtherModule]` | `dependencies` or list in `.modules([...])` | Dependency order is parent-first; prefer a flat list |
| `@Injectable()` | `@Injectable([tokens])` | Tokens are required when the constructor has deps |
| `@Inject(TOKEN)` | `@Inject(TOKEN)` | Exists |
| `@Optional()` | `@Optional()` | Exists; constructor only |
| `useClass` / `useValue` / `useFactory` / `useExisting` | Same provider shapes | `scope` only on class/factory; no `REQUEST` |
| `Scope.DEFAULT` | `"singleton"` | |
| `Scope.TRANSIENT` | `"scope: "transient"` | |
| `Scope.REQUEST` | **No equivalent** | |
| Nest application container | `launcher.container` | |
| `forwardRef` | **No equivalent** | |
| `OnModuleInit` | `prepare` / `register` / `ready` | Not awaited |
| `@Controller` / `@Get` | **Not in modular** | Use a kit or Express yourself |
| `@Global()` | Unnecessary — one shared container | |

**NestJS HTTP, GraphQL, microservices, OpenAPI, CLI, Passport** have no mapping. Keep Nest or rewrite those layers.

**Testing:** Nest `Test.createTestingModule` → a test `ModuleFactory` that registers fakes (see [testing](testing.md)).

There is no automated codemod in this repository.
