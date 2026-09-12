import type { LocaleMessages } from "../types";

/**
 * Deep-merge `source` into `target`. Nested plain objects are merged;
 * arrays, functions and primitives overwrite.
 */
export function mergeDeep(
  target: LocaleMessages = {},
  source: LocaleMessages = {},
): LocaleMessages {
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target[key];

    if (
      srcVal &&
      typeof srcVal === "object" &&
      !Array.isArray(srcVal) &&
      !(srcVal instanceof Function)
    ) {
      target[key] = mergeDeep(
        tgtVal && typeof tgtVal === "object" && !Array.isArray(tgtVal)
          ? (tgtVal as LocaleMessages)
          : {},
        srcVal as LocaleMessages,
      );
    } else {
      target[key] = srcVal;
    }
  }

  return target;
}

/**
 * Read a dotted path from a nested object (`auth.login.title`).
 * Returns `undefined` when any segment is missing.
 */
export function getNested(obj: unknown, path: string): unknown {
  if (!obj || !path) return undefined;

  const parts = path.split(".").filter(Boolean);
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Replace `{name}` tokens in a string with values from `params`.
 * Unknown tokens are left as-is.
 */
export function interpolate(
  value: unknown,
  params: Record<string, unknown> = {},
): string {
  return String(value).replace(/\{(\w+)\}/g, (_, key: string) => {
    if (params[key] === undefined) return `{${key}}`;
    return String(params[key]);
  });
}
