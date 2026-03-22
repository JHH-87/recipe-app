/**
 * views/mise.js
 *
 * Mise en place view.
 *
 * Exported pure functions (testable):
 *   getPrepActions(recipe)     → Array<{ item, prep, stageLabel }>
 *   getDoAheadStages(recipe)   → Array<stage>
 *   renderMiseEnPlace(recipe)  → HTML string
 */

// ─── Pure functions ────────────────────────────────────────────────────────────

/**
 * Return all ingredients with non-null prep actions, annotated with
 * which stage they belong to (for context in the UI).
 *
 * @param {object} recipe
 * @returns {Array<{ item: string, prep: string, category: string, stageLabel: string }>}
 */
export function getPrepActions(recipe) {
  return recipe.stages.flatMap((stage) =>
    (stage.ingredients ?? [])
      .filter((ing) => ing.prep != null && ing.prep !== "")
      .map((ing) => ({
        item: ing.item,
        prep: ing.prep,
        category: ing.category ?? "other",
        stageLabel: stage.label,
      }))
  );
}

/**
 * Return only stages with phase === 'prep'.
 *
 * @param {object} recipe
 * @returns {Array<object>}
 */
export function getDoAheadStages(recipe) {
  return recipe.stages.filter((s) => s.phase === "prep");
}

/**
 * Render the full mise en place view HTML.
 *
 * @param {object} recipe
 * @returns {string} HTML
 */
export function renderMiseEnPlace(recipe) {
  const prepActions = getPrepActions(recipe);
  const doAheadStages = getDoAheadStages(recipe);
  const hasContent = prepActions.length > 0 || doAheadStages.length > 0;

  if (!hasContent) {
    return `
      <div class="mise-empty">
        <p class="mise-empty__text">No mise en place for this recipe.</p>
        <p class="mise-empty__sub">Add prep actions to ingredients in the editor to see them here.</p>
      </div>`;
  }

  const prepSection = renderPrepActions(prepActions);
  const doAheadSection = renderDoAhead(doAheadStages);

  return `
    <div class="mise-view">
      ${prepSection}
      ${doAheadSection}
    </div>`;
}

// ─── Section renderers ─────────────────────────────────────────────────────────

function renderPrepActions(prepActions) {
  if (prepActions.length === 0) return "";

  const rows = prepActions.map((action) => `
    <li class="mise-row">
      <div class="mise-row__content">
        <span class="mise-row__item">${escHtml(action.item)}</span>
        <span class="mise-row__action">${escHtml(action.prep)}</span>
      </div>
      <span class="mise-row__stage">${escHtml(action.stageLabel)}</span>
    </li>`).join("");

  return `
    <section class="mise-section" aria-label="Prep actions">
      <h2 class="mise-section__heading">
        <span class="mise-section__icon" aria-hidden="true">✦</span>
        Things to prep
      </h2>
      <ul class="mise-action-list">
        ${rows}
      </ul>
    </section>`;
}

function renderDoAhead(stages) {
  if (stages.length === 0) return "";

  const cards = stages.map((stage) => {
    const ingList = (stage.ingredients ?? []).length > 0
      ? `<ul class="do-ahead__ingredients">
           ${stage.ingredients
             .map((i) => `<li>${escHtml(i.item)}</li>`)
             .join("")}
         </ul>`
      : "";

    return `
      <div class="do-ahead-card">
        <div class="do-ahead-card__header">
          <h3 class="do-ahead-card__label">${escHtml(stage.label)}</h3>
          ${stage.timing
            ? `<span class="do-ahead-card__timing">
                 <span aria-hidden="true">⏱</span> ${escHtml(stage.timing)}
               </span>`
            : ""}
        </div>
        ${ingList}
        <p class="do-ahead-card__method">${escHtml(stage.method)}</p>
      </div>`;
  }).join("");

  return `
    <section class="mise-section" aria-label="Do ahead stages">
      <h2 class="mise-section__heading">
        <span class="mise-section__icon" aria-hidden="true">⏳</span>
        Do ahead
      </h2>
      ${cards}
    </section>`;
}

// ─── Utility ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
