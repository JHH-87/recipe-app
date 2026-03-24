/**
 * views/editor.js
 *
 * Recipe editor view.
 *
 * Exported pure functions (testable):
 *   buildEmptyRecipe()                  → recipe object
 *   buildEmptyStage(index)              → stage object
 *   buildEmptyIngredient()              → ingredient object
 *   validateRecipe(recipe)              → { valid, errors }
 *   renderEditorForm(recipe)            → HTML string
 *
 * Exported side-effectful (not unit tested):
 *   parseFormToRecipe(formEl)           → recipe object from DOM
 *   bindEditorEvents(recipe, onSave)    → void
 *
 * Persistence:
 *   saveToLocalStorage(recipe)          → void
 *   loadUserRecipes()                   → Array<recipe>
 *   deleteUserRecipe(title)             → void
 *
 * localStorage key: "userRecipes" → JSON array of user-authored recipes.
 * On app load, data.js merges these with the base recipes.json.
 */

import { CATEGORIES as BASE_CATEGORIES, categorise } from "../extractor/categoriser.js";

// Extended category list including custom ones not in the base schema enum.
// These are suggestions — users can type any value.
const CATEGORIES = [
  ...BASE_CATEGORIES.filter((c) => c !== "other"),
  "fresh",
  "spices",
  "freezer",
  "other",
];

// ─── Builders ─────────────────────────────────────────────────────────────────

/**
 * @returns {object} A minimal valid recipe skeleton.
 */
export function buildEmptyRecipe() {
  return {
    title: "",
    serves: 4,
    stages: [buildEmptyStage(0)],
  };
}

/**
 * @param {number} index - 0-based stage index, used to generate default label.
 * @returns {object} A minimal valid stage skeleton.
 */
export function buildEmptyStage(index) {
  return {
    label: `Stage ${index + 1}`,
    phase: "cook",
    timing: "",
    ingredients: [buildEmptyIngredient()],
    method: "",
  };
}

/**
 * @returns {object} An empty ingredient object.
 */
export function buildEmptyIngredient() {
  return { item: "", prep: null, category: "other" };
}

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_PHASES    = ["prep", "cook"];
const VALID_CATEGORIES = CATEGORIES;

/**
 * Validate a recipe object against the schema rules.
 * Returns { valid: boolean, errors: string[] }.
 * Errors are human-readable, suitable for inline display.
 *
 * @param {object} recipe
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateRecipe(recipe) {
  const errors = [];

  if (!recipe.title || !recipe.title.trim()) {
    errors.push("Title is required.");
  }

  if (!Number.isInteger(recipe.serves) || recipe.serves < 1) {
    errors.push("Serves must be a whole number of 1 or more.");
  }

  if (!recipe.stages || recipe.stages.length === 0) {
    errors.push("At least one stage is required.");
  } else {
    recipe.stages.forEach((stage, si) => {
      const prefix = `Stage ${si + 1}`;

      if (!stage.label || !stage.label.trim()) {
        errors.push(`${prefix}: label is required.`);
      }

      if (!VALID_PHASES.includes(stage.phase)) {
        errors.push(`${prefix}: phase must be "prep" or "cook".`);
      }

      if (!stage.method || !stage.method.trim()) {
        errors.push(`${prefix}: method is required.`);
      }

      (stage.ingredients ?? []).forEach((ing, ii) => {
        const ingPrefix = `${prefix}, ingredient ${ii + 1}`;

        if (!ing.item || !ing.item.trim()) {
          errors.push(`${ingPrefix}: item is required.`);
        }

        if (!VALID_CATEGORIES.includes(ing.category)) {
          errors.push(`${ingPrefix}: invalid category "${ing.category}".`);
        }
      });
    });
  }

  return { valid: errors.length === 0, errors };
}

// ─── Form rendering ────────────────────────────────────────────────────────────

/**
 * Render the full editor form HTML for a given recipe.
 * Can render a blank recipe (buildEmptyRecipe()) or an existing one.
 *
 * @param {object} recipe
 * @param {{ isEdit?: boolean }} options
 * @returns {string} HTML
 */
