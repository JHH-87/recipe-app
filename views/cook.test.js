import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getCookStages,
  renderCookView,
  renderStageDetail,
  formatTime,
  parseTimingToSeconds,
  startTimer,
  clearActiveTimer,
} from "./cook.js";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const ing = (item, category = "produce") => ({ item, prep: null, category });

const fullRecipe = {
  title: "Chicken Tikka Masala",
  serves: 4,
  stages: [
    {
      label: "Marinade",
      phase: "prep",
      timing: "at least 4 hours",
      ingredients: [ing("800g chicken", "meat")],
      method: "Marinate chicken.",
    },
    {
      label: "Base",
      phase: "cook",
      timing: "15 minutes",
      ingredients: [ing("2 onions", "produce"), ing("3 cloves garlic", "produce")],
      method: "Fry the base aromatics.",
    },
    {
      label: "Sauce",
      phase: "cook",
      timing: "25 minutes",
      ingredients: [ing("400g tin tomatoes", "store-cupboard")],
      method: "Add tomatoes and simmer.",
    },
    {
      label: "Combine",
      phase: "cook",
      ingredients: [],
      method: "Add chicken to sauce and heat through.",
    },
  ],
};

const noCookRecipe = {
  title: "Cold Dish",
  serves: 2,
  stages: [
    { label: "Prep", phase: "prep", ingredients: [], method: "Prep everything." },
  ],
};

// ─── 4.7 / 4.8 getCookStages ──────────────────────────────────────────────────

describe("4.7 getCookStages() — only cook stages returned", () => {
  it("returns only phase: 'cook' stages", () => {
    const result = getCookStages(fullRecipe);
    expect(result.every((s) => s.phase === "cook")).toBe(true);
  });

  it("returns correct count of cook stages", () => {
    expect(getCookStages(fullRecipe)).toHaveLength(3);
  });

  it("returns empty array when no cook stages", () => {
    expect(getCookStages(noCookRecipe)).toHaveLength(0);
  });
});

describe("4.8 getCookStages() — prep stages excluded", () => {
  it("prep-phase stage is not in cook stages", () => {
    const result = getCookStages(fullRecipe);
    const labels = result.map((s) => s.label);
    expect(labels).not.toContain("Marinade");
  });
});

// ─── 4.9 Stage count ──────────────────────────────────────────────────────────

describe("4.9 renderCookView stage count", () => {
  it("step counter reflects number of cook stages", () => {
    const html = renderCookView(fullRecipe, 0);
    // "1 / 3" — 3 cook stages
    expect(html).toContain("1 / 3");
  });

  it("renders last step correctly", () => {
    const html = renderCookView(fullRecipe, 2);
    expect(html).toContain("3 / 3");
  });

  it("clamps out-of-range stepIndex to last valid step", () => {
    const html = renderCookView(fullRecipe, 99);
    expect(html).toContain("3 / 3");
  });

  it("clamps negative stepIndex to 0", () => {
    const html = renderCookView(fullRecipe, -1);
    expect(html).toContain("1 / 3");
  });

  it("renders empty-note for recipe with no cook stages", () => {
    const html = renderCookView(noCookRecipe);
    expect(html).toContain("No cook steps");
  });
});

// ─── renderStageDetail ────────────────────────────────────────────────────────

