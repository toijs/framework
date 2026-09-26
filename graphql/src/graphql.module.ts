import type { Module, Launcher } from "@toijs/modular";
import { GraphQLManager, graphqlManager } from "./graphql-manager";

/**
 * Register the shared GraphQLManager on the launcher DI container.
 * Features import `graphqlManager` to `setSchema` / `setResolvers` independently.
 * Inject via `@Injectable([GraphQLManager])` where `invoke` is called later.
 * @param launcher - App launcher receiving the GraphQL capability.
 * @returns Module named `toijs.graphql`.
 */
export function GraphQLModule(launcher: Launcher): Module {
  const name = "toijs.graphql";

  launcher.container.register({
    provide: GraphQLManager,
    useValue: graphqlManager,
  });

  return {
    name,
  };
}
