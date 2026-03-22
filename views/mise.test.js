import { describe, it, expect } from "vitest";
import { getPrepActions, getDoAheadStages, renderMiseEnPlace } from "./mise.js";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const tikka = {
  title: "Chicken Tikka Masala",
  serves: 4,
  stages: [
    {
      label: "Marinade",
      phase: "prep",
      timing: "at least 4 hours",
      ingredients: [
        { item: "800g chicken thighs", prep: "cut into 4cm chunks", category: "meat" },
        { item: "150ml yoghurt", prep: null, category: "dairy" },
        { item: "1 tsp salt", prep: null, category: "store-cupboard" },
      ],
      method: "Combine and refrigerate.",
    },
    {
      label: "Base aromatics",
      phase: "cook",
      ingredients: [
        { item: "2 onions", prep: "finely dice", category: "produce" },
        { item: "3 cloves garlic", prep: "grate to paste", category: "produce" },
        { item: "2 tbsp oil", prep: null, category: "store-cupboard" },
      ],
      method: "Fry the aromatics.",
    },
    {
      label: "Sauce",
      phase: "cook",
      ingredients: [
        { item: "400g tin tomatoes", prep: null, category: "store-cupboard" },
        { item: "200ml cream", prep: null, category: "dairy" },
      ],
      method: "Add tomatoes and simmer.",
    },
  ],
};

const noPrepRecipe = {
  title: "No Prep",
  serves: 2,
  stages: [
    {
      label: "Cook",
      phase: "cook",
      ingredients: [
        { item: "200g pasta", prep: null, category: "dry-goods" },
        { item: "salt", prep: null, category: "store-cupboard" },
      ],
      method: "Boil pasta.",
    },
  ],
};

const mixedPrepRecipe = {
  title: "Mixed",
  serves: 4,
  stages: [
    {
      label: "Soak",
      phase: "prep",
      timing: "overnight",
      ingredients: [
        { item: "200g dried beans", prep: null, category: "dry-goods" },
      ],
      method: "Soak beans in cold water overnight.",
    },
    {
      label: "Cook",
      phase: "cook",
      ingredients: [
        { item: "1 onion", prep: "dice", category: "produce" },
      ],
      method: "Cook everything.",
    },
  ],
};

// ─── 4.4 getPrepActions ────────────────────────────────────────────────────────

describe("4.4 getPrepActions()", () => {
  it("returns only ingredients with non-null prep", () => {
    const result = getPrepActions(tikka);
    // chicken thighs (prep), 2 onions (prep), 3 cloves garlic (prep) = 3
    expect(result).toHaveLength(3);
  });

  it("includes ingredients from prep-phase stages", () => {
    const result = getPrepActions(tikka);
    const items = result.map((r) => r.item);
    expect(items).toContain("800g chicken thighs");
  });

  it("includes ingredients from cook-phase stages", () => {
    const result = getPrepActions(tikka);
    const items = result.map((r) => r.item);
    expect(items).toContain("2 onions");
    expect(items).toContain("3 cloves garlic");
  });

  it("annotates each action with stageLabel", () => {
    const result = getPrepActions(tikka);
    const chicken = result.find((r) => r.item === "800g chicken thighs");
    expect(chicken.stageLabel).toBe("Marinade");
    const onion = result.find((r) => r.item === "2 onions");
    expect(onion.stageLabel).toBe("Base aromatics");
  });

  it("returns empty array when no ingredients have prep", () => {
    expect(getPrepActions(noPrepRecipe)).toHaveLength(0);
  });

  it("ignores ingredients with prep: null explicitly", () => {
    const result = getPrepActions(tikka);
    const items = result.map((r) => r.item);
    expect(items).not.toContain("150ml yoghurt");
    expect(items).not.toContain("1 tsp salt");
  });
});

// ─── 4.5 / 4.6 getDoAheadStages ───────────────────────────────────────────────

describe("4.5 getDoAheadStages() — prep stages appear", () => {
  it("returns only phase: 'prep' stages", () => {
    const result = getDoAheadStages(tikka);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Marinade");
  });

  it("returns all prep stages when there are multiple", () => {
    const recipe = {
      ...tikka,
      stages: [
        { ...tikka.stages[0] },
        { label: "Second Prep", phase: "prep", ingredients: [], method: "Another." },
        { ...tikka.stages[1] },
      ],
    };
    expect(getDoAheadStages(recipe)).toHaveLength(2);
  });

  it("returns empty array when no prep stages exist", () => {
    expect(getDoAheadStages(noPrepRecipe)).toHaveLength(0);
  });
});

describe("4.6 getDoAheadStages() — cook stages excluded", () => {
  it("cook-phase stages are not included", () => {
    const result = getDoAheadStages(tikka);
    const labels = result.map((s) => s.label);
    expect(labels).not.toContain("Base aromatics");
    expect(labels).not.toContain("Sauce");
  });
});

// ─── renderMiseEnPlace ─────────────────────────────────────────────────────────

describe("renderMiseEnPlace()", () => {
  it("renders prep action items", () => {
    const html = renderMiseEnPlace(tikka);
    expect(html).toContain("800g chicken thighs");
    expect(html).toContain("cut into 4cm chunks");
  });

  it("renders do-ahead stages with timing", () => {
    const html = renderMiseEnPlace(tikka);
    expect(html).toContain("Marinade");
    expect(html).toContain("at least 4 hours");
  });

  it("renders 'Things to prep' section heading", () => {
    const html = renderMiseEnPlace(tikka);
    expect(html).toContain("Things to prep");
  });

  it("renders 'Do ahead' section heading", () => {
    const html = renderMiseEnPlace(tikka);
    expect(html).toContain("Do ahead");
  });

  it("shows stage label as context for each prep action", () => {
    const html = renderMiseEnPlace(tikka);
    expect(html).toContain("Marinade");
    expect(html).toContain("Base aromatics");
  });

  it("does not render 'Things to prep' when no prep actions exist", () => {
    const html = renderMiseEnPlace(mixedPrepRecipe);
    expect(html).not.toContain("Things to prep");
  });

  it("renders 'Do ahead' even when no prep actions exist", () => {
    const html = renderMiseEnPlace(mixedPrepRecipe);
    expect(html).toContain("Do ahead");
    expect(html).toContain("Soak");
  });

  it("renders empty state when no prep or do-ahead content exists", () => {
    const html = renderMiseEnPlace(noPrepRecipe);
    expect(html).toContain("No mise en place");
  });

  it("does not render cook-phase method text in do-ahead section", () => {
    const html = renderMiseEnPlace(tikka);
    // "Fry the aromatics" is a cook-phase method — should not appear in mise view
    expect(html).not.toContain("Fry the aromatics");
  });

  it("escapes HTML in prep action strings", () => {
    const recipe = {
      ...noPrepRecipe,
      stages: [
        {
          label: "S",
          phase: "cook",
          ingredients: [{ item: "garlic", prep: '<b>mince</b>', category: "produce" }],
          method: "Cook.",
        },
      ],
    };
    const html = renderMiseEnPlace(recipe);
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;b&gt;");
  });
});

// ─── 4.14 Mode switching does not corrupt state ────────────────────────────────
// (Tested at unit level: both functions are pure and stateless,
//  so repeated calls on same recipe always return identical output.)

describe("4.14 renderMiseEnPlace is pure (no internal state)", () => {
  it("calling twice returns identical output", () => {
    const first = renderMiseEnPlace(tikka);
    const second = renderMiseEnPlace(tikka);
    expect(first).toBe(second);
  });
});
