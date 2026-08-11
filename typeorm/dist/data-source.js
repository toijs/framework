import { DataSource } from "typeorm";
export function createMysqlDataSourceOptions(config, overrides = {}) {
    return {
        type: "mysql",
        host: config.host,
        port: Number(config.port),
        username: config.username,
        password: config.password,
        database: config.database,
        charset: config.charset,
        timezone: config.timezone,
        logging: config.logging === true || config.logging === "true",
        synchronize: false,
        migrationsRun: false,
        migrationsTableName: config.migrationsTableName,
        entities: [],
        migrations: [],
        ...overrides,
    };
}
export function createMysqlDataSource(options) {
    return new DataSource(options);
}
export async function initializeDataSource(dataSource) {
    if (!dataSource.isInitialized) {
        await dataSource.initialize();
    }
    return dataSource;
}
export async function destroyDataSource(dataSource) {
    if (dataSource.isInitialized) {
        await dataSource.destroy();
    }
}
//# sourceMappingURL=data-source.js.map