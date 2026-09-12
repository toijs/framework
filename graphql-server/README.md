# @toijs/graphql

GraphQL registry for `@toijs/modular`. Feature modules register SDL and resolvers independently; one shared `invoke` executes operations from the client against the merged schema.

This package does **not** serve HTTP or WebSocket. Wire `invoke` in a controller, route, or kit when you are ready.

## Setup

```ts
import { Launcher } from "@toijs/modular";
import { GraphQLModule } from "@toijs/graphql";

void new Launcher()
  .modules([GraphQLModule, /* features */])
  .start();
```

`GraphQLModule` registers the singleton `graphqlManager` in the DI container (`GraphQLManager`). Features can also import `graphqlManager` directly.

Register schema and resolvers in the **module factory body**, the same way `@toijs/typeorm` registers entities — before any request calls `invoke`.

## Register schema and resolvers

Each feature owns its slice of the graph. Types with the same name are merged by field. Duplicate field names throw.

```ts
import type { Module, Launcher } from "@toijs/modular";
import { graphqlManager } from "@toijs/graphql";

export function AuthModule(launcher: Launcher): Module {
  graphqlManager.setSchema(`
    type User {
      id: ID!
      name: String!
    }

    input CreateUserInput {
      name: String!
    }

    type Query {
      user(id: ID!): User
    }

    type Mutation {
      createUser(input: CreateUserInput!): User!
      deleteUser(id: ID!): Boolean!
    }

    type Subscription {
      userCreated: User!
    }
  `);

  graphqlManager.setResolvers({
    Query: {
      user: (_source, args: { id: string }, context) =>
        userService.find(args.id),
    },
    Mutation: {
      createUser: (_source, args: { input: { name: string } }) =>
        userService.create(args.input),
      deleteUser: (_source, args: { id: string }) =>
        userService.delete(args.id),
    },
    Subscription: {
      userCreated: {
        subscribe: () => userService.onCreated(),
        resolve: (payload) => payload,
      },
    },
  });

  return { name: "feature.auth" };
}
```

`setSchema` accepts an SDL string, a `DocumentNode`, or an array of either. `setResolvers` accepts one resolver map (`Query`, `Mutation`, `Subscription`, nested types such as `User: { posts: … }`) or an array of maps.

A Subscription field may be `{ subscribe, resolve? }` or a function used as `subscribe`. If `resolve` is omitted, the event payload is the field result.

## Invoke

Call `invoke` from a single place (HTTP handler, later). Pass the client body and an optional context object — that value is the `context` argument of every resolver.

```ts
import { graphqlManager } from "@toijs/graphql";
import type { GraphQLRequest } from "@toijs/graphql";

const result = await graphqlManager.invoke(
  {
    query: body.query,
    variables: body.variables,
    operationName: body.operationName,
  } satisfies GraphQLRequest,
  { user: req.user },
);
```

A query string is also accepted: `graphqlManager.invoke("{ user(id: \"1\") { name } }")`.

| Operation | Result |
| --- | --- |
| Query / Mutation | `{ data, errors }` (`ExecutionResult`) |
| Subscription | `AsyncIterable<ExecutionResult>` |

```ts
const result = await graphqlManager.invoke(request, context);

if (Symbol.asyncIterator in Object(result)) {
  for await (const event of result) {
    // subscription event
  }
} else {
  // query / mutation result
}
```

Validation and parse errors are returned as `errors`, not thrown. Missing SDL throws from `getSchema()` (`Call setSchema first.`).

## Dependency injection

```ts
import { Injectable } from "@toijs/modular";
import { GraphQLManager } from "@toijs/graphql";

@Injectable([GraphQLManager])
export class GraphqlController {
  constructor(private readonly graphql: GraphQLManager) {}

  handle(body: { query: string }) {
    return this.graphql.invoke(body);
  }
}
```

## API

| Export | Role |
| --- | --- |
| `graphqlManager` | Process-wide `GraphQLManager` singleton |
| `GraphQLManager` | Class / DI token |
| `GraphQLModule` | Module factory; name `toijs.graphql` |
| `setSchema(typeDefs)` | Register SDL; merge types by field |
| `setResolvers(map | map[])` | Register Query / Mutation / Subscription / type resolvers |
| `invoke(request, context?)` | Execute an operation from the client |
| `getSchema()` | Merged executable `GraphQLSchema` (cached) |

## Merge rules

- Object, interface, input, enum, and union types of the same name combine their fields / values / members.
- A second `Query.user` (or any `Type.field`) from another module throws.
- GraphQL requires a `Query` type. If only Mutation or Subscription is registered, a dummy `Query._empty` is added.

## What this package is not

- Not an HTTP server, GraphiQL, or Apollo Server.
- Not a pub/sub implementation — `subscribe` must return an `AsyncIterable`.
- Not request-scoped; one manager per process, context per `invoke`.
