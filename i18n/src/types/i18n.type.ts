/** Nested dictionary of strings or interpolator functions for one locale. */
export type LocaleMessages = Record<string, unknown>;

/** Messages grouped by locale code, e.g. `{ vi, en }`. */
export type LocaleDictionary = Record<string, LocaleMessages>;

/** Named values substituted into `{placeholder}` tokens. */
export type TranslateParams = Record<string, unknown>;