export function renderEditorForm(recipe, { isEdit = false } = {}) {
  const stagesHtml = (recipe.stages ?? [])
    .map((stage, i) => renderStageFields(stage, i, recipe.stages.length))
    .join("");

  return `
    <div class="editor-form" id="editor-form">
      <div class="editor-field">
        <label class="editor-label" for="recipe-title">Recipe title</label>
        <input
          class="editor-input"
          id="recipe-title"
          name="title"
          type="text"
          value="${escHtml(recipe.title)}"
          placeholder="e.g. Chicken Tikka Masala"
          autocomplete="off"
          required
        />
      </div>

      <div class="editor-field editor-field--inline">
        <label class="editor-label" for="recipe-serves">Serves</label>
        <input
          class="editor-input editor-input--narrow"
          id="recipe-serves"
          name="serves"
          type="number"
          value="${recipe.serves}"
          min="1"
          max="99"
          required
        />
      </div>

      <div class="editor-field">
        <label class="editor-label">Notes <span class="editor-label--optional">(optional)</span></label>
        <textarea
          class="editor-textarea editor-textarea--short"
          name="notes"
          placeholder="Sourcing tips, variations, background…"
        >${escHtml(recipe.notes ?? "")}</textarea>
      </div>

      <div class="editor-stages" id="stages-container">
        ${stagesHtml}
      </div>

      <button type="button" class="editor-btn editor-btn--add-stage" id="add-stage-btn">
        + Add stage
      </button>

      <div class="editor-errors" id="editor-errors" role="alert" hidden></div>

      <div class="editor-actions">
        <button type="button" class="editor-btn editor-btn--save" id="save-btn">
          ${isEdit ? "Save changes" : "Add recipe"}
        </button>
        <button type="button" class="editor-btn editor-btn--export" id="export-btn">
          Export JSON
        </button>
      </div>
    </div>`;
}

// ─── Stage and ingredient field renderers ──────────────────────────────────────

function renderStageFields(stage, stageIndex, totalStages) {
  const ingredientsHtml = (stage.ingredients ?? [])
    .map((ing, ii) => renderIngredientRow(ing, stageIndex, ii))
    .join("");

  return `
    <div class="editor-stage" data-stage-index="${stageIndex}" id="stage-${stageIndex}">
      <div class="editor-stage__header">
        <h3 class="editor-stage__title">Stage ${stageIndex + 1}</h3>
        ${totalStages > 1
          ? `<button type="button" class="editor-btn editor-btn--remove remove-stage-btn"
               data-stage="${stageIndex}" aria-label="Remove stage ${stageIndex + 1}">Remove</button>`
          : ""}
      </div>

      <div class="editor-field">
        <label class="editor-label">Label</label>
        <input
          class="editor-input"
          name="stage[${stageIndex}][label]"
          type="text"
          value="${escHtml(stage.label)}"
          placeholder="e.g. Marinade, Base, Sauce"
          required
        />
      </div>

      <div class="editor-field editor-field--row">
        <div class="editor-field">
          <label class="editor-label" for="phase-${stageIndex}">Phase</label>
          <select
            class="editor-select editor-select--phase"
            id="phase-${stageIndex}"
            name="stage[${stageIndex}][phase]"
          >
            ${["day-before","mise","cook","rest","finish"].map((p) =>
              `<option value="${p}" ${stage.phase === p ? "selected" : ""}>${{
                "day-before": "🌙 Day before",
                "mise":       "✦ Mise en place",
                "cook":       "🔥 Cook",
                "rest":       "⏳ Rest & set",
                "finish":     "✓ Finish & plate"
              }[p]}</option>`
            ).join("")}
          </select>
        </div>

        <div class="editor-field">
          <label class="editor-label">Timing <span class="editor-label--optional">(optional)</span></label>
          <input
            class="editor-input"
            name="stage[${stageIndex}][timing]"
            type="text"
            value="${escHtml(stage.timing ?? "")}"
            placeholder="e.g. 20 minutes, overnight"
          />
        </div>
      </div>

      <div class="editor-field">
        <label class="editor-label">Ingredients</label>
        <div class="editor-ingredient-list" id="ingredients-${stageIndex}">
          ${ingredientsHtml}
        </div>
        <button type="button" class="editor-btn editor-btn--add-ing add-ingredient-btn"
          data-stage="${stageIndex}">
          + Add ingredient
        </button>
      </div>

      <div class="editor-field">
        <label class="editor-label">Method</label>
        <textarea
          class="editor-textarea"
          name="stage[${stageIndex}][method]"
          placeholder="Describe what to do in this stage…"
          required
        >${escHtml(stage.method)}</textarea>
      </div>
    </div>`;
}

