import {
  buildASTSchema,
  defaultFieldResolver,
  execute,
  getOperationAST,
  GraphQLError,
  parse,
  subscribe,
  validate,
  type DocumentNode,
  type GraphQLFieldResolver,
  type GraphQLSchema,
} from "graphql";
import {
  hasRootType,
  isSubscriptionField,
  mergeTypeDefs,
  toGraphQLError,
} from "./utils";
import type {
  GraphQLFieldValue,
  GraphQLInvokeResult,
  GraphQLRequest,
  GraphQLResolvers,
  GraphQLTypeDefs,
} from "./types";

export type {
  GraphQLInvokeResult,
  GraphQLRequest,
  GraphQLResolvers,
  GraphQLTypeDefs,
} from "./types";

/**
 * Shared GraphQL registry used by every feature module.
 * Modules call `setSchema` / `setResolvers` independently; `invoke` runs
 * against the merged schema. One instance is exported as `graphqlManager`.
 */
export class GraphQLManager {
  /** Parsed SDL documents collected from every `setSchema` call. */
  private readonly documents: DocumentNode[] = [];
  /** Resolvers keyed by type name, then field name. */
  private readonly resolvers = new Map<
    string,
    Map<string, GraphQLFieldValue>
  >();
  /** Cached executable schema; cleared when `setSchema` runs. */
  private schema: GraphQLSchema | undefined;

  /**
   * Register SDL from a module. Types of the same name from different
   * modules are merged by field.
   * @param typeDefs - SDL string, DocumentNode, or an array of either.
   * @returns This manager for chaining.
   */
  setSchema(typeDefs: GraphQLTypeDefs | GraphQLTypeDefs[]): this {
    const list = Array.isArray(typeDefs) ? typeDefs : [typeDefs];

    for (const item of list) {
      this.documents.push(typeof item === "string" ? parse(item) : item);
    }

    this.schema = undefined;
    return this;
  }

  /**
   * Register Query, Mutation, Subscription (and nested type) resolvers.
   * Each module calls `setResolvers` independently; fields are merged.
   * @param resolvers - Map of type name → field resolvers, or an array of maps.
   * @returns This manager for chaining.
   * @throws If a field on the same type is registered twice.
   */
  setResolvers(resolvers: GraphQLResolvers | GraphQLResolvers[]): this {
    const list = Array.isArray(resolvers) ? resolvers : [resolvers];

    for (const map of list) {
      for (const [typeName, fields] of Object.entries(map)) {
        if (!fields) {
          continue;
        }

        for (const [fieldName, field] of Object.entries(fields)) {
          this.addResolver(typeName, fieldName, field);
        }
      }
    }

    return this;
  }

  /**
   * Execute a GraphQL operation from the client against the merged schema.
   * Query / Mutation return `ExecutionResult`.
   * Subscription returns `AsyncIterable<ExecutionResult>`.
   * @param request - Client body `{ query, variables, operationName }` or a query string.
   * @param context - Value passed to every resolver as `context`.
   * @returns Execution result, or an async iterable for subscriptions.
   */
  async invoke(
    request: GraphQLRequest | string,
    context?: unknown,
  ): Promise<GraphQLInvokeResult> {
    const payload =
      typeof request === "string" ? { query: request } : request;

    if (!payload.query || typeof payload.query !== "string") {
      return {
        errors: [new GraphQLError("GraphQL query is required")],
      };
    }

    const schema = this.getSchema();
    let document: DocumentNode;

    try {
      document = parse(payload.query);
    } catch (error) {
      return { errors: [toGraphQLError(error)] };
    }

    const validationErrors = validate(schema, document);

    if (validationErrors.length) {
      return { errors: validationErrors };
    }

    const operation = getOperationAST(
      document,
      payload.operationName ?? undefined,
    );

    if (!operation) {
      return {
        errors: [new GraphQLError("Unable to identify GraphQL operation")],
      };
    }

    const variableValues = payload.variables ?? undefined;
    const operationName = payload.operationName ?? undefined;

    if (operation.operation === "subscription") {
      return subscribe({
        schema,
        document,
        variableValues,
        operationName,
        contextValue: context,
        fieldResolver: this.fieldResolver,
        subscribeFieldResolver: this.subscribeFieldResolver,
      });
    }

    return execute({
      schema,
      document,
      variableValues,
      operationName,
      contextValue: context,
      fieldResolver: this.fieldResolver,
    });
  }

  /**
   * Build (or return the cached) executable schema from every module.
   * @returns The merged GraphQLSchema.
   * @throws If no SDL has been registered with `setSchema`.
   */
  getSchema(): GraphQLSchema {
    if (this.schema) {
      return this.schema;
    }

    if (!this.documents.length) {
      throw new Error(
        "GraphQL schema is empty. Call setSchema first.",
      );
    }

    const documents = [...this.documents];

    if (!hasRootType(documents, "Query")) {
      documents.push(parse("type Query { _empty: String }"));
    }

    this.schema = buildASTSchema(mergeTypeDefs(documents));
    return this.schema;
  }

  /**
   * Store one field resolver. Duplicate type.field names throw.
   * @param typeName - GraphQL type (`Query`, `User`, …).
   * @param fieldName - Field on that type.
   * @param field - Resolver function or subscription config.
   */
  private addResolver(
    typeName: string,
    fieldName: string,
    field: GraphQLFieldValue,
  ): void {
    const typeResolvers =
      this.resolvers.get(typeName) ?? new Map<string, GraphQLFieldValue>();

    if (typeResolvers.has(fieldName)) {
      throw new Error(
        `GraphQL ${typeName} "${fieldName}" is already registered`,
      );
    }

    typeResolvers.set(fieldName, field);
    this.resolvers.set(typeName, typeResolvers);
  }

  /**
   * Look up a stored resolver for a type field.
   * @param typeName - GraphQL type name.
   * @param fieldName - Field name.
   * @returns The resolver, or undefined if none is registered.
   */
  private getField(
    typeName: string,
    fieldName: string,
  ): GraphQLFieldValue | undefined {
    return this.resolvers.get(typeName)?.get(fieldName);
  }

  /**
   * Default field resolver: Query / Mutation functions, Subscription payload mapping.
   */
  private readonly fieldResolver: GraphQLFieldResolver<
    any,
    any
  > = (source, args, context, info) => {
    const field = this.getField(info.parentType.name, info.fieldName);

    if (isSubscriptionField(field)) {
      if (field.resolve) {
        return field.resolve(source, args, context, info);
      }

      return source;
    }

    if (typeof field === "function") {
      if (info.parentType.name === "Subscription") {
        return source;
      }

      return field(source, args, context, info);
    }

    return defaultFieldResolver(source, args, context, info);
  };

  /**
   * Resolver used by `subscribe()` to obtain the AsyncIterable for a Subscription field.
   */
  private readonly subscribeFieldResolver: GraphQLFieldResolver<
    any,
    any
  > = (source, args, context, info) => {
    const field = this.getField(info.parentType.name, info.fieldName);

    if (isSubscriptionField(field)) {
      return field.subscribe(source, args, context, info);
    }

    if (typeof field === "function") {
      return field(source, args, context, info);
    }

    return defaultFieldResolver(source, args, context, info);
  };
}

/**
 * Process-wide GraphQLManager. Feature modules import this singleton
 * to `setSchema` / `setResolvers`. Controllers inject `GraphQLManager`.
 */
export const graphqlManager = new GraphQLManager();
