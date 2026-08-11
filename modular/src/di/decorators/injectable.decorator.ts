import { META_INJECT, META_INJECTABLE, META_OPTIONAL } from "../constants";
import type { Constructor, InjectableMetadata, InjectionToken } from "../types";

type MetaTarget = object & {
  [META_INJECTABLE]?: InjectableMetadata;
  [META_INJECT]?: InjectionToken[];
  [META_OPTIONAL]?: Set<number>;
};

/**
 * Mark a class as injectable and optionally declare constructor tokens.
 * Prefer explicit `inject` when not using emitDecoratorMetadata.
 *
 * @example
 * ```ts
 * @Injectable([LoggerService, CONFIG])
 * class UserService {
 *   constructor(logger: LoggerService, config: Config) {}
 * }
 * ```
 */
export function Injectable(inject: InjectionToken[] = []): ClassDecorator {
  return (target) => {
    const ctor = target as unknown as MetaTarget;
    ctor[META_INJECTABLE] = { inject: [...inject] };
  };
}

/**
 * Bind a constructor parameter to an injection token (string/symbol/class).
 */
export function Inject(token: InjectionToken): ParameterDecorator {
  return (target, _propertyKey, parameterIndex) => {
    const ctor = (
      typeof target === "function" ? target : (target as object).constructor
    ) as MetaTarget;

    const inject = ctor[META_INJECT] ? [...ctor[META_INJECT]] : [];
    inject[parameterIndex] = token;
    ctor[META_INJECT] = inject;
  };
}

/**
 * Allow a constructor dependency to resolve as `undefined` when missing.
 */
export function Optional(): ParameterDecorator {
  return (target, _propertyKey, parameterIndex) => {
    const ctor = (
      typeof target === "function" ? target : (target as object).constructor
    ) as MetaTarget;

    const optional = ctor[META_OPTIONAL] ?? new Set<number>();
    optional.add(parameterIndex);
    ctor[META_OPTIONAL] = optional;
  };
}

/**
 * Read injectable metadata from a class
 */
export function getInjectableMetadata(
  target: Constructor,
): InjectableMetadata | undefined {
  return (target as MetaTarget)[META_INJECTABLE];
}

/**
 * Read per-parameter inject tokens from a class
 */
export function getInjectMetadata(target: Constructor): InjectionToken[] {
  return (target as MetaTarget)[META_INJECT] ?? [];
}

/**
 * Read which constructor params are optional
 */
export function getOptionalMetadata(target: Constructor): Set<number> {
  return (target as MetaTarget)[META_OPTIONAL] ?? new Set();
}

/**
 * Merge decorator inject lists into a single ordered token list
 */
export function resolveInjectTokens(
  target: Constructor,
  explicit?: InjectionToken[],
): InjectionToken[] {
  if (explicit && explicit.length > 0) {
    return explicit;
  }

  const fromInjectable = getInjectableMetadata(target)?.inject ?? [];
  const fromInject = getInjectMetadata(target);

  if (fromInject.length === 0) {
    return fromInjectable;
  }

  const length = Math.max(fromInjectable.length, fromInject.length);
  const tokens: InjectionToken[] = [];

  for (let i = 0; i < length; i++) {
    const token = fromInject[i] ?? fromInjectable[i];
    if (token !== undefined) {
      tokens[i] = token;
    }
  }

  return tokens;
}
