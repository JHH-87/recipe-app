# Recipe App

A personal recipe manager built as a Progressive Web App (PWA). Works on desktop and mobile browsers, installs to your home screen, and works offline.

**Live app:** https://jhh-87.github.io/recipe-app/

---

## Features

- **Flow view** — visual timeline of every recipe stage with timings, long-task indicators (⏳ 1hr+, 🌙 overnight), and direct links to each stage
- **Shopping list** — all ingredients grouped by category, tap to check off, one-tap share to any app (Google Keep, Notes, etc.)
- **Mise en place** — what to prep before you start cooking, and what to do ahead
- **Cook view** — stage-by-stage tabs with per-stage countdown timers and bell sound; timers persist when switching between stages
- **Serves scaler** — adjusts all quantities proportionally
- **Recipe editor** — add and edit recipes directly in the app; changes persist in your browser
- **Sync** — export/import `recipes.json`; on Chrome/Edge desktop, connect directly to a file in your Google Drive or OneDrive synced folder
- **Offline** — fully cached after first load via service worker

---

## Using the app

### Reading a recipe

1. Tap a recipe from the list
2. The **Flow** tab opens by default — shows the full process at a glance
3. Tap any stage to jump directly to Mise en place or the Cook tab at that step
4. Use **+/−** in the header to scale serves

### Shopping

- Tap **Shopping** tab for a categorised ingredient list
- Tap the circle beside each item to check it off
- Tap **Share list** to send to Google Keep, Notes, or any app (on HTTPS/mobile); copies to clipboard on desktop

### Cooking

- **Mise en place** tab shows what to prep and what to do ahead
- **Cook** tab shows one stage at a time with an ingredient summary and method
- Tap stage tabs to move between steps — timers keep running when you switch
- Tap **▶ Start timer** on any timed stage; the bell sounds with a distinct pitch per stage and repeats for 30 seconds if not dismissed

### Adding a recipe

1. Tap **+ New recipe** at the bottom of the recipe list
2. Fill in title, serves, and stages
3. Use the phase toggle (**Prep** / **Cook**) on each stage
4. Type an ingredient and tab away — the category auto-fills; override or type a custom category (e.g. `freezer`)
5. Add a prep action to any ingredient (e.g. `finely dice`) — these appear in the Mise en place view
6. Tap **Add recipe** — it saves to your browser and appears in the list immediately

### Editing a recipe

Tap the **✏** icon on any recipe card in the list.

Changes save to your browser's local storage. To back up or share to another device, use Export (see Sync below).

---

## Sync across devices

### Chrome / Edge desktop (Google Drive or OneDrive)

1. Make sure Google Drive or OneDrive desktop sync is running and your folder is visible in File Explorer
2. Tap **⚙** (top right of recipe list) → **Open cloud file**
3. Navigate to your synced folder and select (or create) `recipes.json`
4. After adding or editing recipes, return to ⚙ → **Save to cloud file**
5. The cloud client syncs the file to your other devices

> **Known limitation:** the File System Access API used for this is only available in Chrome and Edge on desktop. On mobile or Firefox, use Import / Export instead (see below).

### Import / Export (all browsers)

- **⚙ → Export recipes.json** — downloads your full recipe collection
- **⚙ → Import recipes.json** — loads a previously exported file, replacing the current collection

To move recipes to a new device: export on the old device, transfer the file (email, Drive, etc.), import on the new device.

---

## Importing recipes from Google Slides

If you have recipes in a Google Slides deck (one recipe per slide, with title / ingredients / method text boxes):

1. Download the deck as `.pptx` (File → Download → Microsoft PowerPoint)
2. Run the extractor script (requires Python and `python-pptx`):

```bash
pip install python-pptx
python extractor/extract.py YourRecipes.pptx
```

