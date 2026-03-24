/**
 * views/shopping.js
 *
 * Shopping view with two sub-modes:
 *   shop  — flat list by category, quantities summed where possible (supermarket view)
 *   phase — ingredients grouped by cooking phase, per-phase quantities (kitchen prep view)
 *
 * Exported pure functions (testable):
 *   flattenIngredients(recipe)
 *   deduplicateIngredients(list)
 *   groupByCategory(list)
 *   normaliseIngredients(list)       — sum compatible quantities, keep rest separate
 *   groupByPhase(recipe)             — Map<phase, Array<{stage, ingredients}>>
 *   formatShoppingText(recipe)
 *   renderShoppingList(recipe, subMode)
 *
 * Exported side-effectful:
 *   bindShoppingEvents(recipe)
 */

// ─── Phase config ──────────────────────────────────────────────────────────────

export const PHASE_ORDER  = ["day-before", "mise", "cook", "rest", "finish"];
export const PHASE_LABELS = {
  "day-before": "Day before",
  "mise":       "Mise en place",
  "cook":       "Cook",
  "rest":       "Rest & set",
  "finish":     "Finish & plate",
};

// ─── Category config ───────────────────────────────────────────────────────────

export const CATEGORY_ORDER = [
  "produce", "meat", "fish", "dairy", "fresh",
  "dry-goods", "store-cupboard", "spices", "bakery", "freezer", "other",
];

export const CATEGORY_LABELS = {
  produce:            "Fruit & Veg",
  meat:               "Meat",
  fish:               "Fish & Seafood",
  dairy:              "Dairy & Eggs",
  fresh:              "Fresh & Chilled",
  "dry-goods":        "Dry Goods",
  "store-cupboard":   "Store Cupboard",
  spices:             "Spices & Herbs",
  bakery:             "Bakery",
  freezer:            "Freezer",
  other:              "Other",
};

// ─── Quantity normalisation ────────────────────────────────────────────────────

// Unit canonicalisation: maps aliases to a canonical form + multiplier to base
const UNIT_CANON = {
  // weight
  g: { base: "g", factor: 1 },
  gram: { base: "g", factor: 1 },
  grams: { base: "g", factor: 1 },
  kg: { base: "g", factor: 1000 },
  kilogram: { base: "g", factor: 1000 },
  oz: { base: "oz", factor: 1 },
  ounce: { base: "oz", factor: 1 },
  ounces: { base: "oz", factor: 1 },
  lb: { base: "oz", factor: 16 },
  lbs: { base: "oz", factor: 16 },
  // volume
  ml: { base: "ml", factor: 1 },
  millilitre: { base: "ml", factor: 1 },
  milliliter: { base: "ml", factor: 1 },
  l: { base: "ml", factor: 1000 },
  litre: { base: "ml", factor: 1000 },
  liter: { base: "ml", factor: 1000 },
  tsp: { base: "tsp", factor: 1 },
  teaspoon: { base: "tsp", factor: 1 },
  tbsp: { base: "tbsp", factor: 1 },
  tablespoon: { base: "tbsp", factor: 1 },
  cup: { base: "cup", factor: 1 },
  // count — no unit, just a number
  "": { base: "", factor: 1 },
};

/**
 * Parse a leading quantity and unit from an ingredient string.
 * Returns { amount, unit, rest, baseAmount, baseUnit } or null if no leading number.
 *
 * @param {string} str
 * @returns {{ amount: number, unit: string, rest: string, baseAmount: number, baseUnit: string } | null}
 */
export function parseQuantityAndUnit(str) {
  if (!str) return null;
  // Match: number (int, decimal, fraction) followed by optional unit
  const m = str.match(/^(\d+(?:[./]\d+)?)\s*([a-zA-Z]*)\s*(.*)/s);
  if (!m) return null;

  const rawNum = m[1];
  const rawUnit = m[2].toLowerCase();
  const rest = m[3].trim();

  let amount;
  if (rawNum.includes("/")) {
    const [n, d] = rawNum.split("/");
    amount = parseInt(n) / parseInt(d);
  } else {
    amount = parseFloat(rawNum);
  }
  if (isNaN(amount)) return null;

  const canon = UNIT_CANON[rawUnit] ?? null;
  if (!canon) return null; // unknown unit — can't normalise

  return {
    amount,
    unit: rawUnit,
    rest,
    baseAmount: amount * canon.factor,
    baseUnit: canon.base,
  };
}

