import { describe, it, expect } from "vitest";
import {
  flattenIngredients,
  deduplicateIngredients,
  groupByCategory,
  renderShoppingList,
  formatShoppingText,
  CATEGORY_ORDER,
} from "./shopping.js";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const ing = (item, category = "produce") => ({ item, prep: null, category });

const simpleRecipe = {
  title: "Simple",
  serves: 2,
  stages: [
    {
      label: "Stage 1",
      phase: "cook",
      ingredients: [
        ing("200g spaghetti", "dry-goods"),
        ing("1 tsp salt", "store-cupboard"),
      ],
      method: "Cook pasta.",
    },
    {
      label: "Stage 2",
      phase: "cook",
      ingredients: [
        ing("4 cloves garlic", "produce"),
        ing("6 tbsp extra virgin olive oil", "store-cupboard"),
        ing("Small bunch flat-leaf parsley", "produce"),
      ],
      method: "Make sauce.",
    },
  ],
};

const recipeWithDupe = {
  title: "Dupe Test",
  serves: 2,
  stages: [
    {
      label: "Stage 1",
      phase: "cook",
      ingredients: [ing("2 tbsp olive oil", "store-cupboard")],
      method: "Fry.",
    },
    {
      label: "Stage 2",
      phase: "cook",
      ingredients: [
        ing("2 tbsp olive oil", "store-cupboard"), // exact duplicate
        ing("1 onion", "produce"),
      ],
      method: "Finish.",
    },
  ],
};

const recipeWithPrepPhase = {
  title: "Phased",
  serves: 4,
  stages: [
    {
      label: "Marinade",
      phase: "prep",
      ingredients: [
        ing("800g chicken thighs", "meat"),
        ing("150ml yoghurt", "dairy"),
      ],
      method: "Marinate.",
    },
    {
      label: "Cook",
      phase: "cook",
      ingredients: [
        ing("2 onions", "produce"),
        ing("2 tbsp oil", "store-cupboard"),
      ],
      method: "Cook.",
    },
  ],
};

const emptyStagesRecipe = {
  title: "Empty",
  serves: 2,
  stages: [
    { label: "Bake", phase: "cook", ingredients: [], method: "Bake." },
  ],
};

// ─── 4.1 flattenIngredients ────────────────────────────────────────────────────

describe("4.1 flattenIngredients()", () => {
  it("returns all ingredients from all stages", () => {
    const result = flattenIngredients(simpleRecipe);
    expect(result).toHaveLength(5);
  });

  it("includes ingredients from prep-phase stages", () => {
    const result = flattenIngredients(recipeWithPrepPhase);
    expect(result).toHaveLength(4);
  });

  it("returns empty array for recipe with only empty-ingredient stages", () => {
    expect(flattenIngredients(emptyStagesRecipe)).toHaveLength(0);
  });

  it("preserves ingredient order: stage 1 first, stage 2 second", () => {
    const result = flattenIngredients(simpleRecipe);
    expect(result[0].item).toBe("200g spaghetti");
    expect(result[2].item).toBe("4 cloves garlic");
  });
});

// ─── 4.2 deduplicateIngredients ───────────────────────────────────────────────

describe("4.2 deduplicateIngredients()", () => {
  it("removes exact duplicate item strings", () => {
    const flat = flattenIngredients(recipeWithDupe);
    expect(flat).toHaveLength(3); // 2 tbsp olive oil × 2, 1 onion
    const deduped = deduplicateIngredients(flat);
    expect(deduped).toHaveLength(2);
  });

  it("deduplication is case-insensitive", () => {
    const items = [
      ing("Salt to taste", "store-cupboard"),
      ing("salt to taste", "store-cupboard"),
    ];
    expect(deduplicateIngredients(items)).toHaveLength(1);
  });

  it("first occurrence is kept", () => {
    const items = [ing("200g spaghetti", "dry-goods"), ing("200g spaghetti", "dry-goods")];
    const result = deduplicateIngredients(items);
    expect(result[0].item).toBe("200g spaghetti");
  });

  it("does not merge different quantities of same ingredient", () => {
    const items = [
      ing("4 cloves garlic", "produce"),
      ing("3 cloves garlic", "produce"),
    ];
    expect(deduplicateIngredients(items)).toHaveLength(2);
  });

  it("returns empty array for empty input", () => {
    expect(deduplicateIngredients([])).toHaveLength(0);
  });

  it("returns single-item array unchanged", () => {
    const items = [ing("garlic", "produce")];
    expect(deduplicateIngredients(items)).toHaveLength(1);
  });
});

// ─── groupByCategory ──────────────────────────────────────────────────────────