describe("renderStageDetail()", () => {
  it("renders stage label", () => {
    const html = renderStageDetail(fullRecipe.stages[1], 0, 3);
    expect(html).toContain("Base");
  });

  it("renders stage method text", () => {
    const html = renderStageDetail(fullRecipe.stages[1], 0, 3);
    expect(html).toContain("Fry the base aromatics.");
  });

  it("renders ingredients for the step", () => {
    const html = renderStageDetail(fullRecipe.stages[1], 0, 3);
    expect(html).toContain("2 onions");
    expect(html).toContain("3 cloves garlic");
  });

  it("renders timing when present", () => {
    const html = renderStageDetail(fullRecipe.stages[1], 0, 3);
    expect(html).toContain("15 minutes");
  });

  it("renders timer button when timing is parseable", () => {
    const html = renderStageDetail(fullRecipe.stages[1], 0, 3);
    expect(html).toContain("timer-btn--start");
  });

  it("does not render timer button when timing is absent", () => {
    const html = renderStageDetail(fullRecipe.stages[3], 2, 3); // Combine - no timing
    expect(html).not.toContain("timer-btn--start");
  });

  it("renders Prev button disabled on first step", () => {
    const html = renderStageDetail(fullRecipe.stages[1], 0, 3);
    expect(html).toMatch(/step-nav__btn--prev[^>]*disabled/);
  });

  it("renders Next button disabled on last step", () => {
    const html = renderStageDetail(fullRecipe.stages[3], 2, 3);
    expect(html).toMatch(/step-nav__btn--next[^>]*disabled/);
  });

  it("both nav buttons enabled on middle step", () => {
    const html = renderStageDetail(fullRecipe.stages[2], 1, 3);
    // Neither prev nor next should be disabled
    const prevDisabled = /step-nav__btn--prev[^>]*disabled/.test(html);
    const nextDisabled = /step-nav__btn--next[^>]*disabled/.test(html);
    expect(prevDisabled).toBe(false);
    expect(nextDisabled).toBe(false);
  });

  it("renders step number in header", () => {
    const html = renderStageDetail(fullRecipe.stages[2], 1, 3);
    expect(html).toContain("Step 2");
  });

  it("does not render ingredients section for empty-ingredient stage", () => {
    const html = renderStageDetail(fullRecipe.stages[3], 2, 3);
    expect(html).not.toContain("For this step");
  });

  it("escapes HTML in method text", () => {
    const stage = {
      ...fullRecipe.stages[1],
      method: '<script>alert("xss")</script>',
    };
    const html = renderStageDetail(stage, 0, 3);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

// ─── 4.10 Timer ───────────────────────────────────────────────────────────────

describe("4.10 Timer functions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearActiveTimer();
  });

  afterEach(() => {
    clearActiveTimer();
    vi.useRealTimers();
  });

  it("formatTime: seconds only below 60", () => {
    expect(formatTime(45)).toBe("45s");
    expect(formatTime(0)).toBe("0s");
    expect(formatTime(59)).toBe("59s");
  });

  it("formatTime: mm:ss at 60 seconds or more", () => {
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(90)).toBe("1:30");
    expect(formatTime(3661)).toBe("61:01");
  });

  it("formatTime: negative input returns '0s'", () => {
    expect(formatTime(-5)).toBe("0s");
  });

  it("startTimer calls onTick immediately with full duration", () => {
    const ticks = [];
    startTimer(5, (r) => ticks.push(r), () => {});
    expect(ticks[0]).toBe(5);
  });

  it("startTimer calls onTick each second", () => {
    const ticks = [];
    startTimer(3, (r) => ticks.push(r), () => {});
    vi.advanceTimersByTime(3000);
    expect(ticks).toEqual([3, 2, 1, 0]);
  });

  it("startTimer fires onComplete when countdown reaches zero", () => {
    const complete = vi.fn();
    startTimer(2, () => {}, complete);
    vi.advanceTimersByTime(2000);
    expect(complete).toHaveBeenCalledOnce();
  });

  it("startTimer does not call onComplete before time is up", () => {
    const complete = vi.fn();
    startTimer(5, () => {}, complete);
    vi.advanceTimersByTime(3000);
    expect(complete).not.toHaveBeenCalled();
  });

  it("clearActiveTimer stops an in-progress timer", () => {
    const ticks = [];
    startTimer(10, (r) => ticks.push(r), () => {});
    vi.advanceTimersByTime(3000);
    clearActiveTimer();
    vi.advanceTimersByTime(5000); // would fire 5 more ticks if not cleared
    expect(ticks).toHaveLength(4); // initial + 3 seconds
  });

  it("starting a new timer clears the previous one", () => {
    const ticks1 = [];
    startTimer(10, (r) => ticks1.push(r), () => {});
    vi.advanceTimersByTime(2000);

    const ticks2 = [];
    startTimer(5, (r) => ticks2.push(r), () => {});
    vi.advanceTimersByTime(3000);

    // Timer 1 should have stopped at 3 ticks (initial + 2 seconds)
    expect(ticks1).toHaveLength(3);
    // Timer 2 continues
    expect(ticks2.length).toBeGreaterThan(1);
  });
});

// ─── parseTimingToSeconds ─────────────────────────────────────────────────────

describe("parseTimingToSeconds()", () => {
  it("parses minutes", () => expect(parseTimingToSeconds("20 minutes")).toBe(1200));
  it("parses hours", () => expect(parseTimingToSeconds("1 hour")).toBe(3600));
  it("parses hours and minutes", () =>
    expect(parseTimingToSeconds("1 hour 30 minutes")).toBe(5400));
  it("parses abbreviated 'min'", () =>
    expect(parseTimingToSeconds("15 min")).toBe(900));
  it("parses abbreviated 'hrs'", () =>
    expect(parseTimingToSeconds("2 hrs")).toBe(7200));
  it("parses seconds", () =>
    expect(parseTimingToSeconds("30 seconds")).toBe(30));
  it("returns null for non-time strings", () =>
    expect(parseTimingToSeconds("overnight")).toBeNull());
  it("returns null for empty string", () =>
    expect(parseTimingToSeconds("")).toBeNull());
  it("returns null for undefined", () =>
    expect(parseTimingToSeconds(undefined)).toBeNull());
  it("returns null for 'at least 4 hours' if it contains hours", () => {
    // "at least 4 hours" should still parse the number
    expect(parseTimingToSeconds("at least 4 hours")).toBe(14400);
  });
});

// ─── 4.14 renderCookView is pure ─────────────────────────────────────────────

describe("4.14 renderCookView is pure (no internal state)", () => {
  it("same step index always produces identical output", () => {
    const first = renderCookView(fullRecipe, 0);
    const second = renderCookView(fullRecipe, 0);
    expect(first).toBe(second);
  });

  it("different step indices produce different output", () => {
    const step0 = renderCookView(fullRecipe, 0);
    const step1 = renderCookView(fullRecipe, 1);
    expect(step0).not.toBe(step1);
  });
});
