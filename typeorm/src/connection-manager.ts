import { DataSource, EntitySchema, type DataSourceOptions } from "typeorm";

export class ConnectionManager {
  private connections: Map<string, DataSource> = new Map();
  private defaultConnection: string = 'default';
  private entities: Map<string, EntitySchema[]> = new Map();

  async setDefaultConnection(name: string) {
    this.defaultConnection = name;
  }

  /**
   * Create a new connection.
   * @param name - The name of the connection.
   * @param options - The options for the connection.
   */
  async create(name: string | DataSourceOptions, options?: DataSourceOptions) {
    let connName = null;
    let connOptions = options;

    if (!connOptions) {
      connOptions = name as DataSourceOptions;
      connName = this.defaultConnection;
    } else {
      connName = name as string;
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
  async connect(name: string = this.defaultConnection) {
    return this.connections.get(name)?.initialize();
  }

  /**
   * Close a connection by name.
   * @param name - The name of the connection.
   */
  async close(name: string = this.defaultConnection) {
    await this.connections.get(name)?.destroy();
    await this.connections.delete(name);
  }

  /**
   * Get a connection by name.
   * @param name - The name of the connection.
   * @returns The connection.
   */
  async getConnection(name: string = this.defaultConnection) {
    return this.connections.get(name);
  }

  /**
   * Get all connections.
   * @returns All connections.
   */
  async getAllConnections() {
    return Array.from(this.connections.values());
  }

  /**
   * Register an entity.
   * @param entity - The entity to register.
   * @param name - The name of the entity.
   */
  async setEntities(entities: EntitySchema[], name: string = this.defaultConnection) {
    this.entities.set(name, entities);
    return this;
  }

  /**
   * Get all entities.
   * @param name - The name of the connection.
   * @returns All entities.
   */
  getEntities(name: string = this.defaultConnection): EntitySchema[] {
    return Array.from(this.entities.get(name)?.values() || []);
  }
}

export const connectionManager = new ConnectionManager();
