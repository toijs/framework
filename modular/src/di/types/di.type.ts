import type { SCOPE_SINGLETON, SCOPE_TRANSIENT } from "../constants";

/**
 * A constructable class
 */
export type Constructor<T = unknown> = new (...args: any[]) => T;

/**
 * An abstract constructable (usable as injection token)
 */
export type AbstractConstructor<T = unknown> = abstract new (...args: any[]) => T;

/**
 * Token used to register and resolve a dependency
 */
export type InjectionToken<T = unknown> =
  | string
  | symbol
  | Constructor<T>
  | AbstractConstructor<T>;

/**
 * Lifetime of a resolved instance
 */
export type ProviderScope = typeof SCOPE_SINGLETON | typeof SCOPE_TRANSIENT;

/**
 * Register a class as its own token
 */
export type ClassProvider<T = unknown> = Constructor<T>;

/**
 * Explicit class provider with optional inject list and scope
 */
export type UseClassProvider<T = unknown> = {
  provide: InjectionToken<T>;
  useClass: Constructor<T>;
  inject?: InjectionToken[];
  scope?: ProviderScope;
};

/**
 * Constant value provider
 */
export type UseValueProvider<T = unknown> = {
  provide: InjectionToken<T>;
  useValue: T;
};

/**
 * Factory provider
 */
export type UseFactoryProvider<T = unknown> = {
  provide: InjectionToken<T>;
  useFactory: (...args: any[]) => T;
  inject?: InjectionToken[];
  scope?: ProviderScope;
};

/**
 * Alias an existing token
 */
export type UseExistingProvider<T = unknown> = {
  provide: InjectionToken<T>;
  useExisting: InjectionToken<T>;
};

/**
 * Any supported provider definition
 */
export type Provider<T = unknown> =
  | ClassProvider<T>
  | UseClassProvider<T>
  | UseValueProvider<T>
  | UseFactoryProvider<T>
  | UseExistingProvider<T>;

/**
 * Normalized internal provider record
 */
export type ProviderRecord = {
  token: InjectionToken;
  scope: ProviderScope;
} & (
  | { kind: "class"; useClass: Constructor; inject: InjectionToken[] }
  | { kind: "value"; useValue: unknown }
  | { kind: "factory"; useFactory: (...args: any[]) => unknown; inject: InjectionToken[] }
  | { kind: "existing"; useExisting: InjectionToken }
);

/**
 * Metadata stored on an @Injectable class
 */
export type InjectableMetadata = {
  inject: InjectionToken[];
};
