# Translating LibreDiary

Thank you for your interest in translating LibreDiary! Community translations help make the application accessible to users worldwide.

## Overview

LibreDiary uses [vue-i18n](https://vue-i18n.intlify.dev/) for internationalisation. All UI strings are stored in JSON locale files under `apps/web/src/locales/`. The master locale is **en-GB** (British English), which serves as the fallback for any missing translations.

## Supported Languages

| Code  | Language             | Native Name        | Status   |
| ----- | -------------------- | ------------------ | -------- |
| en-GB | English (UK)         | English (UK)       | Master   |
| en-US | English (US)         | English (US)       | Override |
| fr    | French               | Français           | Skeleton |
| es    | Spanish              | Español            | Skeleton |
| de    | German               | Deutsch            | Skeleton |
| it    | Italian              | Italiano           | Skeleton |
| pt-BR | Portuguese (Brazil)  | Português (Brasil) | Skeleton |
| ja    | Japanese             | 日本語             | Skeleton |
| zh-CN | Chinese (Simplified) | 简体中文           | Skeleton |
| ko    | Korean               | 한국어             | Skeleton |
| ar    | Arabic               | العربية            | Skeleton |
| hi    | Hindi                | हिन्दी             | Skeleton |
| ru    | Russian              | Русский            | Skeleton |
| nl    | Dutch                | Nederlands         | Skeleton |
| tr    | Turkish              | Türkçe             | Skeleton |
| pl    | Polish               | Polski             | Skeleton |
| sv    | Swedish              | Svenska            | Skeleton |

**Status legend:**

- **Master** — The source of truth; all keys are defined here
- **Override** — Only contains keys that differ from en-GB (e.g. "colour" vs "color")
- **Skeleton** — Empty file; needs community contributions

## Quick Start

1. Fork and clone the repository
2. Open the locale file you want to translate (e.g. `apps/web/src/locales/fr.json`)
3. Copy the structure from `en-GB.json` and translate the values
4. Test your translations locally
5. Submit a pull request

## File Structure

All locale files live in:

```
apps/web/src/locales/
├── en-GB.json    # Master locale (do not translate — this is the source)
├── en-US.json    # US English overrides only
├── fr.json       # French
├── de.json       # German
├── ...           # Other locales
```

Each file is a nested JSON object with namespaced keys:

```json
{
  "common": {
    "save": "Enregistrer",
    "cancel": "Annuler"
  },
  "auth": {
    "signIn": "Se connecter"
  }
}
```

## Namespace Reference

| Namespace        | Description                                   |
| ---------------- | --------------------------------------------- |
| `common`         | Shared UI labels (Save, Cancel, Delete, etc.) |
| `nav`            | Navigation items                              |
| `sidebar`        | Sidebar-specific text                         |
| `header`         | Page header elements                          |
| `auth`           | Authentication (login, register, password)    |
| `setup`          | Initial setup wizard                          |
| `settings`       | User and organisation settings                |
| `notifications`  | Notification preferences and messages         |
| `pages`          | Page management                               |
| `databases`      | Database features (views, filters, sorts)     |
| `editor`         | Block editor                                  |
| `comments`       | Comment system                                |
| `share`          | Sharing and permissions                       |
| `admin`          | Admin panel                                   |
| `trash`          | Trash management                              |
| `search`         | Search functionality                          |
| `templates`      | Template library                              |
| `backups`        | Backup management                             |
| `webhooks`       | Webhook configuration                         |
| `apiTokens`      | API token management                          |
| `language`       | Language switcher                             |
| `errors`         | Error messages                                |
| `time`           | Relative time labels                          |
| `dashboard`      | Dashboard/home page                           |
| `invites`        | Invitation management                         |
| `versionHistory` | Page version history                          |
| `mentions`       | User mentions                                 |
| `emoji`          | Emoji picker                                  |
| `organisation`   | Organisation management                       |
| `devices`        | Device/browser names                          |
| `contextMenu`    | Right-click context menu                      |
| `homePage`       | Public home page                              |
| `publicPage`     | Public shared pages                           |

## Translation Rules

### Interpolation

Vue-i18n uses `{variable}` syntax for dynamic values. Keep these placeholders unchanged:

```json
{
  "auth": {
    "joinOrganisation": "Rejoindre {organisationName}"
  }
}
```

### Special Characters

Some strings use `{'@'}` to escape the `@` symbol. Keep this syntax:

```json
{
  "auth": {
    "emailPlaceholder": "vous{'@'}example.com"
  }
}
```

### Plural Forms

Vue-i18n uses pipe-separated plural forms: `singular | plural`

```json
{
  "comments": {
    "comment": "commentaire | commentaires"
  }
}
```

### Do NOT Translate

- Brand names: `LibreDiary`, `GitHub`, `Google`
- Technical terms that are universally understood in context
- Interpolation placeholders (`{name}`, `{count}`, etc.)
- HTML entities or special syntax (`{'@'}`)

## Testing Locally

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start the development server:

   ```bash
   pnpm --filter web dev
   ```

3. Use the language switcher (globe icon in the sidebar) to switch to your locale

4. Verify your translations appear correctly in the UI

5. Run the test suite to ensure nothing is broken:
   ```bash
   pnpm --filter web test
   ```

## Checking Translation Progress

Admin users can view the translation status page at `/admin/translations`. This page shows:

- Progress percentage for each locale
- Number of translated vs total keys
- Missing key details (expandable per locale)
- Download option for each locale file

## Adding a New Language

If you want to add a language that is not yet listed:

1. Create a new locale file: `apps/web/src/locales/{code}.json` (use [BCP 47](https://www.ietf.org/rfc/bcp/bcp47.txt) language tags)
2. Add the locale to `SUPPORTED_LOCALES` in `apps/web/src/i18n/index.ts` with:
   - `name`: English name of the language
   - `nativeName`: The language's name in its own script
   - `dir`: `'ltr'` or `'rtl'`
3. Add the dynamic import entry to `localeImports` in the same file
4. Submit a pull request with the new locale

## Tips for Translators

- **Consistency** — Use consistent terminology throughout. If you translate "page" as "Seite" in German, use it everywhere.
- **Context** — When unsure about context, check the running application or look at where the key is used in the Vue components.
- **Length** — Some UI elements have limited space. Try to keep translations reasonably close in length to the English originals.
- **Formality** — Match the tone of the English source. LibreDiary uses a friendly but professional tone.
- **Partial contributions welcome** — You don't have to translate everything in one go. Even a few namespaces are helpful!

## Questions?

If you have questions about translations or need context for specific strings, please [open an issue](https://github.com/LibreDiary/LibreDiary/issues) with the `i18n` label.

---

Developed by [Akaal Creatives](https://www.akaalcreatives.com)
