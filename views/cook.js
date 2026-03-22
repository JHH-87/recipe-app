/**
 * views/cook.js
 *
 * Cook view with stage tabs, persistent per-stage timers, and bell sound.
 *
 * Timer architecture:
 *   stageTimers: Map<stageIndex, { intervalId, remaining, complete }>
 *   Timers run independently of the DOM. Tab navigation does not reset them.
 *
 * Exported pure functions (testable):
 *   getCookStages(recipe)
 *   renderCookView(recipe, stepIndex)
 *   renderStageDetail(stage, index, total, timerState)
 *   formatTime(seconds)
 *   parseTimingToSeconds(timingStr)
 *
 * Exported timer functions:
 *   startStageTimer(stageIndex, seconds)
 *   clearStageTimer(stageIndex)
 *   clearAllTimers()
 *   clearActiveTimer()   ← alias for backward compat with main.js
 *   getTimerState(stageIndex)
 *   playTimerSound()
 *
 * Exported event binding:
 *   bindCookEvents(recipe, stepIndex, onStepChange)
 */

// ─── Per-stage timer state ────────────────────────────────────────────────────

const stageTimers = new Map();

export function getTimerState(stageIndex) {
  return stageTimers.get(stageIndex) ?? null;
}

// Pitch profile per stage index (cycles if more stages than entries)
const STAGE_FREQUENCIES = [880, 660, 523, 440, 740, 587];

// How long to repeat the alarm if not dismissed (seconds)
const ALARM_REPEAT_DURATION = 30;
// Gap between alarm repeats (seconds)
const ALARM_REPEAT_INTERVAL = 3;

export function startStageTimer(stageIndex, seconds) {
  clearStageTimer(stageIndex);
  let remaining = seconds;
  const state = { intervalId: null, alarmIntervalId: null, remaining, complete: false };
  stageTimers.set(stageIndex, state);

  const intervalId = setInterval(() => {
    remaining -= 1;
    state.remaining = remaining;
    const el = document.getElementById(`timer-countdown-${stageIndex}`);
    if (el) el.textContent = formatTime(remaining);

    if (remaining <= 0) {
      clearInterval(intervalId);
      state.intervalId = null;
      state.complete = true;

      // First strike
      playTimerSound(stageIndex);

      // Update DOM
      const doneEl = document.getElementById(`timer-countdown-${stageIndex}`);
      if (doneEl) {
        doneEl.textContent = "Done!";
        doneEl.classList.add("timer-display__countdown--done");
        doneEl.closest(".timer-block")?.classList.add("timer-block--complete");
      }

      // Repeat alarm every ALARM_REPEAT_INTERVAL seconds for ALARM_REPEAT_DURATION seconds
      let elapsed = 0;
      const alarmIntervalId = setInterval(() => {
        elapsed += ALARM_REPEAT_INTERVAL;
        if (elapsed >= ALARM_REPEAT_DURATION) {
          clearInterval(alarmIntervalId);
          state.alarmIntervalId = null;
          return;
        }
        // Only repeat if this stage is still in complete state (not manually stopped)
        const currentState = stageTimers.get(stageIndex);
        if (currentState?.complete) {
          playTimerSound(stageIndex);
        } else {
          clearInterval(alarmIntervalId);
        }
      }, ALARM_REPEAT_INTERVAL * 1000);

      state.alarmIntervalId = alarmIntervalId;
    }
  }, 1000);

  state.intervalId = intervalId;
}

export function clearStageTimer(stageIndex) {
  const state = stageTimers.get(stageIndex);
  if (state?.intervalId)      clearInterval(state.intervalId);
  if (state?.alarmIntervalId) clearInterval(state.alarmIntervalId);
  stageTimers.delete(stageIndex);
}

export function clearAllTimers() {
  for (const [, state] of stageTimers) {
    if (state.intervalId)      clearInterval(state.intervalId);
    if (state.alarmIntervalId) clearInterval(state.alarmIntervalId);
  }
  stageTimers.clear();
}

export const clearActiveTimer = clearAllTimers;

// ─── Sound ────────────────────────────────────────────────────────────────────

/**
 * Play a bell tone for a specific stage.
 * Each stage has a distinct pitch; higher stages = lower pitch.
 * Three strikes with decaying amplitude.
 *
 * @param {number} stageIndex
 */
export function playTimerSound(stageIndex = 0) {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const freq = STAGE_FREQUENCIES[stageIndex % STAGE_FREQUENCIES.length];
    [0, 0.35, 0.7].forEach((delay) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 1.4);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 1.4);
    });
  } catch {
    // Web Audio unavailable — silent fallback
  }
}

// ─── Pure functions ────────────────────────────────────────────────────────────

export function getCookStages(recipe) {
  return recipe.stages.filter((s) => s.phase === "cook");
}

