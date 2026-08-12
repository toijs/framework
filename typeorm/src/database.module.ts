import type { Module, Launcher } from "@toijs/modular";
import { EVENT_DATABASE_CONNECTED, EVENT_DATABASE_ERROR } from "./database.constant";
import { connectionManager, ConnectionManager } from "./connection-manager";
import type { DataSourceOptions } from "typeorm";

/**
 * Register the shared ConnectionManager on the launcher + DI container.
 * Inject via `@Injectable([ConnectionManager])`.
 */
export function TypeORMModule(launcher: Launcher): Module {
  const name = "toijs.typeorm";

  launcher.container.register({
    provide: ConnectionManager,
    useValue: connectionManager,
  });

  const register = async () => {
    const databaseConfig = launcher.config.resolve("database") as Record<string, DataSourceOptions>;

    await Promise.all(
      Object.entries(databaseConfig).map(async ([name, config]) => {
        try {
          await connectionManager.connect(name, config);
    
          launcher.task.invoke(EVENT_DATABASE_CONNECTED, name);
    
          return;
        } catch (error) {
          launcher.task.invoke(EVENT_DATABASE_ERROR, {
            name,
            error,
          });
        }
      }),
    );
  };

  return {
    name,
    register,
  };
}
