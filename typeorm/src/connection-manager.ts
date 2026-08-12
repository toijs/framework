import {
  DataSource,
  EntitySchema,
  type DataSourceOptions,
  type MixedList,
} from 'typeorm';

export class ConnectionManager {
  private readonly connections = new Map<string, DataSource>();

  private defaultConnection = 'default';

  private readonly entities = new Map<
    string,
    MixedList<Function | string | EntitySchema>
  >();

  private readonly migrations = new Map<
    string,
    MixedList<Function | string>
  >();

  private readonly subscribers = new Map<
    string,
    MixedList<Function | string>
  >();

  setDefaultConnection(name: string) {
    this.defaultConnection = name;
    return this;
  }

  /**
   * Create a connection.
   * @param name - The name of the connection.
   * @param options - The options for the connection.
   * @returns The connection.
   */
  async create(
    name: string | DataSourceOptions,
    options?: DataSourceOptions,
  ) {
    const connName = options
      ? (name as string)
      : this.defaultConnection;

    const baseOptions = options
      ? options
      : (name as DataSourceOptions);

    const connOptions: DataSourceOptions = {
      ...baseOptions,

      entities:
        baseOptions.entities ??
        this.getEntities(connName),

      migrations:
        baseOptions.migrations ??
        this.getMigrations(connName),

      subscribers:
        baseOptions.subscribers ??
        this.getSubscribers(connName),
    };

    const connection = new DataSource(connOptions);

    this.connections.set(connName, connection);

    return connection;
  }

  /**
   * Connect to a connection.
   * @param name - The name of the connection.
   * @returns The connection.
   */
  async connect(
    name: string = this.defaultConnection,
  ) {
    const connection = this.connections.get(name);

    if (!connection) {
      throw new Error(
        `Connection "${name}" not found`,
      );
    }

    if (!connection.isInitialized) {
      await connection.initialize();
    }

    return connection;
  }

  /**
   * Close a connection.
   * @param name - The name of the connection.
   * @returns The connection.
   */
  async close(
    name: string = this.defaultConnection,
  ) {
    const connection = this.connections.get(name);

    if (!connection) {
      return;
    }

    if (connection.isInitialized) {
      await connection.destroy();
    }

    this.connections.delete(name);
  }

  /**
   * Get a connection.
   * @param name - The name of the connection.
   * @returns The connection.
   */
  getConnection(
    name: string = this.defaultConnection,
  ) {
    return this.connections.get(name);
  }

  /**
   * Get all connections.
   * @returns All connections.
   */
  getAllConnections() {
    return Array.from(
      this.connections.values(),
    );
  }

  /**
   * Register entities.
   * @param entities - The entities to register.
   * @param name - The name of the connection.
   */
  setEntities(
    entities: MixedList<Function | string | EntitySchema>,
    name: string = this.defaultConnection,
  ) {
    this.entities.set(name, entities);
    return this;
  }

  /**
   * Register a migration.
   * @param migration - The migration to register.
   * @param name - The name of the migration.
   */
  setMigrations(
    migrations: MixedList<Function | string>,
    name: string = this.defaultConnection,
  ) {
    this.migrations.set(name, migrations);
    return this;
  }

  /**
   * Register a subscriber.
   * @param subscriber - The subscriber to register.
   * @param name - The name of the subscriber.
   */
  setSubscribers(
    subscribers: MixedList<Function | string>,
    name: string = this.defaultConnection,
  ) {
    this.subscribers.set(name, subscribers);
    return this;
  }

  /**
   * Get all entities.
   * @param name - The name of the connection.
   * @returns All entities.
   */
  getEntities(
    name: string = this.defaultConnection,
  ): MixedList<Function | string | EntitySchema> {
    return this.entities.get(name) ?? [];
  }

  /**
   * Get all migrations.
   * @param name - The name of the connection.
   * @returns All migrations.
   */
  getMigrations(
    name: string = this.defaultConnection,
  ): MixedList<Function | string> {
    return this.migrations.get(name) ?? [];
  }

  /**
   * Get all subscribers.
   * @param name - The name of the connection.
   * @returns All subscribers.
   */
  getSubscribers(
    name: string = this.defaultConnection,
  ): MixedList<Function | string> {
    return this.subscribers.get(name) ?? [];
  }
}

export const connectionManager =
  new ConnectionManager();