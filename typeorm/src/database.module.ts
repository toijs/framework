import type { Module, Launcher } from "@toijs/modular";
import { ConnectionManager, connectionManager } from "@toijs/typeorm";
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

  const register = () => {
    const databaseConfig = launcher.config.resolve("database") as Record<string, DataSourceOptions>;

    for (const [name, config] of Object.entries(databaseConfig)) {
      void connectionManager.create(name, config);
      void connectionManager.connect(name);
    }
  };

  return {
    name,
    register,
  };
}