function renderIngredientRow(ing, stageIndex, ingIndex) {
  const datalistId = `cat-list-${stageIndex}-${ingIndex}`;

  return `
    <div class="editor-ingredient-row" data-stage="${stageIndex}" data-ing="${ingIndex}">
      <datalist id="${datalistId}">
        ${CATEGORIES.map((cat) => `<option value="${cat}">`).join("")}
      </datalist>
      <div class="editor-ingredient-row__fields">
        <input
          class="editor-input editor-input--item"
          name="stage[${stageIndex}][ing][${ingIndex}][item]"
          type="text"
          value="${escHtml(ing.item)}"
          placeholder="e.g. 200g spaghetti"
          data-autocat-stage="${stageIndex}"
          data-autocat-ing="${ingIndex}"
        />
        <input
          class="editor-input editor-input--category"
          name="stage[${stageIndex}][ing][${ingIndex}][category]"
          id="cat-${stageIndex}-${ingIndex}"
          type="text"
          value="${escHtml(ing.category ?? "other")}"
          placeholder="category"
          list="${datalistId}"
          autocomplete="off"
        />
      </div>
      <input
        class="editor-input editor-input--prep"
        name="stage[${stageIndex}][ing][${ingIndex}][prep]"
        type="text"
        value="${escHtml(ing.prep ?? "")}"
        placeholder="Prep action (optional) e.g. finely dice"
      />
      <button type="button" class="editor-btn editor-btn--remove remove-ingredient-btn"
        data-stage="${stageIndex}" data-ing="${ingIndex}"
        aria-label="Remove ingredient">✕</button>
    </div>`;
}

// ─── Form → recipe serialisation ──────────────────────────────────────────────

/**
 * Read the current editor DOM and produce a recipe object.
 * Not unit tested — DOM-dependent.
 *
 * @param {HTMLElement} formEl - the #editor-form element
 * @returns {object} recipe (not yet validated)
 */