/**
 * Strip leading quantity and unit from an ingredient string to get the "item key".
 * Used for grouping compatible ingredients for summing.
 * "200g strong white flour" → "strong white flour"
 * "3 large eggs" → "large eggs"  (count items: strip number but keep unit word if descriptive)
 *
 * @param {string} str
 * @returns {string}
 */
export function itemKey(str) {
  if (!str) return "";
  const parsed = parseQuantityAndUnit(str);
  if (!parsed) return str.toLowerCase().trim();
  // If unit is a known canonical unit, strip it; otherwise keep it (it's descriptive)
  const knownUnit = Object.keys(UNIT_CANON).includes(parsed.unit);
  return (knownUnit ? parsed.rest : (parsed.unit + " " + parsed.rest))
    .toLowerCase().trim();
}

/**
 * Format a quantity back to a clean string.
 *
 * @param {number} amount
 * @param {string} baseUnit
 * @returns {string}
 */
function formatAmount(amount, baseUnit) {
  // Convert back from base unit if over threshold
  if (baseUnit === "g" && amount >= 1000) {
    return `${parseFloat((amount / 1000).toFixed(2)).toString()}kg`;
  }
  if (baseUnit === "ml" && amount >= 1000) {
    return `${parseFloat((amount / 1000).toFixed(2)).toString()}l`;
  }
  // Format number
  const n = Number.isInteger(amount) ? amount
    : amount < 10 ? parseFloat(amount.toFixed(1))
    : Math.round(amount);
  return `${n}${baseUnit}`;
}

/**
 * Attempt to sum compatible ingredients (same item key + same base unit).
 * Incompatible items (different units, or unparseable) are kept as-is.
 *
 * Returns a new deduplicated array — original array not mutated.
 *
 * @param {Array<object>} ingredients
 * @returns {Array<object>}
 */
export function normaliseIngredients(ingredients) {
  // Group by item key
  const groups = new Map(); // key → [{ ing, parsed }]

  for (const ing of ingredients) {
    const key     = itemKey(ing.item);
    const parsed  = parseQuantityAndUnit(ing.item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ing, parsed });
  }

  const result = [];

  for (const [, entries] of groups) {
    if (entries.length === 1) {
      result.push(entries[0].ing);
      continue;
    }

    // Try to sum — all entries must have parseable quantities with the same baseUnit
    const allParsed  = entries.every(e => e.parsed !== null);
    const baseUnits  = new Set(entries.map(e => e.parsed?.baseUnit));
    const canSum     = allParsed && baseUnits.size === 1;

    if (canSum) {
      const totalBase = entries.reduce((sum, e) => sum + e.parsed.baseUnit === [...baseUnits][0] ? e.parsed.baseAmount : 0, 0);
      // Recalculate properly
      const bu = [...baseUnits][0];
      const total = entries.reduce((sum, e) => sum + e.parsed.baseAmount, 0);
      const summedItem = `${formatAmount(total, bu)} ${entries[0].parsed.rest}`.trim();
      result.push({ ...entries[0].ing, item: summedItem });
    } else {
      // Can't sum — keep all entries separately
      entries.forEach(e => result.push(e.ing));
    }
  }

  return result;
}

// ─── Flat list helpers ─────────────────────────────────────────────────────────

export function flattenIngredients(recipe) {
  return recipe.stages.flatMap((stage) => stage.ingredients ?? []);
}

