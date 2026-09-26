import type {
  DocumentNode,
  ExecutionResult,
  GraphQLFieldResolver,
} from "graphql";

/**
 * GraphQL SDL accepted by `setSchema`.
 * A string is parsed; a DocumentNode is stored as-is.
 */
export type GraphQLTypeDefs = string | DocumentNode;

/**
 * Operation payload sent by the client (GraphQL HTTP body).
 */
export type GraphQLRequest = {
  /** GraphQL document string (query, mutation, or subscription). */
  query: string;
  /** Operation variables, if any. */
  variables?: Record<string, unknown> | null;
  /** Named operation to run when the document contains more than one. */
  operationName?: string | null;
};

/**
 * Subscription field: `subscribe` yields an event stream; `resolve` maps each payload.
 *
 * @typeParam TSource - Parent object (root is typically empty).
 * @typeParam TContext - Value passed as the second argument of `invoke`.
 * @typeParam TArgs - Field arguments from the GraphQL document.
 */
export type GraphQLSubscriptionField<
  TSource = any,
  TContext = any,
  TArgs = any,
> = {
  /** Returns an AsyncIterable of events for this field. */
  subscribe: GraphQLFieldResolver<TSource, TContext, TArgs>;
  /** Maps each event payload to the field result. Defaults to the payload itself. */
  resolve?: GraphQLFieldResolver<TSource, TContext, TArgs>;
};

/**
 * A field implementation: a resolver function, or `{ subscribe, resolve }` for Subscription.
 *
 * @typeParam TSource - Parent object.
 * @typeParam TContext - Value passed as the second argument of `invoke`.
 * @typeParam TArgs - Field arguments from the GraphQL document.
 */
export type GraphQLFieldValue<TSource = any, TContext = any, TArgs = any> =
  | GraphQLFieldResolver<TSource, TContext, TArgs>
  | GraphQLSubscriptionField<TSource, TContext, TArgs>;

/**
 * Resolver map registered via `setResolvers`.
 * Keys are GraphQL type names (`Query`, `Mutation`, `Subscription`, or object types).
 *
 * @typeParam TContext - Value passed as the second argument of `invoke`.
 */
export type GraphQLResolvers<TContext = any> = {
  /** Root Query field resolvers. */
  Query?: Record<string, GraphQLFieldValue<any, TContext>>;
  /** Root Mutation field resolvers. */
  Mutation?: Record<string, GraphQLFieldValue<any, TContext>>;
  /** Root Subscription fields (`subscribe` / `resolve` or a subscribe function). */
  Subscription?: Record<string, GraphQLFieldValue<any, TContext>>;
  /** Nested object-type field resolvers. */
  [typeName: string]:
    | Record<string, GraphQLFieldValue<any, TContext>>
    | undefined;
};

/**
 * Result of `invoke`.
 * Query and Mutation resolve to an `ExecutionResult`.
 * Subscription resolves to an async iterable of `ExecutionResult` events.
 */
export type GraphQLInvokeResult =
  | ExecutionResult
  | AsyncIterable<ExecutionResult>;
