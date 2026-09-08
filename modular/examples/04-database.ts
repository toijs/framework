/**
 * Example 4 — Database via @toijs/typeorm (separate package)
 *
 * ConfigModule (factory body: config.define)
 * TypeORMModule (factory: register ConnectionManager; register hook: connect)
 * DatabaseModule (factory body: setEntities)
 * UserModule (prepare: register repo + service)
 *
 * Launcher.start() does not await TypeORM connect. Repositories must handle
 * a missing connection or wait for event.database.connected.
 */
import { Injectable, Launcher, type Module } from "@toijs/modular";
import {
  connectionManager,
  ConnectionManager,
  EVENT_DATABASE_CONNECTED,
  TypeORMModule,
} from "@toijs/typeorm";
import { EntitySchema } from "typeorm";

type User = { id: number; username: string };

const UserEntity = new EntitySchema<User>({
  name: "User",
  tableName: "users",
  columns: {
    id: { type: "int", primary: true, generated: true },
    username: { type: "varchar", length: 100 },
  },
});

export function ConfigModule(launcher: Launcher): Module {
  launcher.config.define({
    database: {
      default: {
        type: "mysql",
        host: process.env.DB_HOST ?? "localhost",
        port: Number(process.env.DB_PORT) || 3306,
        username: process.env.DB_USER ?? "root",
        password: process.env.DB_PASSWORD ?? "password",
        database: process.env.DB_NAME ?? "app",
      },
    },
  });

  return { name: "lib.config" };
}

export function DatabaseModule(_launcher: Launcher): Module {
  connectionManager.setEntities([UserEntity]);
  return { name: "lib.database" };
}

@Injectable([ConnectionManager])
class UserRepository {
  constructor(private readonly connections: ConnectionManager) {}

  async findAll() {
    const connection = this.connections.getConnection();
    if (!connection) {
      throw new Error("no database connection available");
    }
    return connection.getRepository(UserEntity).find();
  }
}

export function UserModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register([UserRepository]);

    launcher.task.subscribe(EVENT_DATABASE_CONNECTED, async () => {
      const users = launcher.container.resolve(UserRepository);
      console.log(await users.findAll());
    });
  };

  return { name: "feature.user", prepare };
}

await new Launcher()
  .modules([ConfigModule, TypeORMModule, DatabaseModule, UserModule])
  .start();