export function formatTime(totalSeconds) {
  if (totalSeconds < 0) return "0s";
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function parseTimingToSeconds(timingStr) {
  if (!timingStr) return null;
  const s = timingStr.toLowerCase();
  let total = 0;
  const hours = s.match(/(\d+)\s*h(?:our|rs?)?/);
  const mins  = s.match(/(\d+)\s*m(?:in(?:ute)?s?)?/);
  const secs  = s.match(/(\d+)\s*s(?:ec(?:ond)?s?)?/);
  if (hours) total += parseInt(hours[1], 10) * 3600;
  if (mins)  total += parseInt(mins[1], 10) * 60;
  if (secs)  total += parseInt(secs[1], 10);
  return total > 0 ? total : null;
}

export function renderStageDetail(stage, index, total, timerState = null) {
  const hasIngredients = (stage.ingredients ?? []).length > 0;
  const timerSeconds   = parseTimingToSeconds(stage.timing);

  const ingredientsHtml = hasIngredients ? `
    <section class="cook-stage-card__ingredients">
      <h3 class="cook-stage__ing-heading">For this step</h3>
      <ul class="cook-ing-list">
        ${stage.ingredients.map((ing) => `<li class="cook-ing-row">${escHtml(ing.item)}</li>`).join("")}
      </ul>
    </section>` : "";

  let timerHtml = "";
  if (timerSeconds) {
    const isRunning  = timerState && !timerState.complete && timerState.remaining > 0;
    const isComplete = timerState?.complete;
    const displayRemaining = timerState ? timerState.remaining : timerSeconds;
    timerHtml = `
      <div class="timer-block${isComplete ? " timer-block--complete" : ""}" data-duration="${timerSeconds}" data-stage="${index}">
        <button class="timer-btn timer-btn--start" aria-label="Start timer for ${escHtml(stage.timing ?? "")}"${isRunning || isComplete ? " hidden" : ""}>
          <span class="timer-btn__icon" aria-hidden="true">▶</span>
          <span class="timer-btn__label">Start timer</span>
          <span class="timer-btn__duration">${escHtml(stage.timing ?? "")}</span>
        </button>
        <div class="timer-display"${isRunning || isComplete ? "" : " hidden"}>
          <span class="timer-display__countdown${isComplete ? " timer-display__countdown--done" : ""}" id="timer-countdown-${index}">${isComplete ? "Done!" : formatTime(displayRemaining)}</span>
          <button class="timer-btn timer-btn--stop" data-stage="${index}" aria-label="Stop timer">✕</button>
        </div>
      </div>`;
  }

  return `
    <div class="cook-stage-card">
      <header class="cook-stage-card__header">
        <div class="cook-stage-card__meta">
          <span class="cook-stage-card__step">Step ${index + 1} of ${total}</span>
          ${stage.timing ? `<span class="cook-stage-card__timing">⏱ ${escHtml(stage.timing)}</span>` : ""}
        </div>
        <h2 class="cook-stage-card__title">${escHtml(stage.label)}</h2>
      </header>
      ${ingredientsHtml}
      <section class="cook-stage-card__method">
        <p class="cook-method-text">${escHtml(stage.method)}</p>
      </section>
      ${timerHtml}
    </div>`;
}

export function renderCookView(recipe, stepIndex = 0) {
  const stages = getCookStages(recipe);
  if (stages.length === 0) return `<p class="empty-note">No cook steps found for this recipe.</p>`;

  const safeIndex = Math.max(0, Math.min(stepIndex, stages.length - 1));

  const tabs = stages.map((s, i) => {
    const ts      = stageTimers.get(i);
    const running = ts && !ts.complete && ts.remaining > 0;
    const done    = ts?.complete;
    return `<button class="cook-tab${i === safeIndex ? " cook-tab--active" : ""}" data-step="${i}" role="tab" aria-selected="${i === safeIndex}">${escHtml(s.label)}${running ? `<span class="cook-tab__indicator cook-tab__indicator--running" aria-label="Timer running">●</span>` : ""}${done ? `<span class="cook-tab__indicator cook-tab__indicator--done" aria-label="Timer done">✓</span>` : ""}</button>`;
  }).join("");

  const timerState = getTimerState(safeIndex);
  return `
    <div class="cook-view">
      <nav class="cook-tabs" role="tablist" aria-label="Cook stages">${tabs}</nav>
      ${renderStageDetail(stages[safeIndex], safeIndex, stages.length, timerState)}
    </div>`;
}

// ─── Event binding ─────────────────────────────────────────────────────────────

export function bindCookEvents(recipe, currentStepIndex, onStepChange) {
  document.querySelectorAll(".cook-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = parseInt(btn.dataset.step, 10);
      if (next !== currentStepIndex) onStepChange(next);
    });
  });

  const timerBlock = document.querySelector(".timer-block");
  if (!timerBlock) return;

  const stageIndex = parseInt(timerBlock.dataset.stage, 10);
  const duration   = parseInt(timerBlock.dataset.duration, 10);

  timerBlock.querySelector(".timer-btn--start")?.addEventListener("click", () => {
    startStageTimer(stageIndex, duration);
    onStepChange(currentStepIndex); // re-render to show tab indicator
  });

  document.querySelectorAll(".timer-btn--stop").forEach((btn) => {
    btn.addEventListener("click", () => {
      clearStageTimer(parseInt(btn.dataset.stage, 10));
      onStepChange(currentStepIndex);
    });
  });
}

// ─── Utility ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
