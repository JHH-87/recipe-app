# End-to-End Test Checklist

Run the local server first:
```
./run-local.sh
```
Then open http://localhost:8080 in a browser. Work through each section in order.
Mark each item ✓ pass / ✗ fail / — not applicable.

---

## E2E-1: App shell and loading

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1.1 | Open http://localhost:8080 | Recipe list loads; shows 3 recipes | |
| 1.2 | Check browser console | No errors on load | |
| 1.3 | Open DevTools → Application → Service Workers | SW registered, status "activated" | |
| 1.4 | Reload page with DevTools Network tab, throttle to Offline | App still loads from cache | |
| 1.5 | Check browser title | Shows "Recipes" | |

---

## E2E-2: Recipe list

| # | Test | Expected | Result |
|---|------|----------|--------|
| 2.1 | List shows all 3 recipes | Aglio e Olio, Chicken Tikka Masala, Focaccia | |
| 2.2 | Each card shows serves count | e.g. "Serves 2" | |
| 2.3 | Each card has an edit (✏) button | Small icon to the right of each card | |
| 2.4 | "+ New recipe" button visible at bottom of list | | |
| 2.5 | Tap a recipe card | Navigates to recipe detail | |
| 2.6 | Browser back button | Returns to list | |

---

## E2E-3: Shopping view

| # | Test | Expected | Result |
|---|------|----------|--------|
| 3.1 | Open Chicken Tikka Masala | Shopping tab active by default | |
| 3.2 | All ingredients visible | 14–16 items across all stages | |
| 3.3 | Ingredients grouped by category | Section headings: Meat, Dairy, etc. | |
| 3.4 | Tap a check circle | Item strikes through; circle fills | |
| 3.5 | Tap again | Item un-checks | |
| 3.6 | "Share list" button visible | Above ingredient sections | |
| 3.7 | Tap "Share list" (desktop) | "Copied!" feedback appears briefly | |
| 3.8 | Increase serves to 8 | All numeric quantities double | |
| 3.9 | "800g boneless chicken thighs" at serves 8 | Shows "1600g boneless chicken thighs" | |
| 3.10 | "Salt to taste" at any serves | Unchanged | |

---

## E2E-4: Mise en place view

| # | Test | Expected | Result |
|---|------|----------|--------|
| 4.1 | Tap "Mise en place" tab on Chicken Tikka Masala | Mise view renders | |
| 4.2 | "Things to prep" section visible | Lists ingredients with prep actions | |
| 4.3 | "800g boneless chicken thighs" shows "cut into 4cm chunks" | | |
| 4.4 | "Do ahead" section visible | Shows Marinade stage with timing | |
| 4.5 | Marinade shows "at least 4 hours" timing | | |
| 4.6 | Cook-phase stages not in do-ahead | Base aromatics, Sauce, Combine absent | |
| 4.7 | Open Aglio e Olio → Mise tab | "No mise en place" empty state | |

---

## E2E-5: Cook view

| # | Test | Expected | Result |
|---|------|----------|--------|
| 5.1 | Tap "Cook" tab on Chicken Tikka Masala | Step 1 of 3 shown (Base aromatics) | |
| 5.2 | Step shows correct ingredients | 2 onions, 3 cloves garlic, etc. | |
| 5.3 | Prep-phase Marinade stage not shown | Cook view skips it | |
| 5.4 | Step counter reads "1 / 3" | | |
| 5.5 | "Prev" button disabled on step 1 | | |
| 5.6 | Tap "Next" | Step 2 (Sauce) shown | |
| 5.7 | "Next" tap again | Step 3 (Combine) shown | |
| 5.8 | "Next" disabled on last step | | |
| 5.9 | "Prev" works | Steps backwards correctly | |
| 5.10 | Timer button visible on Base aromatics (15 minutes) | | |
| 5.11 | Tap timer "Start" | Countdown begins from 15:00, button changes | |
| 5.12 | Tap "✕" stop button | Timer resets, start button returns | |
| 5.13 | Navigate to next step while timer running | Timer clears; new step has its own timer | |
| 5.14 | Open Focaccia → Cook | Bake stage shows (no ingredients "For this step") | |

---

## E2E-6: Serves scaling cross-view

