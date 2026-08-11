import { Launcher, type Module } from "@toijs/modular";
import { type MysqlDataSourceOptions } from "./data-source";
export type TypeOrmModuleOptions = {
    /** Config key under `launcher.config` (default: `"database"`). */
    configKey?: string;
    entities?: MysqlDataSourceOptions["entities"];
    migrations?: MysqlDataSourceOptions["migrations"];
    /** Extra DataSource option overrides. */
    overrides?: Partial<MysqlDataSourceOptions>;
    /** Initialize DataSource on `launcher.ready` (default: `true`). */
    autoInitialize?: boolean;
    /** Console log prefix (default: `"typeorm"`). */
    logLabel?: string;
};
/**
 * Register TypeORM DataSource providers on a modular launcher.
 *
 * @example
 * ```ts
 * // With options — returns a module factory ready for Launcher.start
 * modules: [TypeOrmModule({ entities: [UserEntity] }), ...]
 *
 * // App layer typically binds defaults once:
 * export const DatabaseModule = TypeOrmModule({ entities });
 * modules: [DatabaseModule, ...]
 * ```
 */
export declare function createTypeOrmModule(launcher: Launcher, options?: TypeOrmModuleOptions): Module;
//# sourceMappingURL=typeorm.module.d.ts.map