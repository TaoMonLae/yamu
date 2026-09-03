# Yamu (ယၟု)

Yamu is a name index for Mon, Burmese, and English. Search in any of the three languages, compare spellings, choose a preferred variant, copy individual names, or download the selected result as a PNG.

The interface is available in Mon, Burmese, and English. Mon and Burmese text uses the bundled Z20 KhitHaungg font.

The default logo and favicon use the Yamu Mon mark in `public/yamu-logo.png` and `public/favicon.png`. An administrator can replace or remove either asset from Brand Settings.

## What Yamu can do

- Search Mon, Burmese, or English names with automatic script detection
- Build a full name from individual catalog entries while preserving word order
- Show multiple spelling and Romanization variants
- Copy any selected spelling or export a three-language PNG specimen
- Accept missing-word contributions with optional contributor credit
- Collect bug reports from every public page for admin triage
- Import `.csv`, `.xls`, and `.xlsx` files through the admin page
- Add, edit, delete, approve, reject, and export catalog records
- Customize the site name, tagline, accent color, header logo, and favicon
- Install Yamu as a PWA with platform icons and an offline connection screen
- Keep SQLite and `data/names.json` synchronized after catalog changes

## Requirements

- Node.js 22
- npm

## Run locally

Create the local environment file and install the dependencies:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open these pages:

- Search: <http://localhost:3002>
- About: <http://localhost:3002/about>
- Admin: <http://localhost:3002/admin>

The development admin password is `change-me`. Change it before sharing or deploying the app.

Service-worker registration is enabled only in production. After running `npm run build` and `npm start`, supported browsers can install Yamu from `localhost` or an HTTPS deployment. Public pages use network-first caching, while admin and API requests are never cached.

## Environment variables

```dotenv
ADMIN_PASSWORD=change-me
ADMIN_SESSION_SECRET=replace-with-a-long-random-string
PORT=3002
```

`DATA_DIR` is optional. When it is not set, Yamu stores its database and JSON catalog in the repository's `data` directory. Set it to a persistent writable directory in production.

When a new database is created, Yamu initializes it from the repository's portable `data/names.json` catalog. Set `INITIAL_CATALOG_PATH` only when that file lives somewhere else. If no portable catalog is available, Yamu falls back to the small sample seed.

## Admin workflow

The admin page can import a spreadsheet in append or replace mode. After upload, map the source columns to the Yamu fields and review the rows before committing them.

Each import needs these columns:

- `mon`
- `burmese`
- `english`

The optional `notes` column can hold source or editorial information. Add an optional `credit` column when an approved entry should name its contributor. Header aliases such as `mnw`, `myanmar`, `en`, `remarks`, and `contributor` are recognized automatically, and every column can be remapped in the browser.

Put alternate spellings in the same cell, separated by a comma, semicolon, pipe, or line break. The first spelling becomes the default.

A starter file is available at [\`public/templates/names-template.csv\`](public/templates/names-template.csv).

The admin page also supports:

- Branding settings with a live preview
- Header logo and browser favicon uploads
- Manual catalog entries
- Editing and deleting existing entries
- Undoing the most recent spreadsheet import
- Reviewing missing-word contributions, including any spellings the user already knows
- Publishing optional contributor credit with approved entries
- Resolving or dismissing private bug reports from the shared docket
- Downloading the catalog as JSON or CSV

## Data files

- SQLite database: `data/names.db`
- Portable catalog: `data/names.json`
- Branding settings: `data/branding.json`
- Uploaded brand assets: `data/branding/`

The JSON file is rewritten after an import, edit, deletion, manual addition, or approved contribution. Language values are stored as arrays so spelling variants remain explicit. Contributor credit is stored with the catalog row and appears on the public result and exported PNG only after approval. Bug reports remain in SQLite and are never published in the catalog JSON.

The SQLite database uses write-ahead logging. If you back up a running local instance, include the related `names.db-wal` and `names.db-shm` files or use a SQLite-aware backup method. Back up `branding.json` and the `branding` directory to preserve the customized site identity.

## Myanmar name source

The Burmese and English fallback records come from [TaoMonLae/Myanmar-Name\_en-2-mm](https://github.com/TaoMonLae/Myanmar-Name_en-2-mm), licensed under CC BY-NC-ND 4.0. Rows with the same Myanmar spelling are grouped so alternate English Romanizations remain selectable. Existing trilingual Yamu records take priority, and imported fallback records leave Mon blank until an administrator verifies the Mon equivalent.

To rebuild this batch from a downloaded copy of the source repository, run:

```bash
npm run import:myanmar-names -- /path/to/MyanmarName-en-mm.csv
```

The source license permits noncommercial use and does not permit distributing adapted material. Confirm that you have the necessary permission before publishing the derived catalog or using it commercially.

## Commands

```bash
npm run dev                    # Start the development server
npm run build                  # Create a production build
npm start                      # Start the production server
npm run lint                   # Run ESLint
npm run import:myanmar-names   # Import the fallback Myanmar name source
```

## Production deployment

The app builds as a standalone Next.js server and stores its catalog on disk. The included guide covers Node.js, PM2, nginx, TLS, persistent data, and backups on Ubuntu.

See [\`deploy/UBUNTU.md\`](deploy/UBUNTU.md) for the full deployment steps.

## License

Yamu's original software source code and documentation are available under the
[MIT License](LICENSE).

Catalog data, bundled fonts, photos, logos, favicons, and app icons are not
covered by the MIT License. Some catalog records use CC BY-NC-ND 4.0 and have
noncommercial and no-derivatives restrictions. Read
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) before redistributing the
project or using its data and assets commercially.