> The extractor script is not yet in this repo — see [Future work](#future-work). For now, extraction was done manually during initial setup. The full extraction logic lives in `extractor/parser.js` and `extractor/Runner.gs` (Apps Script version).

3. The output is a `recipes.json` file — import it via ⚙ → Import

**Note:** colour-coded stage grouping in Slides is only preserved if the colours survive the `.pptx` export. Google Slides often exports all text as near-black regardless of in-app colour. Stages can be split manually in the editor after import.

---

## Development

### Local setup

Requires Node.js (for the dev server) or Python 3.

```bash
# Clone the repo
git clone https://github.com/JHH-87/recipe-app.git
cd recipe-app

# Install test dependencies
npm install

# Start local dev server (serves from the repo root)
npx serve . --listen 8080

# Or with Python
python3 -m http.server 8080
```

Open http://localhost:8080 in your browser.

> After changing any files, go to DevTools → Application → Service Workers → **Unregister**, then hard-reload (Ctrl+Shift+R). The service worker caches aggressively.

### Running tests

```bash
npx vitest run
```

Tests cover: JSON schema validation, ingredient categorisation, recipe parsing, data layer (scaling, slug generation), and all three view renderers (shopping, mise, cook).

### File structure

```
recipe-app/
├── index.html          — app shell, all CSS
├── main.js             — router, state, view orchestration
├── data.js             — pure data functions (scaling, querying)
├── storage.js          — File System Access API + import/export
├── sw.js               — service worker (cache-first, offline support)
├── manifest.json       — PWA manifest
├── data/
│   └── recipes.json    — base recipe collection (loaded on startup)
├── extractor/
│   └── categoriser.js  — ingredient → shopping category lookup
└── views/
    ├── flow.js         — process flow timeline view
    ├── shopping.js     — shopping list with category grouping
    ├── mise.js         — mise en place view
    ├── cook.js         — step-by-step cook view with timers
    └── editor.js       — recipe editor form + localStorage persistence
```

### Adding or editing recipes in the JSON directly

`data/recipes.json` is a JSON array. Each recipe follows this structure:

```json
{
  "title": "Recipe Name",
  "serves": 4,
  "notes": "Optional background note",
  "stages": [
    {
      "label": "Stage name",
      "phase": "prep",
      "timing": "2 hours",
      "ingredients": [
        { "item": "500g chicken thighs", "prep": "cut into chunks", "category": "meat" }
      ],
      "method": "What to do in this stage."
    }
  ]
}
```

- `phase` must be `"prep"` or `"cook"` — prep stages appear in Mise en place and Flow; cook stages appear in the Cook view
- `prep` on an ingredient is the mise en place action (e.g. `"finely dice"`) — leave `null` if none
- `category` can be any string; standard values are: `produce`, `meat`, `fish`, `dairy`, `fresh`, `dry-goods`, `store-cupboard`, `spices`, `bakery`, `freezer`, `other`
- `timing` is a free-text string; parseable durations (e.g. `"20 minutes"`, `"1 hour 30 minutes"`) automatically show a countdown timer in the Cook view

### Deploying updates

```bash
git add .
git commit -m "Description of changes"
git push origin main
```

GitHub Pages redeploys automatically within ~30 seconds. Bump `CACHE_VERSION` in `sw.js` (v4 → v5 etc.) whenever you change JS or HTML files — this forces existing users' service workers to fetch the new versions.

### Sharing a template version

The `template` branch contains a single example recipe (Dal Makhani) for sharing with others. Each person who uses it starts with that one recipe and builds their own collection independently in their browser.

```bash
# Update the template branch with latest app code but single example recipe
git checkout template
git merge main --no-commit
cp template_recipes.json data/recipes.json
git add data/recipes.json
git commit -m "Sync app code from main"
git push origin template
```

---

## Future work

Issues and planned features, roughly in priority order:

### Known bugs

| # | Issue | Notes |
|---|-------|-------|
| 1 | Cloud sync file doesn't appear in Google Drive on Android Chrome | File System Access API is not supported on Android Chrome — need a different sync mechanism for mobile. Likely fix: direct Google Drive API integration with OAuth, or share via export/import |
| 2 | Cloud file save doesn't update when using the website on laptop | Suspected cause: file handle permissions lapsing between sessions, or the Drive desktop client not detecting the write. Needs investigation — may require re-opening the file handle each session |

### Planned features

| # | Feature | Notes |
|---|---------|-------|
| 3 | Search / filter recipes | Filter by title keyword or category (meal, dessert, bread, etc.) — straightforward addition to the list view |
| 4 | Recipe categories | Top-level category field on recipes (e.g. `meal`, `dessert`, `bread`, `sauce`, `snack`) for grouping and filtering — needs schema change + editor field + list grouping |
| 5 | Import recipe from URL | Paste a URL, app fetches the page and extracts recipe structured data (`schema.org/Recipe` JSON-LD) — most major recipe sites publish this. Needs a proxy or server-side fetch due to CORS |

### Other ideas

- Dedicated extract-from-Slides script packaged as a proper CLI tool
- Meal planner / weekly view
- Ingredient quantity normalisation in the shopping list (merge `2 cloves garlic` + `3 cloves garlic` → `5 cloves garlic`)
- Print-friendly view
- Dark mode

---

## Tech notes

Built with vanilla JavaScript ES modules — no framework, no build step. Designed to be read and modified directly. Dependencies:

- **Vitest** — unit tests (`npm install` to get it)
- **AJV** — JSON schema validation in tests
- **Web Audio API** — timer bell sound, synthesised in-browser
- **File System Access API** — cloud file sync (Chrome/Edge desktop only)
- **Service Worker** — offline caching

No backend. No accounts. No tracking.
