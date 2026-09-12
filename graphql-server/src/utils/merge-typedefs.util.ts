import {
  Kind,
  type DefinitionNode,
  type DocumentNode,
  type EnumTypeDefinitionNode,
  type EnumTypeExtensionNode,
  type EnumValueDefinitionNode,
  type FieldDefinitionNode,
  type InputObjectTypeDefinitionNode,
  type InputObjectTypeExtensionNode,
  type InputValueDefinitionNode,
  type InterfaceTypeDefinitionNode,
  type InterfaceTypeExtensionNode,
  type NamedTypeNode,
  type ObjectTypeDefinitionNode,
  type ObjectTypeExtensionNode,
  type UnionTypeDefinitionNode,
  type UnionTypeExtensionNode,
} from "graphql";

/**
 * Build a merge key so a type definition and its extensions share a slot.
 * @param def - A GraphQL AST definition.
 * @returns A kind/name key, or undefined for anonymous definitions.
 */
function namedKey(def: DefinitionNode): string | undefined {
  switch (def.kind) {
    case Kind.OBJECT_TYPE_DEFINITION:
    case Kind.OBJECT_TYPE_EXTENSION:
      return `ObjectType:${def.name.value}`;
    case Kind.INTERFACE_TYPE_DEFINITION:
    case Kind.INTERFACE_TYPE_EXTENSION:
      return `InterfaceType:${def.name.value}`;
    case Kind.INPUT_OBJECT_TYPE_DEFINITION:
    case Kind.INPUT_OBJECT_TYPE_EXTENSION:
      return `InputObjectType:${def.name.value}`;
    case Kind.ENUM_TYPE_DEFINITION:
    case Kind.ENUM_TYPE_EXTENSION:
      return `EnumType:${def.name.value}`;
    case Kind.UNION_TYPE_DEFINITION:
    case Kind.UNION_TYPE_EXTENSION:
      return `UnionType:${def.name.value}`;
    case Kind.SCALAR_TYPE_DEFINITION:
    case Kind.SCALAR_TYPE_EXTENSION:
      return `ScalarType:${def.name.value}`;
    case Kind.DIRECTIVE_DEFINITION:
      return `Directive:${def.name.value}`;
    case Kind.SCHEMA_DEFINITION:
    case Kind.SCHEMA_EXTENSION:
      return "Schema";
    default:
      return undefined;
  }
}

/**
 * Merge NamedType lists by name (interfaces, union members).
 * @param current - Existing named types.
 * @param incoming - Named types from another module.
 * @returns Unique named types, or undefined when both sides are empty.
 */
function mergeNamedTypes(
  current?: readonly NamedTypeNode[],
  incoming?: readonly NamedTypeNode[],
): NamedTypeNode[] | undefined {
  if (!current?.length && !incoming?.length) {
    return current as NamedTypeNode[] | undefined;
  }

  const merged = new Map<string, NamedTypeNode>();

  for (const node of [...(current ?? []), ...(incoming ?? [])]) {
    merged.set(node.name.value, node);
  }

  return Array.from(merged.values());
}

/**
 * Merge named members (fields, input fields, enum values). Duplicate names throw.
 * @param typeName - Parent type name, used in the error message.
 * @param current - Existing members.
 * @param incoming - Members from another module.
 * @returns Combined members.
 */
function mergeFields<T extends { name: { value: string } }>(
  typeName: string,
  current: readonly T[] | undefined,
  incoming: readonly T[] | undefined,
): T[] {
  const merged = new Map<string, T>();

  for (const field of current ?? []) {
    merged.set(field.name.value, field);
  }

  for (const field of incoming ?? []) {
    if (merged.has(field.name.value)) {
      throw new Error(
        `GraphQL field "${typeName}.${field.name.value}" is already registered`,
      );
    }

    merged.set(field.name.value, field);
  }

  return Array.from(merged.values());
}

/**
 * Merge object type definition / extension into one object type.
 * @param current - Existing object type.
 * @param incoming - Object type or extension from another module.
 * @returns A single ObjectTypeDefinition.
 */
function mergeObjectTypes(
  current: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
  incoming: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
): ObjectTypeDefinitionNode {
  const typeName = current.name.value;

  return {
    ...current,
    kind: Kind.OBJECT_TYPE_DEFINITION,
    fields: mergeFields<FieldDefinitionNode>(
      typeName,
      current.fields,
      incoming.fields,
    ),
    interfaces: mergeNamedTypes(current.interfaces, incoming.interfaces),
    directives: [...(current.directives ?? []), ...(incoming.directives ?? [])],
  };
}

/**
 * Merge interface type definition / extension into one interface type.
 * @param current - Existing interface type.
 * @param incoming - Interface type or extension from another module.
 * @returns A single InterfaceTypeDefinition.
 */