describe("groupByCategory()", () => {
  it("groups items into correct categories", () => {
    const flat = flattenIngredients(simpleRecipe);
    const grouped = groupByCategory(flat);
    expect(grouped.get("produce")).toHaveLength(2);
    expect(grouped.get("dry-goods")).toHaveLength(1);
    expect(grouped.get("store-cupboard")).toHaveLength(2);
  });

  it("empty categories are present but empty", () => {
    const flat = flattenIngredients(simpleRecipe);
    const grouped = groupByCategory(flat);
    expect(grouped.get("meat")).toHaveLength(0);
    expect(grouped.get("fish")).toHaveLength(0);
  });

  it("all CATEGORY_ORDER keys are present in the map", () => {
    const grouped = groupByCategory([]);
    for (const cat of CATEGORY_ORDER) {
      expect(grouped.has(cat)).toBe(true);
    }
  });

  it("map iteration order follows CATEGORY_ORDER", () => {
    const flat = [
      ing("garlic", "produce"),
      ing("chicken", "meat"),
      ing("pasta", "dry-goods"),
    ];
    const grouped = groupByCategory(flat);
    const keys = [...grouped.keys()].filter((k) => grouped.get(k).length > 0);
    expect(keys).toEqual(["produce", "meat", "dry-goods"]);
  });
});

// ─── 4.3 Shopping list serves scaling (integration via renderShoppingList) ────

describe("4.3 Shopping list reflects scaled recipe", () => {
  it("scaled quantities appear in rendered output", () => {
    // Caller scales before passing — simulate by creating a pre-scaled recipe
    const scaledRecipe = {
      ...simpleRecipe,
      serves: 4,
      stages: simpleRecipe.stages.map((s) => ({
        ...s,
        ingredients: s.ingredients.map((i) =>
          i.item.startsWith("200g") ? { ...i, item: "400g spaghetti" } : i
        ),
      })),
    };
    const html = renderShoppingList(scaledRecipe);
    expect(html).toContain("400g spaghetti");
  });
});

// ─── renderShoppingList ────────────────────────────────────────────────────────

describe("renderShoppingList()", () => {
  it("renders all ingredients from all stages", () => {
    const html = renderShoppingList(simpleRecipe);
    expect(html).toContain("200g spaghetti");
    expect(html).toContain("4 cloves garlic");
    expect(html).toContain("Small bunch flat-leaf parsley");
  });

  it("renders category section headings", () => {
    const html = renderShoppingList(simpleRecipe);
    expect(html).toContain("Fruit &amp; Veg");
    expect(html).toContain("Dry Goods");
    expect(html).toContain("Store Cupboard");
  });

  it("does not render empty category sections", () => {
    const html = renderShoppingList(simpleRecipe);
    expect(html).not.toContain("Meat");
    expect(html).not.toContain("Fish");
  });

  it("deduplicates in rendered output", () => {
    const html = renderShoppingList(recipeWithDupe);
    // Count occurrences of the item string
    const count = (html.match(/2 tbsp olive oil/g) ?? []).length;
    expect(count).toBe(1);
  });

  it("renders empty-ingredient recipe without crashing", () => {
    expect(() => renderShoppingList(emptyStagesRecipe)).not.toThrow();
    const html = renderShoppingList(emptyStagesRecipe);
    expect(html).toContain("No ingredients found");
  });

  it("includes check button per ingredient", () => {
    const html = renderShoppingList(simpleRecipe);
    // 5 ingredients in simpleRecipe, no dupes → 5 check buttons
    const count = (html.match(/shopping-row__check/g) ?? []).length;
    expect(count).toBe(5);
  });

  it("escapes HTML in item strings", () => {
    const recipe = {
      ...simpleRecipe,
      stages: [
        {
          label: "S",
          phase: "cook",
          ingredients: [{ item: '<script>alert("xss")</script>', prep: null, category: "other" }],
          method: "m",
        },
      ],
    };
    const html = renderShoppingList(recipe);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

// ─── formatShoppingText ────────────────────────────────────────────────────────

describe("formatShoppingText()", () => {
  it("includes recipe title and serves on first line", () => {
    const text = formatShoppingText(simpleRecipe);
    expect(text).toContain("Simple");
    expect(text).toContain("serves 2");
  });

  it("includes category headings as section labels", () => {
    const text = formatShoppingText(simpleRecipe);
    expect(text).toContain("Fruit & Veg");
    expect(text).toContain("Dry Goods");
    expect(text).toContain("Store Cupboard");
  });

  it("indents each ingredient under its category", () => {
    const text = formatShoppingText(simpleRecipe);
    expect(text).toContain("  200g spaghetti");
    expect(text).toContain("  4 cloves garlic");
  });

  it("omits empty category sections", () => {
    const text = formatShoppingText(simpleRecipe);
    expect(text).not.toContain("Meat");
    expect(text).not.toContain("Fish");
  });

  it("deduplicates items in text output", () => {
    const text = formatShoppingText(recipeWithDupe);
    const count = (text.match(/2 tbsp olive oil/g) ?? []).length;
    expect(count).toBe(1);
  });

  it("returns a plain string with no HTML tags", () => {
    const text = formatShoppingText(simpleRecipe);
    expect(text).not.toMatch(/<[^>]+>/);
  });

  it("reflects scaled quantities when recipe is pre-scaled", () => {
    const scaledRecipe = {
      ...simpleRecipe,
      title: "Simple",
      serves: 4,
      stages: simpleRecipe.stages.map((s) => ({
        ...s,
        ingredients: s.ingredients.map((i) =>
          i.item.startsWith("200g") ? { ...i, item: "400g spaghetti" } : i
        ),
      })),
    };
    const text = formatShoppingText(scaledRecipe);
    expect(text).toContain("400g spaghetti");
    expect(text).not.toContain("200g spaghetti");
  });
});