export function deduplicateIngredients(ingredients) {
  const seen = new Set();
  return ingredients.filter((ing) => {
    const key = ing.item.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function groupByCategory(ingredients) {
  const map = new Map(CATEGORY_ORDER.map((cat) => [cat, []]));
  for (const ing of ingredients) {
    const cat = ing.category ?? "other";
    if (!map.has(cat)) {
      map.set(cat, []);
    }
    map.get(cat).push(ing);
  }
  return map;
}

// ─── Phase grouping ────────────────────────────────────────────────────────────

/**
 * Group ingredients by phase, preserving stage label for context.
 * Returns Map<phase, Array<{ stageLabel, ingredients }>>
 *
 * @param {object} recipe
 * @returns {Map<string, Array<{ stageLabel: string, ingredients: Array }>>}
 */
export function groupByPhase(recipe) {
  const map = new Map(PHASE_ORDER.map((p) => [p, []]));

  for (const stage of recipe.stages) {
    const phase = stage.phase ?? "cook";
    if (!map.has(phase)) map.set(phase, []);
    if ((stage.ingredients ?? []).length > 0) {
      map.get(phase).push({
        stageLabel: stage.label,
        timing:     stage.timing,
        ingredients: stage.ingredients,
      });
    }
  }

  return map;
}

// ─── Text export ───────────────────────────────────────────────────────────────

export function formatShoppingText(recipe) {
  const flat    = flattenIngredients(recipe);
  const normed  = normaliseIngredients(flat);
  const grouped = groupByCategory(normed);

  const lines = [`${recipe.title} — serves ${recipe.serves}`, ""];

  for (const [cat, items] of grouped) {
    if (items.length === 0) continue;
    lines.push(CATEGORY_LABELS[cat] ?? cat);
    for (const ing of items) lines.push(`  ${ing.item}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

// ─── Renderers ─────────────────────────────────────────────────────────────────

export function renderShoppingList(recipe, subMode = "shop") {
  const subNav = `
    <div class="shop-subnav">
      <button class="shop-subnav__btn${subMode === "shop"  ? " shop-subnav__btn--active" : ""}" data-submode="shop">By category</button>
      <button class="shop-subnav__btn${subMode === "phase" ? " shop-subnav__btn--active" : ""}" data-submode="phase">By phase</button>
    </div>`;

  return subMode === "phase"
    ? subNav + renderByPhase(recipe)
    : subNav + renderByCategory(recipe);
}

function renderByCategory(recipe) {
  const flat    = flattenIngredients(recipe);
  const normed  = normaliseIngredients(flat);
  const grouped = groupByCategory(normed);
  const sections = [];

  for (const [cat, items] of grouped) {
    if (items.length === 0) continue;
    sections.push(`
      <section class="shopping-section" aria-label="${escHtml(CATEGORY_LABELS[cat] ?? cat)}">
        <h2 class="shopping-section__heading">${escHtml(CATEGORY_LABELS[cat] ?? cat)}</h2>
        <ul class="shopping-section__list">
          ${items.map((ing) => shoppingRow(ing)).join("")}
        </ul>
      </section>`);
  }

  if (sections.length === 0) return `<p class="empty-note">No ingredients found.</p>`;

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

function renderByPhase(recipe) {
  const phaseMap = groupByPhase(recipe);
  const sections = [];

  for (const phase of PHASE_ORDER) {
    const groups = phaseMap.get(phase) ?? [];
    if (groups.length === 0) continue;

    const stageBlocks = groups.map(({ stageLabel, timing, ingredients }) => {
      const timingHtml = timing
        ? `<span class="phase-stage__timing">⏱ ${escHtml(timing)}</span>`
        : "";
      return `
        <div class="phase-stage">
          <div class="phase-stage__header">
            <span class="phase-stage__label">${escHtml(stageLabel)}</span>
            ${timingHtml}
          </div>
          <ul class="shopping-section__list">
            ${ingredients.map((ing) => shoppingRow(ing)).join("")}
          </ul>
        </div>`;
    }).join("");

    sections.push(`
      <section class="shopping-section shopping-section--phase" aria-label="${escHtml(PHASE_LABELS[phase] ?? phase)}">
        <h2 class="shopping-section__heading shopping-section__heading--phase">
          <span class="phase-dot phase-dot--${phase}"></span>
          ${escHtml(PHASE_LABELS[phase] ?? phase)}
        </h2>
        ${stageBlocks}
      </section>`);
  }

  if (sections.length === 0) return `<p class="empty-note">No ingredients found.</p>`;
  return `<div class="shopping-list shopping-list--phase">${sections.join("")}</div>`;
}

function shoppingRow(ing) {
  return `
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
    </li>`;
}

// ─── Event binding ─────────────────────────────────────────────────────────────

export function bindShoppingEvents(recipe, onSubModeChange) {
  // Sub-nav toggle
  document.querySelectorAll(".shop-subnav__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      onSubModeChange(btn.dataset.submode);
    });
  });

  // Check-off rows
  document.querySelectorAll(".shopping-row__check").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pressed = btn.getAttribute("aria-pressed") === "true";
      btn.setAttribute("aria-pressed", String(!pressed));
      btn.closest(".shopping-row").classList.toggle("shopping-row--checked", !pressed);
    });
  });

  // Share / copy
  const shareBtn = document.getElementById("share-btn");
  const feedback = document.getElementById("share-feedback");
  if (!shareBtn || !recipe) return;

  shareBtn.addEventListener("click", async () => {
    const text = formatShoppingText(recipe);
    if (navigator.share) {
      try {
        await navigator.share({ title: `${recipe.title} — shopping list`, text });
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }
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

function escHtml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
