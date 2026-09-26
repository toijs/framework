import { GraphQLError, Kind, type DocumentNode } from "graphql";
import type {
  GraphQLFieldValue,
  GraphQLSubscriptionField,
} from "../types";

/**
 * Normalize an unknown thrown value into a GraphQLError.
 * @param error - The value caught while parsing or executing.
 * @returns A GraphQLError suitable for `ExecutionResult.errors`.
 */
export function toGraphQLError(error: unknown): GraphQLError {
  if (error instanceof GraphQLError) {
    return error;
  }

  if (error instanceof Error) {
    return new GraphQLError(error.message);
  }

  return new GraphQLError(String(error));
}

/**
 * Detect a Subscription field object `{ subscribe, resolve? }`.
 * @param value - A stored field resolver or subscription config.
 * @returns True when `value` has a `subscribe` function.
 */
export function isSubscriptionField(
  value: GraphQLFieldValue | undefined,
): value is GraphQLSubscriptionField {
  return (
    typeof value === "object" &&
    value !== null &&
    "subscribe" in value &&
    typeof value.subscribe === "function"
  );
}

/**
 * Whether any document defines or extends the named root object type.
 * @param documents - Parsed SDL documents from every module.
 * @param typeName - Root type name (`Query`, `Mutation`, `Subscription`).
 * @returns True if the type appears in any document.
 */
export function hasRootType(
  documents: DocumentNode[],
  typeName: string,
): boolean {
  return documents.some((document) =>
    document.definitions.some(
      (definition) =>
        (definition.kind === Kind.OBJECT_TYPE_DEFINITION ||
          definition.kind === Kind.OBJECT_TYPE_EXTENSION) &&
        definition.name.value === typeName,
    ),
  );
}
