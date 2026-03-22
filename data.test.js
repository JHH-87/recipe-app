import { describe, it, expect } from "vitest";
import {
  getRecipes,
  findByTitle,
  findBySlug,
  titleToSlug,
  parseLeadingQuantity,
  formatQuantity,
  scaleItemString,
  scaleIngredients,
  servesMultiplier,
} from "./data.js";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const simpleStage = (label = "Stage 1", ingredients = []) => ({
  label,
  phase: "cook",
  ingredients,
  method: "Do the thing.",
});

const ing = (item, category = "produce") => ({ item, prep: null, category });

const recipes = [
  {
    title: "Spaghetti Aglio e Olio",
    serves: 2,
    stages: [
      simpleStage("Pasta", [
        ing("200g spaghetti", "dry-goods"),
        ing("1 tsp salt", "store-cupboard"),
      ]),
      simpleStage("Oil and garlic", [
        ing("6 tbsp extra virgin olive oil", "store-cupboard"),
        ing("4 cloves garlic", "produce"),
        ing("Small bunch flat-leaf parsley", "produce"),
      ]),
    ],
  },
  {
    title: "Focaccia",
    serves: 8,
    stages: [
      simpleStage("Dough", [
        ing("500g strong white bread flour", "dry-goods"),
        ing("7g instant yeast", "dry-goods"),
        ing("350ml warm water", "store-cupboard"),
      ]),
      simpleStage("Bake", []),
    ],
  },
  {
    title: "Chicken Tikka Masala",
    serves: 4,
    stages: [
      simpleStage("Marinade", [
        ing("800g boneless chicken thighs", "meat"),
        ing("150ml full-fat yoghurt", "dairy"),
        ing("Salt to taste", "store-cupboard"),
        ing("1/2 tsp turmeric", "store-cupboard"),
      ]),
    ],
  },
];

// ─── 3.1 getRecipes ───────────────────────────────────────────────────────────

describe("3.1 getRecipes()", () => {
  it("returns the full array", () => {
    expect(getRecipes(recipes)).toBe(recipes);
  });

  it("returns an array", () => {
    expect(Array.isArray(getRecipes(recipes))).toBe(true);
  });

  it("returns empty array for empty input", () => {
    expect(getRecipes([])).toHaveLength(0);
  });
});

// ─── 3.2 findByTitle ─────────────────────────────────────────────────────────

