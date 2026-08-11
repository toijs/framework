import { DataSource, type DataSourceOptions } from "typeorm";
export declare class ConnectionManager {
    private connections;
    private defaultConnection;
    setDefaultConnection(name: string): Promise<void>;
    /**
     * Create a new connection.
     * @param name - The name of the connection.
     * @param options - The options for the connection.
     */
    create(name: string | DataSourceOptions, options?: DataSourceOptions): Promise<DataSource>;
    /**
     * Get a connection by name.
     * @param name - The name of the connection.
     * @returns The connection.
     */
    connect(name?: string): Promise<DataSource | undefined>;
    /**
     * Close a connection by name.
     * @param name - The name of the connection.
     */
    close(name?: string): Promise<void>;
    /**
     * Get a connection by name.
     * @param name - The name of the connection.
     * @returns The connection.
     */
    getConnection(name?: string): Promise<DataSource | undefined>;
    /**
     * Get all connections.
     * @returns All connections.
     */
    getAllConnections(): Promise<DataSource[]>;
}
export declare const connectionManager: ConnectionManager;
//# sourceMappingURL=connection-manager.d.ts.map