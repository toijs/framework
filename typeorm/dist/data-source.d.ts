import { DataSource } from "typeorm";
import type { DataSourceOptions } from "typeorm";
export type MysqlDataSourceOptions = Extract<DataSourceOptions, {
    type: "mysql" | "mariadb";
}>;
/** Shape typically resolved from `launcher.config.resolve("database")`. */
export type DatabaseConfig = {
    host: string;
    port: number | string;
    username: string;
    password: string;
    database: string;
    charset?: string;
    timezone?: string;
    logging?: boolean | string;
    migrationsTableName?: string;
};
export type TypeOrmConfig = DatabaseConfig;
export declare function createMysqlDataSourceOptions(config: DatabaseConfig, overrides?: Partial<MysqlDataSourceOptions>): MysqlDataSourceOptions;
export declare function createMysqlDataSource(options: MysqlDataSourceOptions): DataSource;
export declare function initializeDataSource(dataSource: DataSource): Promise<DataSource>;
export declare function destroyDataSource(dataSource: DataSource): Promise<void>;
//# sourceMappingURL=data-source.d.ts.map