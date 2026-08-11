import { DataSource } from "typeorm";
export class ConnectionManager {
    connections = new Map();
    defaultConnection = 'default';
    async setDefaultConnection(name) {
        this.defaultConnection = name;
    }
    /**
     * Create a new connection.
     * @param name - The name of the connection.
     * @param options - The options for the connection.
     */
    async create(name, options) {
        let connName = null;
        let connOptions = options;
        if (!connOptions) {
            connOptions = name;
            connName = this.defaultConnection;
        }
        else {
            connName = name;
        }
        const conn = new DataSource(connOptions);
        this.connections.set(connName, conn);
        return conn;
    }
    /**
     * Get a connection by name.
     * @param name - The name of the connection.
     * @returns The connection.
     */
    async connect(name = this.defaultConnection) {
        return this.connections.get(name)?.initialize();
    }
    /**
     * Close a connection by name.
     * @param name - The name of the connection.
     */
    async close(name = this.defaultConnection) {
        await this.connections.get(name)?.destroy();
        await this.connections.delete(name);
    }
    /**
     * Get a connection by name.
     * @param name - The name of the connection.
     * @returns The connection.
     */
    async getConnection(name = this.defaultConnection) {
        return this.connections.get(name);
    }
    /**
     * Get all connections.
     * @returns All connections.
     */
    async getAllConnections() {
        return Array.from(this.connections.values());
    }
}
export const connectionManager = new ConnectionManager();
//# sourceMappingURL=connection-manager.js.map