describe("3.2 findByTitle()", () => {
  it("returns the correct recipe for an exact match", () => {
    const result = findByTitle(recipes, "Focaccia");
    expect(result.title).toBe("Focaccia");
  });

  it("is case-insensitive", () => {
    expect(findByTitle(recipes, "focaccia")).not.toBeNull();
    expect(findByTitle(recipes, "FOCACCIA")).not.toBeNull();
    expect(findByTitle(recipes, "Focaccia")).not.toBeNull();
  });

  it("returns null for unknown title", () => {
    expect(findByTitle(recipes, "Beef Wellington")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(findByTitle(recipes, "")).toBeNull();
  });

  it("returns null for null", () => {
    expect(findByTitle(recipes, null)).toBeNull();
  });

  it("returns null against empty recipe list", () => {
    expect(findByTitle([], "Focaccia")).toBeNull();
  });
});

// ─── titleToSlug and findBySlug ───────────────────────────────────────────────

describe("titleToSlug()", () => {
  it("lowercases and hyphenates", () => {
    expect(titleToSlug("Focaccia")).toBe("focaccia");
    expect(titleToSlug("Chicken Tikka Masala")).toBe("chicken-tikka-masala");
  });

  it("collapses multiple non-alphanumeric chars to one hyphen", () => {
    expect(titleToSlug("Aglio & Olio")).toBe("aglio-olio");
  });

  it("strips leading and trailing hyphens", () => {
    expect(titleToSlug("  Hello World  ")).toBe("hello-world");
  });
});

describe("findBySlug()", () => {
  it("finds by slug", () => {
    const result = findBySlug(recipes, "focaccia");
    expect(result.title).toBe("Focaccia");
  });

  it("finds multi-word title by slug", () => {
    const result = findBySlug(recipes, "chicken-tikka-masala");
    expect(result.title).toBe("Chicken Tikka Masala");
  });

  it("returns null for unknown slug", () => {
    expect(findBySlug(recipes, "beef-wellington")).toBeNull();
  });

  it("returns null for empty slug", () => {
    expect(findBySlug(recipes, "")).toBeNull();
  });
});

// ─── 3.4 / 3.5 / 3.6 scaleIngredients ───────────────────────────────────────

describe("parseLeadingQuantity()", () => {
  it("parses integer", () => {
    expect(parseLeadingQuantity("200g flour")).toMatchObject({ value: 200, rest: "g flour" });
  });

  it("parses decimal", () => {
    expect(parseLeadingQuantity("1.5 tsp salt")).toMatchObject({ value: 1.5, rest: " tsp salt" });
  });

  it("parses simple fraction", () => {
    const result = parseLeadingQuantity("1/2 tsp turmeric");
    expect(result.value).toBeCloseTo(0.5);
    expect(result.rest).toBe(" tsp turmeric");
  });

  it("returns null for non-numeric string", () => {
    expect(parseLeadingQuantity("Salt to taste")).toBeNull();
    expect(parseLeadingQuantity("Small bunch parsley")).toBeNull();
    expect(parseLeadingQuantity("Flaky sea salt")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseLeadingQuantity("")).toBeNull();
  });
});

describe("formatQuantity()", () => {
  it("integer stays integer", () => expect(formatQuantity(400)).toBe("400"));
  it("zero is formatted", () => expect(formatQuantity(0)).toBe("0"));
  it("small decimal rounds to 1dp", () => expect(formatQuantity(1.5)).toBe("1.5"));
  it("small decimal strips trailing zero", () => expect(formatQuantity(1.0)).toBe("1"));
  it("large decimal rounds to integer", () => expect(formatQuantity(12.5)).toBe("13"));
  it("large decimal rounds down", () => expect(formatQuantity(14.3)).toBe("14"));
});

describe("scaleItemString()", () => {
  it("multiplier 1 returns string unchanged", () => {
    expect(scaleItemString("200g spaghetti", 1)).toBe("200g spaghetti");
  });

  it("doubles integer quantity", () => {
    expect(scaleItemString("200g spaghetti", 2)).toBe("400g spaghetti");
  });

  it("halves integer quantity", () => {
    expect(scaleItemString("200g spaghetti", 0.5)).toBe("100g spaghetti");
  });

  it("scales tsp quantities to 1dp", () => {
    expect(scaleItemString("1 tsp salt", 1.5)).toBe("1.5 tsp salt");
  });

  it("leaves non-numeric strings unchanged", () => {
    expect(scaleItemString("Salt to taste", 2)).toBe("Salt to taste");
    expect(scaleItemString("Small bunch parsley", 3)).toBe("Small bunch parsley");
    expect(scaleItemString("Flaky sea salt", 2)).toBe("Flaky sea salt");
  });

  it("scales fractions", () => {
    const result = scaleItemString("1/2 tsp turmeric", 2);
    expect(result).toBe("1 tsp turmeric");
  });

  it("rounds large quantities to integer", () => {
    expect(scaleItemString("150ml cream", 3)).toBe("450ml cream");
  });
});

describe("3.4 / 3.5 / 3.6 scaleIngredients()", () => {
  const tikka = recipes[2]; // Chicken Tikka Masala, serves 4

  it("3.4 correctly scales numeric quantities", () => {
    const scaled = scaleIngredients(tikka, 2);
    const chicken = scaled.stages[0].ingredients.find((i) =>
      i.item.includes("chicken")
    );
    expect(chicken.item).toBe("1600g boneless chicken thighs");
  });

  it("3.5 leaves non-numeric quantities unchanged", () => {
    const scaled = scaleIngredients(tikka, 2);
    const saltToTaste = scaled.stages[0].ingredients.find((i) =>
      i.item.toLowerCase().includes("salt to taste")
    );
    expect(saltToTaste.item).toBe("Salt to taste");
  });

  it("3.6 multiplier 1 returns equivalent recipe", () => {
    const scaled = scaleIngredients(tikka, 1);
    // Should return the same object (no cloning on multiplier 1)
    expect(scaled).toBe(tikka);
  });

  it("scales serves field proportionally", () => {
    expect(scaleIngredients(tikka, 2).serves).toBe(8);
    expect(scaleIngredients(tikka, 0.5).serves).toBe(2);
  });

  it("does not mutate original recipe", () => {
    const original = JSON.stringify(tikka);
    scaleIngredients(tikka, 2);
    expect(JSON.stringify(tikka)).toBe(original);
  });

  it("scales fraction quantities", () => {
    const scaled = scaleIngredients(tikka, 4); // 1/2 tsp × 4 = 2 tsp
    const turmeric = scaled.stages[0].ingredients.find((i) =>
      i.item.includes("turmeric")
    );
    expect(turmeric.item).toBe("2 tsp turmeric");
  });

  it("stage structure is preserved after scaling", () => {
    const scaled = scaleIngredients(tikka, 2);
    expect(scaled.stages[0].phase).toBe("cook");
    expect(scaled.stages[0].label).toBe("Marinade");
    expect(scaled.stages[0].method).toBe("Do the thing.");
  });
});

// ─── servesMultiplier ─────────────────────────────────────────────────────────

describe("servesMultiplier()", () => {
  it("computes correct multiplier for doubling", () => {
    expect(servesMultiplier({ serves: 4 }, 8)).toBe(2);
  });

  it("computes correct multiplier for halving", () => {
    expect(servesMultiplier({ serves: 4 }, 2)).toBe(0.5);
  });

  it("returns 1 for same serves", () => {
    expect(servesMultiplier({ serves: 4 }, 4)).toBe(1);
  });

  it("returns 1 if serves is 0 (guard against divide by zero)", () => {
    expect(servesMultiplier({ serves: 0 }, 4)).toBe(1);
  });
});
