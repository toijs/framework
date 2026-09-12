import { DEFAULT_FALLBACK_LOCALE } from "../constants";
import type { LocaleMessages, TranslateParams } from "../types";
import { getNested, interpolate, mergeDeep } from "../utils";

class I18nService {
  /** Locale used when the requested locale does not contain the key. */
  fallbackLocale = DEFAULT_FALLBACK_LOCALE;

  /** Message dictionaries keyed by locale code. */
  readonly messages: Record<string, LocaleMessages> = {};

  /**
   * Merge several locale dictionaries into the store.
   * @param msgs - Map of locale code to nested messages, e.g. `{ vi, en }`
   */
  addMessage(msgs: Record<string, LocaleMessages>) {
    for (const locale of Object.keys(msgs)) {
      this.mergeMessages(locale, msgs[locale]);
    }
  }

  /**
   * Merge messages into one locale, creating it if needed.
   * @param locale - Locale code such as `vi` or `en`
   * @param msgs - Nested messages to merge
   */
  mergeMessages(locale: string, msgs: LocaleMessages) {
    if (!this.messages[locale]) {
      this.messages[locale] = {};
    }

    this.messages[locale] = mergeDeep(this.messages[locale], msgs);
  }

  /**
   * Return messages for one locale, or the full dictionary when omitted.
   * @param locale - Optional locale code
   */
  getMessages(locale?: string) {
    if (locale) {
      return this.messages[locale] ?? {};
    }

    return this.messages;
  }

  /**
   * Set the locale used when a key is missing from the requested locale.
   * @param locale - Fallback locale code
   */
  setFallbackLocale(locale: string) {
    this.fallbackLocale = locale;
  }

  /**
   * Resolve a dotted key to a string for the given locale.
   * Falls back to `fallbackLocale`, then to the key itself.
   * @param key - Dot path such as `auth.login.title`
   * @param params - Values for `{name}` placeholders
   * @param locale - Locale to read from
   */
  translate(key: string, params: TranslateParams = {}, locale: string) {
    let entry = getNested(this.messages[locale], key);

    if (entry === undefined && locale !== this.fallbackLocale) {
      entry = getNested(this.messages[this.fallbackLocale], key);
    }

    if (entry === undefined) {
      return interpolate(key, params);
    }

    if (typeof entry === "function") {
      try {
        return entry(params);
      } catch (error) {
        console.warn("i18n function error for key", key, error);
        return "";
      }
    }

    return interpolate(entry, params);
  }
}

/** Shared message store. Register via `I18nModule` or import directly. */
export const i18n = new I18nService();