function mergeInterfaceTypes(
  current: InterfaceTypeDefinitionNode | InterfaceTypeExtensionNode,
  incoming: InterfaceTypeDefinitionNode | InterfaceTypeExtensionNode,
): InterfaceTypeDefinitionNode {
  const typeName = current.name.value;

  return {
    ...current,
    kind: Kind.INTERFACE_TYPE_DEFINITION,
    fields: mergeFields<FieldDefinitionNode>(
      typeName,
      current.fields,
      incoming.fields,
    ),
    interfaces: mergeNamedTypes(current.interfaces, incoming.interfaces),
    directives: [...(current.directives ?? []), ...(incoming.directives ?? [])],
  };
}

/**
 * Merge input object type definition / extension into one input type.
 * @param current - Existing input object type.
 * @param incoming - Input object type or extension from another module.
 * @returns A single InputObjectTypeDefinition.
 */
function mergeInputObjectTypes(
  current: InputObjectTypeDefinitionNode | InputObjectTypeExtensionNode,
  incoming: InputObjectTypeDefinitionNode | InputObjectTypeExtensionNode,
): InputObjectTypeDefinitionNode {
  const typeName = current.name.value;

  return {
    ...current,
    kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
    fields: mergeFields<InputValueDefinitionNode>(
      typeName,
      current.fields,
      incoming.fields,
    ),
    directives: [...(current.directives ?? []), ...(incoming.directives ?? [])],
  };
}

/**
 * Merge enum type definition / extension into one enum type.
 * @param current - Existing enum type.
 * @param incoming - Enum type or extension from another module.
 * @returns A single EnumTypeDefinition.
 */
function mergeEnumTypes(
  current: EnumTypeDefinitionNode | EnumTypeExtensionNode,
  incoming: EnumTypeDefinitionNode | EnumTypeExtensionNode,
): EnumTypeDefinitionNode {
  const typeName = current.name.value;

  return {
    ...current,
    kind: Kind.ENUM_TYPE_DEFINITION,
    values: mergeFields<EnumValueDefinitionNode>(
      typeName,
      current.values,
      incoming.values,
    ),
    directives: [...(current.directives ?? []), ...(incoming.directives ?? [])],
  };
}

/**
 * Merge union type definition / extension into one union type.
 * @param current - Existing union type.
 * @param incoming - Union type or extension from another module.
 * @returns A single UnionTypeDefinition.
 */
function mergeUnionTypes(
  current: UnionTypeDefinitionNode | UnionTypeExtensionNode,
  incoming: UnionTypeDefinitionNode | UnionTypeExtensionNode,
): UnionTypeDefinitionNode {
  return {
    ...current,
    kind: Kind.UNION_TYPE_DEFINITION,
    types: mergeNamedTypes(current.types, incoming.types),
    directives: [...(current.directives ?? []), ...(incoming.directives ?? [])],
  };
}

/**
 * Merge two AST definitions that share a `namedKey`.
 * Scalars, directives, and schema definitions keep the first occurrence.
 * @param current - Definition already stored for the key.
 * @param incoming - Definition from another module.
 * @returns The merged definition.
 */
function mergeDefinitions(
  current: DefinitionNode,
  incoming: DefinitionNode,
): DefinitionNode {
  switch (incoming.kind) {
    case Kind.OBJECT_TYPE_DEFINITION:
    case Kind.OBJECT_TYPE_EXTENSION:
      return mergeObjectTypes(
        current as ObjectTypeDefinitionNode,
        incoming,
      );
    case Kind.INTERFACE_TYPE_DEFINITION:
    case Kind.INTERFACE_TYPE_EXTENSION:
      return mergeInterfaceTypes(
        current as InterfaceTypeDefinitionNode,
        incoming,
      );
    case Kind.INPUT_OBJECT_TYPE_DEFINITION:
    case Kind.INPUT_OBJECT_TYPE_EXTENSION:
      return mergeInputObjectTypes(
        current as InputObjectTypeDefinitionNode,
        incoming,
      );
    case Kind.ENUM_TYPE_DEFINITION:
    case Kind.ENUM_TYPE_EXTENSION:
      return mergeEnumTypes(
        current as EnumTypeDefinitionNode,
        incoming,
      );
    case Kind.UNION_TYPE_DEFINITION:
    case Kind.UNION_TYPE_EXTENSION:
      return mergeUnionTypes(
        current as UnionTypeDefinitionNode,
        incoming,
      );
    default:
      return current;
  }
}

/**
 * Merge GraphQL documents from independent modules into one SDL document.
 * Object / interface / input / enum / union types of the same name have
 * their fields combined. Duplicate field names throw.
 * @param documents - Parsed documents collected by `setSchema`.
 * @returns A single DocumentNode for `buildASTSchema`.
 */
export function mergeTypeDefs(documents: DocumentNode[]): DocumentNode {
  const definitions: DefinitionNode[] = [];
  const named = new Map<string, DefinitionNode>();

  for (const document of documents) {
    for (const definition of document.definitions) {
      const key = namedKey(definition);

      if (!key) {
        definitions.push(definition);
        continue;
      }

      const existing = named.get(key);

      if (!existing) {
        named.set(key, definition);
        continue;
      }

      named.set(key, mergeDefinitions(existing, definition));
    }
  }

  return {
    kind: Kind.DOCUMENT,
    definitions: [...definitions, ...named.values()],
  };
}
