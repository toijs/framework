import {
  DataSource,
  EntitySchema,
  type DataSourceOptions,
  type EntitySchemaOptions,
  type MixedList,
} from 'typeorm';
import { TypeORMMigration, TypeORMSubscriber, TypeORMSeed } from './database.type';

export class ConnectionManager {
  private defaultConnection = 'default';
  private readonly connections = new Map<string, DataSource>();
  private readonly entitySchemaOptions = new Map<
    string,
    Map<string, EntitySchemaOptions<any>>
  >();
  private readonly entities = new Map<
    string,
    Map<string, EntitySchema>
  >();
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
   * Merge two record objects.
   * @param current - The current record.
   * @param incoming - The incoming record.
   * @returns The merged record.
   */
  private mergeRecords<T extends object>(
    current?: T,
    incoming?: T,
  ): T | undefined {
    if (!current && !incoming) {
      return undefined;
    }

    return {
      ...(current ?? {}),
      ...(incoming ?? {}),
    } as T;
  }

  /**
   * Concatenate two arrays.
   * @param current - The current array.
   * @param incoming - The incoming array.
   * @returns The concatenated array.
   */
  private mergeArrays<T>(
    current?: T[],
    incoming?: T[],
  ): T[] | undefined {
    if (!current?.length && !incoming?.length) {
      return undefined;
    }

    return [
      ...(current ?? []),
      ...(incoming ?? []),
    ];
  }

  /**
   * Merge arrays of named items by `name`.
   * @param current - The current array.
   * @param incoming - The incoming array.
   * @returns The merged array.
   */
  private mergeNamedArrays<T extends { name?: string }>(
    current?: T[],
    incoming?: T[],
  ): T[] | undefined {
    if (!current?.length && !incoming?.length) {
      return undefined;
    }

    const named = new Map<string, T>();
    const anonymous: T[] = [];

    for (const item of [...(current ?? []), ...(incoming ?? [])]) {
      if (!item.name) {
        anonymous.push(item);
        continue;
      }

      const existing = named.get(item.name);

      named.set(
        item.name,
        existing ? { ...existing, ...item } : item,
      );
    }

    return [...named.values(), ...anonymous];
  }

  /**
   * Merge entity schema options by field.
   * @param current - The current options.
   * @param incoming - The incoming options.
   * @returns The merged options.
   */
  private mergeEntitySchemaOptions(
    current: EntitySchemaOptions<any> | undefined,
    incoming: EntitySchemaOptions<any>,
  ): EntitySchemaOptions<any> {
    if (!current) {
      return { ...incoming };
    }

    return {
      ...current,
      ...incoming,
      columns: {
        ...current.columns,
        ...incoming.columns,
      },
      relations: this.mergeRecords(
        current.relations,
        incoming.relations,
      ),
      relationIds: this.mergeRecords(
        current.relationIds,
        incoming.relationIds,
      ),
      embeddeds: this.mergeRecords(
        current.embeddeds,
        incoming.embeddeds,
      ),
      orderBy: this.mergeRecords(
        current.orderBy,
        incoming.orderBy,
      ),
      inheritance: this.mergeRecords(
        current.inheritance,
        incoming.inheritance,
      ),
      indices: this.mergeNamedArrays(
        current.indices,
        incoming.indices,
      ),
      foreignKeys: this.mergeNamedArrays(
        current.foreignKeys,
        incoming.foreignKeys,
      ),
      uniques: this.mergeNamedArrays(
        current.uniques,
        incoming.uniques,
      ),
      checks: this.mergeNamedArrays(
        current.checks,
        incoming.checks,
      ),
      exclusions: this.mergeNamedArrays(
        current.exclusions,
        incoming.exclusions,
      ),
      trees: this.mergeArrays(
        current.trees,
        incoming.trees,
      ),
    };
  }

  /**
   * Create EntitySchema instances from merged options.
   * @param connectionName - The name of the connection.
   * @returns The created entity schemas.
   */
  private buildEntities(connectionName: string): EntitySchema[] {
    const optionsMap = this.entitySchemaOptions.get(connectionName);
    const entityMap = new Map<string, EntitySchema>();

    if (optionsMap) {
      for (const [entityName, options] of optionsMap) {
        entityMap.set(entityName, new EntitySchema(options));
      }
    }

    this.entities.set(connectionName, entityMap);

    return Array.from(entityMap.values());
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

    const entitySchemas = this.buildEntities(connName);

    const connOptions: DataSourceOptions = {
      ...baseOptions,

      entities:
        baseOptions.entities ??
        entitySchemas,

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
   * Register entity schema options, merged by entity `name`.
   * @param options - The entity schema options to register.
   * @param name - The name of the connection.
   */
  setEntitySchemaOptions(
    options: EntitySchemaOptions<any> | EntitySchemaOptions<any>[],
    name: string = this.defaultConnection,
  ) {
    const list = Array.isArray(options) ? options : [options];
    const current = this.entitySchemaOptions.get(name)
      ?? new Map<string, EntitySchemaOptions<any>>();

    for (const option of list) {
      if (!option.name) {
        throw new Error("EntitySchemaOptions.name is required");
      }

      current.set(
        option.name,
        this.mergeEntitySchemaOptions(
          current.get(option.name),
          option,
        ),
      );
    }

    this.entitySchemaOptions.set(name, current);
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
   * Get merged entity schema options for a connection.
   * @param name - The name of the connection.
   * @returns All entity schema options.
   */
  getEntitySchemaOptions(
    name: string = this.defaultConnection,
  ): EntitySchemaOptions<any>[] {
    return Array.from(
      this.entitySchemaOptions.get(name)?.values() ?? [],
    );
  }

  /**
   * Get an EntitySchema created during connect.
   * @param name - The entity name.
   * @param connectionName - The name of the connection.
   * @returns The entity schema.
   */
  getEntity<T = any>(
    name: string,
    connectionName: string = this.defaultConnection,
  ): EntitySchema<T> | undefined {
    const entity = this.entities
      .get(connectionName)
      ?.get(name) as EntitySchema<T> | undefined;

    if (entity) {
      return entity;
    }

    if (this.entitySchemaOptions.get(connectionName)?.has(name)) {
      throw new Error(
        `Entity schema "${name}" has not been created. Connect first.`,
      );
    }

    return undefined;
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
