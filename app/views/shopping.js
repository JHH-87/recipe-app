/**
 * views/shopping.js
 *
 * Shopping list view.
 *
 * Exported pure functions (testable):
 *   flattenIngredients(recipe)        → Array<ingredient>
 *   deduplicateIngredients(list)      → Array<ingredient>
 *   groupByCategory(list)             → Map<category, Array<ingredient>>
 *   renderShoppingList(recipe)        → HTML string
 *
 * Exported side-effectful (not unit tested):
 *   bindShoppingEvents(recipe)        → void
 *
 * The render function expects a recipe that has already been scaled
 * by the caller (main.js applies scaleIngredients before passing in).
 */

export const CATEGORY_ORDER = [
  "produce",
  "meat",
  "fish",
  "dairy",
  "fresh",
  "dry-goods",
  "store-cupboard",
  "spices",
  "bakery",
  "freezer",
  "other",
];

export const CATEGORY_LABELS = {
  produce:          "Fruit & Veg",
  meat:             "Meat",
  fish:             "Fish & Seafood",
  dairy:            "Dairy & Eggs",
  fresh:            "Fresh & Chilled",
  "dry-goods":      "Dry Goods",
  "store-cupboard": "Store Cupboard",
  spices:           "Spices & Herbs",
  bakery:           "Bakery",
  freezer:          "Freezer",
  other:            "Other",
};

// ─── Pure functions ────────────────────────────────────────────────────────────

/**
 * Flatten all ingredients from all stages into a single array.
 *
 * @param {object} recipe
 * @returns {Array<object>}
 */
export function flattenIngredients(recipe) {
  return recipe.stages.flatMap((stage) => stage.ingredients ?? []);
}

/**
 * Deduplicate ingredients by exact item string (case-insensitive).
 * First occurrence wins; subsequent duplicates are dropped.
 *
 * @param {Array<object>} ingredients
 * @returns {Array<object>}
 */
export function deduplicateIngredients(ingredients) {
  const seen = new Set();
  return ingredients.filter((ing) => {
    const key = ing.item.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Group a flat ingredient array by category.
 * Returns a Map preserving CATEGORY_ORDER for iteration.
 *
 * @param {Array<object>} ingredients
 * @returns {Map<string, Array<object>>}
 */
export function groupByCategory(ingredients) {
  // Pre-populate known categories in order
  const map = new Map(CATEGORY_ORDER.map((cat) => [cat, []]));

  for (const ing of ingredients) {
    const cat = ing.category ?? "other";
    // Unknown custom categories (e.g. "freezer" before it was in the list)
    // are appended to the map in encounter order, before "other"
    if (!map.has(cat)) {
      // Insert before "other"
      const entries = [...map.entries()];
      const otherIdx = entries.findIndex(([k]) => k === "other");
      map.delete("other");
      map.set(cat, []);
      map.set("other", entries.find(([k]) => k === "other")?.[1] ?? []);
    }
    map.get(cat).push(ing);
  }

  return map;
}

/**
 * Format the shopping list as plain text, grouped by category.
 * Used by the share and copy functions. Pure — no DOM access.
 *
 * @param {object} recipe
 * @returns {string} plain text
 */
export function formatShoppingText(recipe) {
  const flat = flattenIngredients(recipe);
  const deduped = deduplicateIngredients(flat);
  const grouped = groupByCategory(deduped);

  const lines = [`${recipe.title} — serves ${recipe.serves}`, ""];

  for (const [cat, items] of grouped) {
    if (items.length === 0) continue;
    lines.push(CATEGORY_LABELS[cat] ?? cat);
    for (const ing of items) lines.push(`  ${ing.item}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/**
 * Render the full shopping list HTML.
 * Expects a pre-scaled recipe.
 *
 * @param {object} recipe
 * @returns {string} HTML
 */
export function renderShoppingList(recipe) {
  const flat = flattenIngredients(recipe);
  const deduped = deduplicateIngredients(flat);
  const grouped = groupByCategory(deduped);

  const sections = [];

  for (const [cat, items] of grouped) {
    if (items.length === 0) continue;

    const rows = items.map((ing) => `
      <li class="shopping-row" role="listitem">
        <button
          class="shopping-row__check"
          aria-label="Mark ${escHtml(ing.item)} as collected"
          aria-pressed="false"
          data-item="${escHtml(ing.item)}"
        >
          <span class="check-icon" aria-hidden="true"></span>
        </button>
        <span class="shopping-row__item">${escHtml(ing.item)}</span>
      </li>`).join("");

    sections.push(`
      <section class="shopping-section" aria-label="${escHtml(CATEGORY_LABELS[cat] ?? cat)}">
        <h2 class="shopping-section__heading">${escHtml(CATEGORY_LABELS[cat] ?? cat)}</h2>
        <ul class="shopping-section__list">
          ${rows}
        </ul>
      </section>`);
  }

  if (sections.length === 0) {
    return `<p class="empty-note">No ingredients found.</p>`;
  }

  const shareBtn = `
    <div class="shopping-share">
      <button class="shopping-share__btn" id="share-btn" aria-label="Share shopping list">
        <span class="shopping-share__icon" aria-hidden="true">↑</span>
        Share list
      </button>
      <span class="shopping-share__feedback" id="share-feedback" aria-live="polite"></span>
    </div>`;

  return `<div class="shopping-list">${shareBtn}${sections.join("")}</div>`;
}

// ─── Event binding ─────────────────────────────────────────────────────────────

/**
 * Bind tap-to-check behaviour and share/copy button.
 * Accepts the recipe so formatShoppingText can produce the plain-text payload.
 *
 * @param {object} recipe - pre-scaled recipe
 */
export function bindShoppingEvents(recipe) {
  // Check-off rows
  document.querySelectorAll(".shopping-row__check").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pressed = btn.getAttribute("aria-pressed") === "true";
      btn.setAttribute("aria-pressed", String(!pressed));
      btn.closest(".shopping-row").classList.toggle("shopping-row--checked", !pressed);
    });
  });

  // Share / copy button
  const shareBtn = document.getElementById("share-btn");
  const feedback = document.getElementById("share-feedback");
  if (!shareBtn || !recipe) return;

  shareBtn.addEventListener("click", async () => {
    const text = formatShoppingText(recipe);

    // Web Share API — triggers native share sheet on mobile
    if (navigator.share) {
      try {
        await navigator.share({ title: `${recipe.title} — shopping list`, text });
        return;
      } catch (err) {
        // User cancelled share — no feedback needed
        if (err.name === "AbortError") return;
        // Share failed, fall through to clipboard
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(text);
      showFeedback(feedback, "Copied!");
    } catch {
      showFeedback(feedback, "Could not copy — try selecting the list manually.");
    }
  });
}

function showFeedback(el, message) {
  if (!el) return;
  el.textContent = message;
  setTimeout(() => { el.textContent = ""; }, 2500);
}

// ─── Utility ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
