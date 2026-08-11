/**
 * Metadata key for injectable class deps (set by @Injectable)
 */
export const META_INJECTABLE = Symbol.for("lamtoi.di.injectable");

/**
 * Metadata key for constructor param tokens (set by @Inject)
 */
export const META_INJECT = Symbol.for("lamtoi.di.inject");

/**
 * Metadata key for optional constructor params (set by @Optional)
 */
export const META_OPTIONAL = Symbol.for("lamtoi.di.optional");

/**
 * Provider scope: one instance per container
 */
export const SCOPE_SINGLETON = "singleton" as const;

/**
 * Provider scope: new instance on every resolve
 */
export const SCOPE_TRANSIENT = "transient" as const;
