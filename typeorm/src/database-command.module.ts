import type { Module, Launcher } from "@toijs/modular";
import { EVENT_DATABASE_ERROR } from "./database.constant";
import { connectionManager } from "./connection-manager";
import { TypeORMModule } from "./database.module";

const MIGRATE_ACTIONS = ["up", "down"] as const;
const SEED_ACTIONS = ["run", "revert"] as const;

type MigrateAction = (typeof MIGRATE_ACTIONS)[number];
type SeedAction = (typeof SEED_ACTIONS)[number];

/**
 * Run migrations / seeds from the command line, then exit.
 *
 *   --migrate [up|down]     (default: up)
 *   --seed [run|revert]     (default: run)
 *
 * Runs in `ready`, after every connection has been opened by TypeORMModule.
 * Without either flag, the module does nothing.
 */
export function TypeORMCommandModule(launcher: Launcher): Module {
  const name = "toijs.typeorm-command";
  const [type, action] = process.argv.slice(2);
  const enabled = type === "--migrate" || type === "--seed";

  const prepare = () => {
    if (!enabled) {
      return;
    }

    launcher.task.subscribe(EVENT_DATABASE_ERROR, (context) => {
      const { name, error } = context.data as { name: string; error: unknown };

      console.error(`Failed to connect ${name} database:`, error);
    });
  };

  const ready = async () => {
    if (!enabled) {
      return;
    }

    const names = Object.keys(
      (launcher.config.resolve("database") ?? {}) as Record<string, unknown>,
    );

    try {
      for (const connectionName of names) {
        if (type === "--migrate") {
          const command = resolveAction<MigrateAction>(action, MIGRATE_ACTIONS);

          console.log(`Migrating ${connectionName} database (${command})...`);
          const executed = await connectionManager.migrate(command, connectionName, (migration) => {
            console.log(`  ${command === "up" ? "Migrating" : "Reverting"}: ${migration}`);
          });

          if (executed.length === 0) {
            console.log("  No migrations to run.");
          }
        } else {
          const command = resolveAction<SeedAction>(action, SEED_ACTIONS);

          console.log(`Seeding ${connectionName} database (${command})...`);
          const executed = await connectionManager.seed(command, connectionName, (seed) => {
            console.log(`  ${command === "run" ? "Seeding" : "Reverting"}: ${seed}`);
          });

          if (executed.length === 0) {
            console.log("  No seeds to run.");
          }
        }
      }

      process.exitCode = 0;
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    } finally {
      await Promise.all(names.map((connectionName) => connectionManager.close(connectionName)));
      process.exit();
    }
  };

  return {
    name,
    dependencies: [TypeORMModule],
    prepare,
    ready,
  };
}

function resolveAction<T extends string>(
  action: string | undefined,
  allowed: readonly T[],
): T {
  if (action === undefined) {
    return allowed[0];
  }

  if (!allowed.includes(action as T)) {
    throw new Error(`Invalid command: ${action}. Expected one of: ${allowed.join(", ")}`);
  }

  return action as T;
}