export function parseFormToRecipe(formEl) {
  const get = (name) => formEl.querySelector(`[name="${name}"]`)?.value?.trim() ?? "";

  const title  = get("title");
  const serves = parseInt(get("serves"), 10);
  const notes  = get("notes") || undefined;

  // Collect stages by index
  const stageEls = formEl.querySelectorAll(".editor-stage");
  const stages = Array.from(stageEls).map((stageEl) => {
    const si = stageEl.dataset.stageIndex;
    const label  = stageEl.querySelector(`[name="stage[${si}][label]"]`)?.value?.trim() ?? "";
    const phase  = stageEl.querySelector(`[name="stage[${si}][phase]"]`)?.value ?? "cook";
    const timing = stageEl.querySelector(`[name="stage[${si}][timing]"]`)?.value?.trim() || undefined;
    const method = stageEl.querySelector(`[name="stage[${si}][method]"]`)?.value?.trim() ?? "";

    const ingRows = stageEl.querySelectorAll(".editor-ingredient-row");
    const ingredients = Array.from(ingRows).map((row) => {
      const ii   = row.dataset.ing;
      const item = row.querySelector(`[name="stage[${si}][ing][${ii}][item]"]`)?.value?.trim() ?? "";
      const prep = row.querySelector(`[name="stage[${si}][ing][${ii}][prep]"]`)?.value?.trim() || null;
      const category = row.querySelector(`[name="stage[${si}][ing][${ii}][category]"]`)?.value ?? "other";
      return { item, prep, category };
    }).filter((ing) => ing.item !== ""); // drop blank ingredient rows

    return { label, phase, ...(timing ? { timing } : {}), ingredients, method };
  });

  return { title, serves, ...(notes ? { notes } : {}), stages };
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const LS_KEY = "userRecipes";

/**
 * Load user-authored recipes from localStorage.
 * Returns empty array if none stored or on parse error.
 *
 * @returns {Array<object>}
 */
export function loadUserRecipes() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save or update a recipe in localStorage.
 * Matches by title (case-insensitive); replaces if found, appends if new.
 *
 * @param {object} recipe
 */
export function saveToLocalStorage(recipe) {
  const existing = loadUserRecipes();
  const idx = existing.findIndex(
    (r) => r.title.toLowerCase() === recipe.title.toLowerCase()
  );
  if (idx >= 0) {
    existing[idx] = recipe;
  } else {
    existing.push(recipe);
  }
  localStorage.setItem(LS_KEY, JSON.stringify(existing));
}

/**
 * Delete a user recipe from localStorage by title.
 *
 * @param {string} title
 */
export function deleteUserRecipe(title) {
  const existing = loadUserRecipes().filter(
    (r) => r.title.toLowerCase() !== title.toLowerCase()
  );
  localStorage.setItem(LS_KEY, JSON.stringify(existing));
}

/**
 * Merge base recipes (from recipes.json) with user recipes (from localStorage).
 * User recipes with matching titles override base versions.
 * New user recipes are appended.
 *
 * @param {Array<object>} baseRecipes
 * @param {Array<object>} userRecipes
 * @returns {Array<object>}
 */
export function mergeRecipes(baseRecipes, userRecipes) {
  if (userRecipes.length === 0) return baseRecipes;

  const result = [...baseRecipes];
  for (const ur of userRecipes) {
    const idx = result.findIndex(
      (r) => r.title.toLowerCase() === ur.title.toLowerCase()
    );
    if (idx >= 0) {
      result[idx] = ur;
    } else {
      result.push(ur);
    }
  }
  return result;
}

/**
 * Trigger a JSON file download of a recipe for archiving.
 * Not unit tested — DOM-dependent.
 *
 * @param {object} recipe
 */
export function downloadRecipeJson(recipe) {
  const json = JSON.stringify(recipe, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${recipe.title.toLowerCase().replace(/\s+/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Event binding ─────────────────────────────────────────────────────────────

/**
 * Bind all editor interactions.
 *
 * @param {object}   initialRecipe  - recipe seeding the form (empty or existing)
 * @param {function} onSave         - callback(savedRecipe) called after successful save
 * @param {function} onNavigate     - callback(hash) for in-editor navigation (add/remove stages)
 */
export function bindEditorEvents(initialRecipe, onSave, onNavigate) {
  // Track current form state in memory so add/remove stage can re-render
  let draft = structuredClone(initialRecipe);

  // Phase is now a <select> — no toggle binding needed

  // ── Auto-categorise on item blur ──────────────────────────────────────────
  document.querySelectorAll("[data-autocat-stage]").forEach((input) => {
    input.addEventListener("blur", () => {
      const si  = input.dataset.autocatStage;
      const ii  = input.dataset.autocatIng;
      const cat = categorise(input.value);
      const sel = document.getElementById(`cat-${si}-${ii}`);
      if (sel && sel.value === "other" && cat !== "other") {
        sel.value = cat;
      }
    });
  });

  // ── Add stage ─────────────────────────────────────────────────────────────
  document.getElementById("add-stage-btn")?.addEventListener("click", () => {
    draft = parseFormToRecipe(document.getElementById("editor-form"));
    draft.stages.push(buildEmptyStage(draft.stages.length));
    onNavigate(draft);
  });

  // ── Remove stage ─────────────────────────────────────────────────────────
  document.querySelectorAll(".remove-stage-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const si = parseInt(btn.dataset.stage, 10);
      draft = parseFormToRecipe(document.getElementById("editor-form"));
      draft.stages.splice(si, 1);
      // Re-label stages sequentially
      draft.stages.forEach((s, i) => {
        if (/^Stage \d+$/.test(s.label)) s.label = `Stage ${i + 1}`;
      });
      onNavigate(draft);
    });
  });

  // ── Add ingredient ────────────────────────────────────────────────────────
  document.querySelectorAll(".add-ingredient-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const si = parseInt(btn.dataset.stage, 10);
      draft = parseFormToRecipe(document.getElementById("editor-form"));
      draft.stages[si].ingredients.push(buildEmptyIngredient());
      onNavigate(draft);
    });
  });

  // ── Remove ingredient ─────────────────────────────────────────────────────
  document.querySelectorAll(".remove-ingredient-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const si = parseInt(btn.dataset.stage, 10);
      const ii = parseInt(btn.dataset.ing, 10);
      draft = parseFormToRecipe(document.getElementById("editor-form"));
      draft.stages[si].ingredients.splice(ii, 1);
      onNavigate(draft);
    });
  });

  // ── Save ──────────────────────────────────────────────────────────────────
  document.getElementById("save-btn")?.addEventListener("click", () => {
    const recipe  = parseFormToRecipe(document.getElementById("editor-form"));
    const { valid, errors } = validateRecipe(recipe);
    const errEl   = document.getElementById("editor-errors");

    if (!valid) {
      errEl.innerHTML = errors.map((e) => `<p>${escHtml(e)}</p>`).join("");
      errEl.hidden = false;
      errEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    errEl.hidden = true;
    saveToLocalStorage(recipe);
    onSave(recipe);
  });

  // ── Export JSON ───────────────────────────────────────────────────────────
  document.getElementById("export-btn")?.addEventListener("click", () => {
    const recipe = parseFormToRecipe(document.getElementById("editor-form"));
    downloadRecipeJson(recipe);
  });
}

// ─── Utility ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