| # | Test | Expected | Result |
|---|------|----------|--------|
| 6.1 | Open Focaccia, increase to serves 16 | Quantities double | |
| 6.2 | "500g strong white bread flour" at 16 | Shows "1000g strong white bread flour" | |
| 6.3 | Switch from Shopping to Cook on same recipe at serves 16 | Serves count preserved in header | |
| 6.4 | Switch to Mise | Serves count still shows 16 | |
| 6.5 | Use back button and re-enter recipe | Serves resets to base (8) | |

---

## E2E-7: Editor — new recipe

| # | Test | Expected | Result |
|---|------|----------|--------|
| 7.1 | Tap "+ New recipe" | Editor loads with empty form | |
| 7.2 | Tap "Add recipe" with empty form | Validation errors appear inline | |
| 7.3 | Error messages list: title, serves, stage method | At least these 3 | |
| 7.4 | Fill in title "Test Soup" | | |
| 7.5 | Set serves to 2 | | |
| 7.6 | Fill stage label "Base" | | |
| 7.7 | Add ingredient "2 onions" → tab out of field | Category auto-sets to "produce" | |
| 7.8 | Fill prep "finely dice" | | |
| 7.9 | Fill method "Fry onions until soft." | | |
| 7.10 | Tap "+ Add stage" | Second stage appears; form state preserved | |
| 7.11 | Fill second stage: label "Simmer", method "Add stock and simmer 20 min." | | |
| 7.12 | Toggle second stage phase to "Prep" | Button highlights; back to "Cook" | |
| 7.13 | Tap "Add recipe" | Saves; navigates to Test Soup detail view | |
| 7.14 | Test Soup appears in shopping, mise, cook views | All three tabs work | |
| 7.15 | Back to list | Test Soup appears in list | |

---

## E2E-8: Editor — edit existing

| # | Test | Expected | Result |
|---|------|----------|--------|
| 8.1 | Tap ✏ on Aglio e Olio | Editor loads with existing values | |
| 8.2 | Title field shows "Spaghetti Aglio e Olio" | | |
| 8.3 | Serves shows "2" | | |
| 8.4 | Stage labels, ingredients, methods populated | | |
| 8.5 | Change serves to 4 | | |
| 8.6 | Tap "Save changes" | Saves; navigates to detail view | |
| 8.7 | Shopping view shows updated serves 4 | | |
| 8.8 | Reload page | Edit persists (from localStorage) | |

---

## E2E-9: Export JSON

| # | Test | Expected | Result |
|---|------|----------|--------|
| 9.1 | Open editor for any recipe | | |
| 9.2 | Tap "Export JSON" | Browser downloads a .json file | |
| 9.3 | Open downloaded file | Valid JSON matching recipe schema | |

---

## E2E-10: Mobile viewport

Resize browser to 390×844 (iPhone 14 viewport) or use actual device.

| # | Test | Expected | Result |
|---|------|----------|--------|
| 10.1 | Recipe list | Cards full-width, readable | |
| 10.2 | Mode tabs | All three labels visible without overflow | |
| 10.3 | Shopping list ingredients | Large enough tap targets (≥44px height) | |
| 10.4 | Cook view method text | Readable without horizontal scroll | |
| 10.5 | Editor form | Inputs full-width; keyboard doesn't obscure active field | |
| 10.6 | "Share list" on mobile browser (HTTPS only) | Share sheet appears with Keep as option | |

---

## Known limitations to note during testing

- **Web Share / Keep integration** requires HTTPS. On localhost, clipboard fallback fires instead.
- **Check-off state** resets on tab switch or navigation — ephemeral by design.
- **localStorage** is per-browser. Recipes created on mobile won't appear on desktop.
- **Prep fields** in example recipes are populated for Tikka Masala only — Aglio e Olio and Focaccia will show "No mise en place" until edited.

---

## Failure triage

If something doesn't work, check in order:
1. Browser console for JS errors (most failures surface here)
2. Network tab — is `recipes.json` loading? (404 means the data file isn't in `app/data/`)
3. Is `app/extractor/categoriser.js` present? (editor will break if missing)
4. Hard-reload (Ctrl+Shift+R) to bypass service worker cache after any file changes
