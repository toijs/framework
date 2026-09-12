# @toijs/i18n

Message store for `@toijs/modular`. It does not depend on Vue, React, or Express: you keep messages here and pass **locale + key** when translating.

## Setup

```ts
import { Launcher } from "@toijs/modular";
import { I18nModule } from "@toijs/i18n";

void new Launcher().modules([I18nModule, /* ... */]).start();
```

You can also import `i18n` directly without the module if you do not need it on `launcher.metadata`.

## Store messages

```ts
import { i18n } from "@toijs/i18n";
import type { LocaleMessages } from "@toijs/i18n";

const vi = {
  auth: {
    login: {
      title: "Đăng nhập",
      welcome: "Xin chào {name}",
    },
  },
} satisfies LocaleMessages;

const en = {
  auth: {
    login: {
      title: "Sign in",
      welcome: "Hello {name}",
    },
  },
} satisfies LocaleMessages;

i18n.addMessage({ vi, en });
i18n.mergeMessages("vi", { common: { ok: "Xong" } });
```

`addMessage` / `mergeMessages` deep-merge nested objects. Later calls extend the same locale instead of replacing it.

## Translate

`locale` is always the last argument:

```ts
i18n.translate("auth.login.title", {}, "vi");
// "Đăng nhập"

i18n.translate("auth.login.welcome", { name: "An" }, "en");
// "Hello An"
```

Lookup order:

1. `messages[locale][key]`
2. `messages[fallbackLocale][key]` (default `"en"`)
3. the key string itself

```ts
i18n.setFallbackLocale("en");
i18n.getMessages("vi");
i18n.getMessages(); // all locales
```

A message value may be a function `(params) => string` instead of a template string.

## Callers own the locale

This package does not remember the active UI locale. Each runtime passes it in:

**Vue / React**

```ts
import { i18n } from "@toijs/i18n";

const locale = "vi"; // from props, store, or localStorage
const title = i18n.translate("auth.login.title", {}, locale);
```

**Express**

```ts
app.get("/hello", (req, res) => {
  const locale = String(req.headers["accept-language"] ?? "en").slice(0, 2);
  res.json({ message: i18n.translate("auth.login.title", {}, locale) });
});
```

## Constants

| Name | Value | Role |
|---|---|---|
| `METADATA_I18N` | `"metadata.i18n"` | Key on `launcher.metadata` |
| `DEFAULT_FALLBACK_LOCALE` | `"en"` | Initial `i18n.fallbackLocale` |
