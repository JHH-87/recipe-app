/**
 * views/flow.js
 *
 * Process flow view — visual timeline of all recipe stages.
 * Each node is a link: prep stages navigate to the Mise tab,
 * cook stages navigate to the Cook tab at the correct step.
 *
 * Exported pure functions:
 *   buildFlowStages(recipe)            → Array<flowStage>
 *   renderProcessFlow(recipe, slug)    → HTML string
 */

import { parseTimingToSeconds, formatTime } from "./cook.js";

const LONG_TASK_THRESHOLD = 3600; // 1 hour

// ─── Pure functions ────────────────────────────────────────────────────────────

/**
 * Build enriched stage descriptors.
 * cookStepIndex is the 0-based index within cook-only stages (null for prep).
 *
 * @param {object} recipe
 * @returns {Array<object>}
 */
export function buildFlowStages(recipe) {
  let cookCounter = 0;
  return recipe.stages.map((stage) => {
    const seconds     = parseTimingToSeconds(stage.timing);
    const isLong      = seconds !== null && seconds >= LONG_TASK_THRESHOLD;
    const isOvernight = /overnight|day\s*before|24\s*h/i.test(stage.timing ?? "");
    const cookStepIndex = stage.phase === "cook" ? cookCounter++ : null;
    return {
      label:          stage.label,
      phase:          stage.phase,
      timing:         stage.timing,
      method:         stage.method,
      seconds,
      isLong,
      isOvernight,
      cookStepIndex,
      ingredients:    stage.ingredients ?? [],
    };
  });
}

/**
 * Render the full process flow HTML.
 *
 * @param {object} recipe
 * @param {string} slug   - URL slug for generating navigation hrefs
 * @returns {string} HTML
 */
export function renderProcessFlow(recipe, slug) {
  const stages = buildFlowStages(recipe);

  const totalCookSecs = stages
    .filter((s) => s.phase === "cook" && s.seconds)
    .reduce((sum, s) => sum + s.seconds, 0);

  const totalPrepSecs = stages
    .filter((s) => s.phase === "prep" && s.seconds && !s.isOvernight)
    .reduce((sum, s) => sum + s.seconds, 0);

  const summaryParts = [];
  if (totalPrepSecs  > 0) summaryParts.push(`${formatTime(totalPrepSecs)} prep`);
  if (totalCookSecs  > 0) summaryParts.push(`${formatTime(totalCookSecs)} cook`);
  if (stages.some((s) => s.isOvernight)) summaryParts.push("overnight rest");

  const summary = summaryParts.length
    ? `<div class="flow-summary">
        <span class="flow-summary__label">Total</span>
        <span class="flow-summary__value">${summaryParts.join(" + ")}</span>
       </div>`
    : "";

  const nodes = stages.map((stage, i) => {
    const isLast = i === stages.length - 1;

    // Destination href
    const href = stage.phase === "prep"
      ? `#/recipe/${slug}?mode=mise`
      : `#/recipe/${slug}?mode=cook&step=${stage.cookStepIndex}`;

    const icon  = stageIcon(stage);
    const badge = stage.timing
      ? `<span class="flow-badge flow-badge--${stage.phase}">${escHtml(stage.timing)}</span>`
      : "";
    const longFlag = stage.isLong || stage.isOvernight
      ? `<span class="flow-long-flag">${stage.isOvernight ? "🌙 Day before" : "⏳ Long task"}</span>`
      : "";

    return `
      <div class="flow-node${stage.isLong || stage.isOvernight ? " flow-node--long" : ""}">
        <div class="flow-node__icon-col">
          <div class="flow-node__dot flow-node__dot--${stage.phase}">${icon}</div>
          ${!isLast ? `<div class="flow-node__line flow-node__line--${stage.phase}"></div>` : ""}
        </div>
        <a class="flow-node__content flow-node__link" href="${escHtml(href)}">
          <div class="flow-node__header">
            <span class="flow-node__label">${escHtml(stage.label)}</span>
            ${badge}
            ${longFlag}
          </div>
          <p class="flow-node__method">${escHtml(truncate(stage.method, 120))}</p>
          ${stage.ingredients.length > 0
            ? `<p class="flow-node__ing-count">${stage.ingredients.length} ingredient${stage.ingredients.length !== 1 ? "s" : ""}</p>`
            : ""}
          <span class="flow-node__cta">${stage.phase === "prep" ? "View mise en place" : "Go to step"} →</span>
        </a>
      </div>`;
  }).join("");

  return `
    <div class="flow-view">
      ${summary}
      <div class="flow-legend">
        <span class="flow-badge flow-badge--prep">Prep</span>
        <span class="flow-badge flow-badge--cook">Cook</span>
        <span class="flow-long-flag" style="font-size:0.75rem">⏳ = 1hr+</span>
        <span class="flow-long-flag" style="font-size:0.75rem">🌙 = overnight</span>
      </div>
      <div class="flow-timeline">${nodes}</div>
    </div>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stageIcon(stage) {
  if (stage.isOvernight) return "🌙";
  if (stage.isLong)      return "⏳";
  if (stage.phase === "prep") return "✦";
  const secs = stage.seconds;
  if (!secs)       return "●";
  if (secs <= 300) return "⚡";
  return "●";
}

function truncate(str, max) {
  if (!str) return "";
  return str.length <= max ? str : str.slice(0, max).trimEnd() + "…";
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
