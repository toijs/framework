---
name: toijs-typeorm
description: >-
  Use @toijs/typeorm with @toijs/modular: TypeORMModule, ConnectionManager,
  EntitySchema, repositories, migrations, seeds, database config. Use when
  adding tables, repos, TypeORM DataSource, MySQL, migrate/seed CLI, or
  injecting ConnectionManager.
---

# @toijs/typeorm

TypeORM adapter for `@toijs/modular`. **Do not** `new DataSource()` in features. Connect only through `TypeORMModule` + `ConnectionManager`.

Read `toijs-modular` first (Launcher, `@Injectable`, module hooks).

Source: `@toijs/typeorm/src/`. App wiring: `apps/api/src/domain/database/`.

## Bootstrap order

```ts
void new Launcher()
  .modules([ConfigModule, TypeORMModule, DatabaseModule, /* features */])
  .start();
```

| Module | Package | When |
|--------|---------|------|
| `ConfigModule` | app | Factory body: `config.define` — must include `database` |
| `TypeORMModule` | `@toijs/typeorm` | Factory: register `ConnectionManager` in DI. `register`: `connect` every named config |
| `DatabaseModule` | app | Factory: `setEntities` / `setMigrations` / `setSeeds`. `prepare`: `--migrate` / `--seed` CLI |

Entity lists must be on `connectionManager` **before** `TypeORMModule.register` runs. Put `setEntities` in the **DatabaseModule factory body** (resolve runs all factories, then `register` hooks). Listing `DatabaseModule` after `TypeORMModule` is OK.

`TypeORMModule.register` is async and **not awaited** by `Launcher.start()`. After connect it `task.invoke`s `event.database.connected` (payload: connection name) or `event.database.error` (`{ name, error }`).

## Config

`launcher.config.resolve("database")` must be `Record<string, DataSourceOptions>`. Keys are connection names (`default` is the ConnectionManager default).

```ts
// config/database.ts
export default {
  default: {
    type: process.env.DB_TYPE || "mysql",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    username: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "database",
    charset: process.env.DB_CHARSET || "utf8mb4",
    timezone: process.env.DB_TIMEZONE || "+00:00",
    logging: process.env.DB_LOGGING === "true" || process.env.DB_LOGGING === "1",
    migrationsTableName: process.env.DB_MIGRATIONS_TABLE || "migrations",
  },
};
```

Re-export under `config.database` (`config/index.ts`). Do not put `entities` / `migrations` in this file — register them on `connectionManager`.

## ConnectionManager

Singleton `connectionManager` (also DI token `ConnectionManager`).

```ts
import { connectionManager, ConnectionManager } from "@toijs/typeorm";
// app re-exports from @/domain/database
```

| Method | Role |
|--------|------|
| `setEntities(entities, name?)` | Merge entities for a connection |
| `setMigrations` / `setSeeds` / `setSubscribers` | Same, merge |
| `connect(name, options)` | `new DataSource`, `initialize`, store |
| `getConnection(name?)` | `DataSource` or `undefined` (sync) |
| `close(name?)` | `destroy` |
| `migrate("up" \| "down")` | TypeORM `runMigrations` / `undoLastMigration` |
| `seed("run" \| "revert")` | Instantiates seed classes, `run`/`revert(queryRunner)` |

Default connection name: `"default"`. Change with `setDefaultConnection`.

If `options.entities` is omitted, `connect` uses `getEntities(name)` (and same for migrations/subscribers).

## App DatabaseModule

```ts
import type { Module, Launcher } from "@toijs/modular";
import { connectionManager, EVENT_DATABASE_CONNECTED } from "@toijs/typeorm";
import { entities } from "./entities";
import { migrations } from "./migrations";
import { seeds } from "./seeds";

export function DatabaseModule(launcher: Launcher): Module {
  void connectionManager
    .setEntities(entities)
    .setMigrations(migrations)
    .setSeeds(seeds);

  const prepare = () => {
    const [type, action] = process.argv.slice(2);
    if (!["--migrate", "--seed"].includes(type)) return;

    launcher.task.subscribe(EVENT_DATABASE_CONNECTED, async (context) => {
      if (type === "--migrate") {
        await connectionManager.migrate(action as "up" | "down");
      }
      if (type === "--seed") {
        await connectionManager.seed(action as "run" | "revert");
      }
      await connectionManager.close();
      process.exit(0);
    });
  };

  return { name: "lib.database", prepare };
}
```

