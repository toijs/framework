import { SCOPE_SINGLETON, SCOPE_TRANSIENT } from "../constants";
import { getOptionalMetadata, resolveInjectTokens } from "../decorators";
import type {
  Constructor,
  InjectionToken,
  Provider,
  ProviderRecord,
  ProviderScope,
  UseClassProvider,
  UseExistingProvider,
  UseFactoryProvider,
  UseValueProvider,
} from "../types";

/**
 * Lightweight dependency injection container.
 */
export class Container {
  private readonly providers = new Map<InjectionToken, ProviderRecord>();
  private readonly instances = new Map<InjectionToken, unknown>();
  private readonly resolving = new Set<InjectionToken>();
  private readonly parent: Container | null;

  constructor(parent: Container | null = null) {
    this.parent = parent;
  }

  /**
   * Register one or more providers
   * @param providers - Class or provider definition(s)
   */
  register(providers: Provider | Provider[]): this {
    const list = Array.isArray(providers) ? providers : [providers];

    for (const provider of list) {
      const record = this.normalize(provider);
      this.providers.set(record.token, record);
      this.instances.delete(record.token);
    }

    return this;
  }

  /**
   * Resolve an instance for a token
   * @param token - Injection token
   * @returns The resolved instance
   */
  resolve<T>(token: InjectionToken<T>): T {
    return this.resolveInternal(token, false) as T;
  }

  /**
   * Resolve an instance, or `undefined` if the token is not registered
   * @param token - Injection token
   */
  tryResolve<T>(token: InjectionToken<T>): T | undefined {
    return this.resolveInternal(token, true) as T | undefined;
  }

  /**
   * Whether this container (or a parent) can resolve the token
   * @param token - Injection token
   */
  has(token: InjectionToken): boolean {
    if (this.providers.has(token) || this.instances.has(token)) {
      return true;
    }

    return this.parent?.has(token) ?? false;
  }

  /**
   * Create a child container that inherits parent providers
   */
  createChild(): Container {
    return new Container(this);
  }

  /**
   * Clear local providers and cached singleton instances
   */
  clear(): void {
    this.providers.clear();
    this.instances.clear();
    this.resolving.clear();
  }

  private resolveInternal(token: InjectionToken, optional: boolean): unknown {
    if (this.instances.has(token)) {
      return this.instances.get(token);
    }

    const record = this.providers.get(token);

    if (!record) {
      if (this.parent?.has(token)) {
        return this.parent.resolveInternal(token, optional);
      }

      if (optional) {
        return undefined;
      }

      throw new Error(`DI: no provider for token ${this.tokenName(token)}`);
    }

    if (this.resolving.has(token)) {
      const chain = [...this.resolving, token].map((t) => this.tokenName(t)).join(" -> ");
      throw new Error(`DI: circular dependency detected: ${chain}`);
    }

    this.resolving.add(token);

    try {
      const instance = this.create(record);

      if (record.scope === SCOPE_SINGLETON) {
        this.instances.set(token, instance);
      }

      return instance;
    } finally {
      this.resolving.delete(token);
    }
  }

  private create(record: ProviderRecord): unknown {
    switch (record.kind) {
      case "value":
        return record.useValue;

      case "existing":
        return this.resolveInternal(record.useExisting, false);

      case "factory": {
        const deps = this.resolveDeps(record.inject);
        return record.useFactory(...deps);
      }

      case "class": {
        const deps = this.resolveClassDeps(record.useClass, record.inject);
        return new record.useClass(...deps);
      }
    }
  }

  private resolveDeps(tokens: InjectionToken[]): unknown[] {
    return tokens.map((token) => this.resolveInternal(token, false));
  }

  private resolveClassDeps(
    useClass: Constructor,
    inject: InjectionToken[],
  ): unknown[] {
    const optional = getOptionalMetadata(useClass);

    return inject.map((token, index) =>
      this.resolveInternal(token, optional.has(index)),
    );
  }

  private normalize(provider: Provider): ProviderRecord {
    if (typeof provider === "function") {
      return {
        kind: "class",
        token: provider,
        useClass: provider,
        inject: resolveInjectTokens(provider),
        scope: SCOPE_SINGLETON,
      };
    }

    if (this.isValueProvider(provider)) {
      return {
        kind: "value",
        token: provider.provide,
        useValue: provider.useValue,
        scope: SCOPE_SINGLETON,
      };
    }

    if (this.isExistingProvider(provider)) {
      return {
        kind: "existing",
        token: provider.provide,
        useExisting: provider.useExisting,
        scope: SCOPE_SINGLETON,
      };
    }

    if (this.isFactoryProvider(provider)) {
      return {
        kind: "factory",
        token: provider.provide,
        useFactory: provider.useFactory,
        inject: provider.inject ?? [],
        scope: this.normalizeScope(provider.scope),
      };
    }

    if (this.isClassProvider(provider)) {
      return {
        kind: "class",
        token: provider.provide,
        useClass: provider.useClass,
        inject: resolveInjectTokens(provider.useClass, provider.inject),
        scope: this.normalizeScope(provider.scope),
      };
    }

    throw new Error("DI: invalid provider definition");
  }

  private normalizeScope(scope?: ProviderScope): ProviderScope {
    return scope === SCOPE_TRANSIENT ? SCOPE_TRANSIENT : SCOPE_SINGLETON;
  }

  private isValueProvider(provider: object): provider is UseValueProvider {
    return "useValue" in provider;
  }

  private isExistingProvider(provider: object): provider is UseExistingProvider {
    return "useExisting" in provider;
  }

  private isFactoryProvider(provider: object): provider is UseFactoryProvider {
    return "useFactory" in provider;
  }

  private isClassProvider(provider: object): provider is UseClassProvider {
    return "useClass" in provider;
  }

  private tokenName(token: InjectionToken): string {
    if (typeof token === "string") return `"${token}"`;
    if (typeof token === "symbol") return token.description ? `Symbol(${token.description})` : token.toString();
    return token.name || "AnonymousClass";
  }
}
