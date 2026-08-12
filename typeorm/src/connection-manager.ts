import {
  DataSource,
  type DataSourceOptions,
  type MixedList,
} from 'typeorm';
import { TypeORMEntity, TypeORMMigration, TypeORMSubscriber, TypeORMSeed } from './database.type';

export class ConnectionManager {
  private defaultConnection = 'default';
  private readonly connections = new Map<string, DataSource>();
  private readonly entities = new Map<string, TypeORMEntity[]>();
  private readonly migrations = new Map<string, TypeORMMigration[]>();
  private readonly subscribers = new Map<string, TypeORMSubscriber[]>();
  private readonly seeds = new Map<string, TypeORMSeed[]>();

  setDefaultConnection(name: string) {
    this.defaultConnection = name;
    return this;
  }

  /**
   * Normalize a mixed list to an array.
   * @param value - The mixed list to normalize.
   * @returns The array.
   */
  private normalize<T>(value: MixedList<T>): T[] {
    if (Array.isArray(value)) {
      return value;
    }
  
    return Object.values(value);
  }

  /**
   * Merge a mixed list into a map.
   * @param map - The map to merge into.
   * @param values - The values to merge.
   * @param name - The name of the map.
   */
  private merge<T>(
    map: Map<string, MixedList<T>>,
    values: MixedList<T>,
    name: string,
  ) {
    const current = map.get(name) ?? [];
  
    map.set(name, [
      ...(current as T[]),
      ...this.normalize(values),
    ]);
  }

  /**
   * Create a connection.
   * @param name - The name of the connection.
   * @param options - The options for the connection.
   * @returns The connection.
   */
  async connect(
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

    await connection.initialize();

    return this;
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
      return this;
    }

    if (connection.isInitialized) {
      await connection.destroy();
    }

    this.connections.delete(name);

    return this;
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
    entities: TypeORMEntity[],
    name: string = this.defaultConnection,
  ) {
    this.merge(this.entities, entities, name);
    return this;
  }

  /**
   * Register a migration.
   * @param migration - The migration to register.
   * @param name - The name of the migration.
   */
  setMigrations(
    migrations: TypeORMMigration[],
    name: string = this.defaultConnection,
  ) {
    this.merge(this.migrations, migrations, name);
    return this;
  }

  /**
   * Register a seed.
   * @param seed - The seed to register.
   * @param name - The name of the seed.
   */
  setSeeds(
    seeds: TypeORMSeed[],
    name: string = this.defaultConnection,
  ) {
    this.merge(this.seeds, seeds, name);
    return this;
  }

  /**
   * Register a subscriber.
   * @param subscriber - The subscriber to register.
   * @param name - The name of the subscriber.
   */
  setSubscribers(
    subscribers: TypeORMSubscriber[],
    name: string = this.defaultConnection,
  ) {
    this.merge(this.subscribers, subscribers, name);
    return this;
  }

  /**
   * Get all entities.
   * @param name - The name of the connection.
   * @returns All entities.
   */
  getEntities(
    name: string = this.defaultConnection,
  ): TypeORMEntity[] {
    return this.entities.get(name) ?? [];
  }

  /**
   * Get all migrations.
   * @param name - The name of the connection.
   * @returns All migrations.
   */
  getMigrations(
    name: string = this.defaultConnection,
  ): TypeORMMigration[] {
    return this.migrations.get(name) ?? [];
  }

  /**
   * Get all seeds.
   * @param name - The name of the connection.
   * @returns All seeds.
   */
  getSeeds(
    name: string = this.defaultConnection,
  ): TypeORMSeed[] {
    return this.seeds.get(name) ?? [];
  }

  /**
   * Get all subscribers.
   * @param name - The name of the connection.
   * @returns All subscribers.
   */
  getSubscribers(
    name: string = this.defaultConnection,
  ): TypeORMSubscriber[] {
    return this.subscribers.get(name) ?? [];
  }

  /**
   * Run seeds.
   * @param name - The name of the connection.
   * @returns The connection.
   */
  async seed(
    command: "run" | "revert",
    name: string = this.defaultConnection
  ) {
    const connection = this.getConnection(name);

    if (!connection) {
      throw new Error(
        `Connection "${name}" not found`,
      );
    }

    const seeds = this.getSeeds(name);

    for (const seed of seeds) {
      const seedInstance = new (seed as any)();
      if (command == "run") await seedInstance.run(connection.createQueryRunner());
      else if (command == "revert") await seedInstance.revert(connection.createQueryRunner());
      else throw new Error(`Invalid command: ${command}`);
    }

    return this;
  }

  /**
   * Run migrations.
   * @param name - The name of the connection.
   * @returns The connection.
   */
  async migrate(
    command: "up" | "down",
    name: string = this.defaultConnection
  ) {
    const connection = this.getConnection(name);

    if (!connection) {
      throw new Error(
        `Connection "${name}" not found`,
      );
    }

    if (command == "up") await connection.runMigrations();
    else if (command == "down") await connection.undoLastMigration();
    else throw new Error(`Invalid command: ${command}`);

    return this;
  }
}

export const connectionManager =
  new ConnectionManager();