CLI: `node … --migrate up` / `--migrate down` / `--seed run` / `--seed revert`. Use `db.ts` entry (Config + TypeORM + Database only) so Express does not listen.

## Entities — `EntitySchema`, not `@Entity()`

This codebase uses **TypeORM `EntitySchema`**, not decorator entity classes.

```ts
import { EntitySchema } from "typeorm";

export type User = {
  id: string;
  username: string;
  /* ... */
  createdAt: Date;
  updatedAt: Date;
};

export const UserEntity = new EntitySchema<User>({
  name: "User",
  tableName: "users",
  columns: {
    id: { type: "bigint", unsigned: true, primary: true, generated: "increment" },
    username: { type: "varchar", length: 100, unique: true },
    createdAt: { type: "datetime", createDate: true },
    updatedAt: { type: "datetime", updateDate: true },
  },
});
```

Barrel:

```ts
export const entities: EntitySchema[] = [UserEntity, AuthRefreshTokenEntity];
```

Re-export `ConnectionManager` / `connectionManager` from `domain/database` so features import `@/domain/database`, not `@toijs/typeorm`, for app entities.

## Repositories

Inject `ConnectionManager`. Resolve `getRepository(XxxEntity)`. Guard missing connection.

```ts
import { Injectable } from "@toijs/modular";
import type { Repository } from "typeorm";
import { ConnectionManager, UserEntity, type User } from "@/domain/database";

@Injectable([ConnectionManager])
export class UserRepository {
  constructor(private readonly connections: ConnectionManager) {}

  private async repository(): Promise<Repository<User>> {
    const connection = this.connections.getConnection();
    if (!connection) throw new Error("[auth] no database connection available");
    return connection.getRepository(UserEntity);
  }
}
```

Register the class on the feature module container. Features own repos; do not put business queries on `DatabaseModule`.

## Migrations

Class `implements MigrationInterface`, timestamp prefix, exported name matching class.

```ts
export class CreateUsersTable1785331200000 implements MigrationInterface {
  name = "CreateUsersTable1785331200000";
  async up(queryRunner: QueryRunner): Promise<void> { /* createTable */ }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.dropTable("users"); }
}
```

```ts
export const migrations: Function[] = [CreateUsersTable1785331200000];
```

Keep schema in the migration `Table` in sync with `EntitySchema` columns. Do not use `synchronize: true` in app config.

## Seeds

Not TypeORM `MigrationInterface`. Class with `run` / `revert` taking `QueryRunner`:

```ts
export class SeedUsers1785331300000 {
  name = "SeedUsers1785331300000";
  async run(queryRunner: QueryRunner): Promise<void> { /* INSERT */ }
  async revert(queryRunner: QueryRunner): Promise<void> { /* DELETE */ }
}
```

```ts
import type { TypeORMSeed } from "@toijs/typeorm";
export const seeds: TypeORMSeed[] = [SeedUsers1785331300000];
```

## Events

```ts
import {
  EVENT_DATABASE_CONNECTED,
  EVENT_DATABASE_DISCONNECTED,
  EVENT_DATABASE_ERROR,
} from "@toijs/typeorm";
```

Subscribe with `launcher.task.subscribe`. Connected payload is the **connection name** string (`context.data`).

## Do not

- `new DataSource(...)` or TypeORM `createConnection` in a feature.
- Decorator `@Entity()` classes — use `EntitySchema`.
- Put `entities` in `DataSourceOptions` config; use `setEntities` so CLI and app share the same lists.
- Inject `DataSource` directly unless you resolved it from `ConnectionManager.getConnection()`.
- Assume `start()` has finished connecting — wait for `EVENT_DATABASE_CONNECTED` (CLI) or handle missing connection in repos.
- Skip `ConfigModule` / `database.default` — `TypeORMModule` reads that object and will throw or no-op if empty.
