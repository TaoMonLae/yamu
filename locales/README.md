# Translating YAMU

YAMU keeps public interface copy in standard Gettext PO files:

- `en.po` — English source catalog
- `mnw.po` — Mon
- `my.po` — Burmese

Each `msgid` is the English phrase shown in the interface. Add or edit its `msgstr` in the language file you want to improve. Keep placeholders such as `{name}`, `{query}`, and `{count}` unchanged so YAMU can insert the live value.

When English copy gains new entries, synchronize blank translation slots into both language files:

```bash
npm run i18n:sync
```

After editing a catalog, run:

```bash
npm run i18n:compile
```

`npm run dev` and `npm run build` compile the catalogs automatically. An empty translation safely uses the English source phrase.
