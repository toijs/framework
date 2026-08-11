import { createMysqlDataSource, createMysqlDataSourceOptions, destroyDataSource, initializeDataSource, } from "./data-source";
import { TYPEORM_DATA_SOURCE, TYPEORM_OPTIONS } from "./tokens";
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
export function createTypeOrmModule(launcher, options = {}) {
    const { configKey = "database", entities = [], migrations = [], overrides = {}, autoInitialize = true, logLabel = "typeorm", } = options;
    const prepare = () => {
        launcher.container.define({
            provide: TYPEORM_OPTIONS,
            useFactory: () => {
                const config = launcher.config.resolve(configKey);
                return createMysqlDataSourceOptions(config, {
                    entities,
                    migrations,
                    ...overrides,
                });
            },
        });
        launcher.container.define({
            provide: TYPEORM_DATA_SOURCE,
            useFactory: (dataSourceOptions) => createMysqlDataSource(dataSourceOptions),
            inject: [TYPEORM_OPTIONS],
        });
        if (autoInitialize) {
            launcher.ready(async () => {
                const dataSource = launcher.container.resolve(TYPEORM_DATA_SOURCE);
                await initializeDataSource(dataSource);
                console.log(`[${logLabel}] MySQL datasource initialized`);
            });
        }
        const shutdown = async () => {
            const dataSource = launcher.container.tryResolve(TYPEORM_DATA_SOURCE);
            if (dataSource) {
                await destroyDataSource(dataSource);
            }
        };
        process.once("SIGINT", shutdown);
        process.once("SIGTERM", shutdown);
    };
    return {
        name: "toijs.typeorm",
        prepare,
    };
}
//# sourceMappingURL=typeorm.module.js.map