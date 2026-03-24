/**
 * views/flow.js
 *
 * Process flow view — vertical timeline of all recipe stages.
 * Each node links to the appropriate view/tab.
 *
 * Phase config (matches schema):
 *   day-before → Day before (deep blue)
 *   mise       → Mise en place (slate)
 *   cook       → Cook (terracotta)
 *   rest       → Rest & set (amber)
 *   finish     → Finish & plate (sage green)
 */

import { parseTimingToSeconds, formatTime } from "./cook.js";

const LONG_TASK_THRESHOLD = 3600;

export const PHASE_META = {
  "day-before": { label: "Day before",     colour: "#3B5BA5", icon: "🌙" },
  "mise":       { label: "Mise en place",  colour: "#64748B", icon: "✦"  },
  "cook":       { label: "Cook",           colour: "#C4622D", icon: "🔥" },
  "rest":       { label: "Rest & set",     colour: "#B45309", icon: "⏳" },
  "finish":     { label: "Finish & plate", colour: "#5C7A5C", icon: "✓"  },
};

// ─── Pure functions ────────────────────────────────────────────────────────────

export function buildFlowStages(recipe) {
  // Track separate counters per cook-view tab group (cook+rest+finish)
  let cookCounter = 0;
  return recipe.stages.map((stage) => {
    const seconds     = parseTimingToSeconds(stage.timing);
    const isLong      = seconds !== null && seconds >= LONG_TASK_THRESHOLD;
    const isOvernight = /overnight|day\s*before|24\s*h/i.test(stage.timing ?? "");
    const phase       = stage.phase ?? "cook";
    // Cook-view tab index: only for cook/rest/finish phases
    const cookStepIndex = ["cook", "rest", "finish"].includes(phase) ? cookCounter++ : null;
    return { label: stage.label, phase, timing: stage.timing, method: stage.method,
             seconds, isLong, isOvernight, cookStepIndex, ingredients: stage.ingredients ?? [] };
  });
}

export function renderProcessFlow(recipe, slug) {
  const stages = buildFlowStages(recipe);

  const totalCookSecs = stages
    .filter((s) => s.phase === "cook" && s.seconds)
    .reduce((sum, s) => sum + s.seconds, 0);
  const totalPrepSecs = stages
    .filter((s) => ["mise","day-before"].includes(s.phase) && s.seconds && !s.isOvernight)
    .reduce((sum, s) => sum + s.seconds, 0);

  const summaryParts = [];
  if (stages.some((s) => s.isOvernight || s.phase === "day-before")) summaryParts.push("start day before");
  if (totalPrepSecs  > 0) summaryParts.push(`${formatTime(totalPrepSecs)} prep`);
  if (totalCookSecs  > 0) summaryParts.push(`${formatTime(totalCookSecs)} cook`);

  const summary = summaryParts.length
    ? `<div class="flow-summary">
        <span class="flow-summary__label">Total</span>
        <span class="flow-summary__value">${summaryParts.join(" · ")}</span>
       </div>`
    : "";

  const legend = Object.entries(PHASE_META).map(([phase, meta]) => {
    const hasPhase = stages.some((s) => s.phase === phase);
    if (!hasPhase) return "";
    return `<span class="flow-legend-item flow-legend-item--${phase}">${meta.icon} ${meta.label}</span>`;
  }).join("");

  const nodes = stages.map((stage, i) => {
    const isLast = i === stages.length - 1;
    const meta   = PHASE_META[stage.phase] ?? PHASE_META["cook"];

    const href = (stage.phase === "day-before" || stage.phase === "mise")
      ? `#/recipe/${slug}?mode=shopping&submode=phase`
      : `#/recipe/${slug}?mode=cook&step=${stage.cookStepIndex}`;

    const badge = stage.timing
      ? `<span class="flow-badge flow-badge--${stage.phase}">${escHtml(stage.timing)}</span>`
      : "";
    const longFlag = stage.isLong || stage.isOvernight
      ? `<span class="flow-long-flag">${stage.isOvernight ? "🌙 Day before" : "⏳ Long"}</span>` : "";

    const contentInner = `
      <div class="flow-node__header">
        <span class="flow-node__label">${escHtml(stage.label)}</span>
        <span class="flow-phase-tag flow-phase-tag--${stage.phase}">${meta.icon} ${meta.label}</span>
        ${badge}
        ${longFlag}
      </div>
      <p class="flow-node__method">${escHtml(truncate(stage.method, 120))}</p>
      ${stage.ingredients.length > 0
        ? `<p class="flow-node__ing-count">${stage.ingredients.length} ingredient${stage.ingredients.length !== 1 ? "s" : ""}</p>`
        : ""}
      <span class="flow-node__cta">${["day-before","mise"].includes(stage.phase) ? "See by-phase shopping →" : "Go to cook step →"}</span>`;

    const content = href
      ? `<a class="flow-node__content flow-node__link" href="${href}">${contentInner}</a>`
      : `<div class="flow-node__content">${contentInner}</div>`;

    return `
      <div class="flow-node${stage.isLong || stage.isOvernight ? " flow-node--long" : ""}">
        <div class="flow-node__icon-col">
          <div class="flow-node__dot flow-node__dot--${stage.phase}">${meta.icon}</div>
          ${!isLast ? `<div class="flow-node__line flow-node__line--${stage.phase}"></div>` : ""}
        </div>
        ${content}
      </div>`;
  }).join("");

  return `
    <div class="flow-view">
      ${summary}
      <div class="flow-legend">${legend}</div>
      <div class="flow-timeline">${nodes}</div>
    </div>`;
}

function truncate(str, max) {
  if (!str) return "";
  return str.length <= max ? str : str.slice(0, max).trimEnd() + "…";
}

function escHtml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
