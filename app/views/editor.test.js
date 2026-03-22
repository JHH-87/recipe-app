import { describe, it, expect } from "vitest";
import {
  buildEmptyRecipe,
  buildEmptyStage,
  buildEmptyIngredient,
  validateRecipe,
  renderEditorForm,
  mergeRecipes,
} from "./editor.js";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

function validRecipe(overrides = {}) {
  return {
    title: "Test Recipe",
    serves: 2,
    stages: [
      {
        label: "Stage 1",
        phase: "cook",
        ingredients: [
          { item: "200g pasta", prep: null, category: "dry-goods" },
        ],
        method: "Cook the pasta.",
      },
    ],
    ...overrides,
  };
}

// ─── buildEmptyRecipe ─────────────────────────────────────────────────────────

describe("buildEmptyRecipe()", () => {
  it("returns an object with title, serves, stages", () => {
    const r = buildEmptyRecipe();
    expect(r).toHaveProperty("title");
    expect(r).toHaveProperty("serves");
    expect(r).toHaveProperty("stages");
  });

  it("starts with one stage", () => {
    expect(buildEmptyRecipe().stages).toHaveLength(1);
  });

  it("serves defaults to 4", () => {
    expect(buildEmptyRecipe().serves).toBe(4);
  });

  it("title is empty string", () => {
    expect(buildEmptyRecipe().title).toBe("");
  });

  it("each call returns a distinct object (no shared references)", () => {
    const a = buildEmptyRecipe();
    const b = buildEmptyRecipe();
    a.title = "Modified";
    expect(b.title).toBe("");
  });
});

// ─── buildEmptyStage ──────────────────────────────────────────────────────────

describe("buildEmptyStage()", () => {
  it("sets label to 'Stage N' (1-indexed)", () => {
    expect(buildEmptyStage(0).label).toBe("Stage 1");
    expect(buildEmptyStage(2).label).toBe("Stage 3");
  });

  it("defaults phase to 'cook'", () => {
    expect(buildEmptyStage(0).phase).toBe("cook");
  });

  it("starts with one empty ingredient", () => {
    expect(buildEmptyStage(0).ingredients).toHaveLength(1);
  });

  it("method is empty string", () => {
    expect(buildEmptyStage(0).method).toBe("");
  });
});

// ─── buildEmptyIngredient ─────────────────────────────────────────────────────

describe("buildEmptyIngredient()", () => {
  it("has item, prep, category fields", () => {
    const ing = buildEmptyIngredient();
    expect(ing).toHaveProperty("item");
    expect(ing).toHaveProperty("prep");
    expect(ing).toHaveProperty("category");
  });

  it("item is empty string", () => {
    expect(buildEmptyIngredient().item).toBe("");
  });

  it("prep is null", () => {
    expect(buildEmptyIngredient().prep).toBeNull();
  });

  it("category defaults to 'other'", () => {
    expect(buildEmptyIngredient().category).toBe("other");
  });
});

// ─── 5.1 validateRecipe — empty form fails with correct errors ─────────────────

describe("5.1 validateRecipe() — empty recipe fails with messages", () => {
  it("empty title produces error mentioning title", () => {
    const { valid, errors } = validateRecipe(validRecipe({ title: "" }));
    expect(valid).toBe(false);
    expect(errors.some((e) => /title/i.test(e))).toBe(true);
  });

  it("serves: 0 produces error", () => {
    const { errors } = validateRecipe(validRecipe({ serves: 0 }));
    expect(errors.some((e) => /serves/i.test(e))).toBe(true);
  });

  it("serves: -1 produces error", () => {
    const { errors } = validateRecipe(validRecipe({ serves: -1 }));
    expect(errors.some((e) => /serves/i.test(e))).toBe(true);
  });

  it("serves: 2.5 (float) produces error", () => {
    const { errors } = validateRecipe(validRecipe({ serves: 2.5 }));
    expect(errors.some((e) => /serves/i.test(e))).toBe(true);
  });

  it("empty stages array produces error", () => {
    const { valid, errors } = validateRecipe(validRecipe({ stages: [] }));
    expect(valid).toBe(false);
    expect(errors.some((e) => /stage/i.test(e))).toBe(true);
  });

  it("missing stage label produces error", () => {
    const recipe = validRecipe();
    recipe.stages[0].label = "";
    const { errors } = validateRecipe(recipe);
    expect(errors.some((e) => /label/i.test(e))).toBe(true);
  });

  it("missing stage method produces error", () => {
    const recipe = validRecipe();
    recipe.stages[0].method = "";
    const { errors } = validateRecipe(recipe);
    expect(errors.some((e) => /method/i.test(e))).toBe(true);
  });

  it("missing ingredient item produces error", () => {
    const recipe = validRecipe();
    recipe.stages[0].ingredients[0].item = "";
    const { errors } = validateRecipe(recipe);
    expect(errors.some((e) => /item/i.test(e))).toBe(true);
  });

  it("invalid category produces error", () => {
    const recipe = validRecipe();
    recipe.stages[0].ingredients[0].category = "spices";
    const { errors } = validateRecipe(recipe);
    expect(errors.some((e) => /category/i.test(e))).toBe(true);
  });

  it("fully empty recipe produces multiple errors", () => {
    const { errors } = validateRecipe({ title: "", serves: 0, stages: [] });
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── 5.2 validateRecipe — valid recipe passes ─────────────────────────────────

describe("5.2 validateRecipe() — valid recipe passes", () => {
  it("well-formed recipe is valid", () => {
    const { valid, errors } = validateRecipe(validRecipe());
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it("recipe with prep phase stage is valid", () => {
    const recipe = validRecipe({
      stages: [
        {
          label: "Marinade",
          phase: "prep",
          timing: "2 hours",
          ingredients: [{ item: "800g chicken", prep: "cube", category: "meat" }],
          method: "Marinate.",
        },
        {
          label: "Cook",
          phase: "cook",
          ingredients: [{ item: "2 tbsp oil", prep: null, category: "store-cupboard" }],
          method: "Fry.",
        },
      ],
    });
    expect(validateRecipe(recipe).valid).toBe(true);
  });

  it("recipe with empty ingredients array on a stage is valid", () => {
    const recipe = validRecipe({
      stages: [
        { label: "Bake", phase: "cook", ingredients: [], method: "Bake 25 min." },
      ],
    });
    expect(validateRecipe(recipe).valid).toBe(true);
  });

  it("recipe with null notes field is valid", () => {
    expect(validateRecipe(validRecipe({ notes: undefined })).valid).toBe(true);
  });
});

// ─── 5.3 Stage count ─────────────────────────────────────────────────────────

describe("5.3 Stage count (via buildEmptyStage / builder logic)", () => {
  it("adding a stage increases count", () => {
    const recipe = buildEmptyRecipe();
    expect(recipe.stages).toHaveLength(1);
    recipe.stages.push(buildEmptyStage(1));
    expect(recipe.stages).toHaveLength(2);
  });

  it("removing a stage decreases count", () => {
    const recipe = buildEmptyRecipe();
    recipe.stages.push(buildEmptyStage(1));
    recipe.stages.splice(0, 1);
    expect(recipe.stages).toHaveLength(1);
  });

  it("removing the only stage still validates as error", () => {
    const recipe = buildEmptyRecipe();
    recipe.title = "Test";
    recipe.stages = [];
    const { valid } = validateRecipe(recipe);
    expect(valid).toBe(false);
  });
});

// ─── 5.4 prep field handling ──────────────────────────────────────────────────

describe("5.4 prep field is null when absent, not missing", () => {
  it("buildEmptyIngredient().prep is null", () => {
    expect(buildEmptyIngredient().prep).toBeNull();
  });

  it("validateRecipe accepts prep: null", () => {
    const recipe = validRecipe();
    recipe.stages[0].ingredients[0].prep = null;
    expect(validateRecipe(recipe).valid).toBe(true);
  });

  it("validateRecipe accepts prep as non-empty string", () => {
    const recipe = validRecipe();
    recipe.stages[0].ingredients[0].prep = "finely dice";
    expect(validateRecipe(recipe).valid).toBe(true);
  });

  it("validateRecipe accepts prep: undefined (treated as absent)", () => {
    const recipe = validRecipe();
    delete recipe.stages[0].ingredients[0].prep;
    // Schema allows prep to be absent — validator should not error on this
    expect(validateRecipe(recipe).valid).toBe(true);
  });
});

// ─── 5.5 Phase toggle ─────────────────────────────────────────────────────────

describe("5.5 phase toggle sets correct value", () => {
  it("buildEmptyStage phase is 'cook' by default", () => {
    expect(buildEmptyStage(0).phase).toBe("cook");
  });

  it("validateRecipe accepts phase: 'prep'", () => {
    const recipe = validRecipe();
    recipe.stages[0].phase = "prep";
    expect(validateRecipe(recipe).valid).toBe(true);
  });

  it("validateRecipe accepts phase: 'cook'", () => {
    const recipe = validRecipe();
    recipe.stages[0].phase = "cook";
    expect(validateRecipe(recipe).valid).toBe(true);
  });

  it("validateRecipe rejects invalid phase value", () => {
    const recipe = validRecipe();
    recipe.stages[0].phase = "bake";
    const { valid, errors } = validateRecipe(recipe);
    expect(valid).toBe(false);
    expect(errors.some((e) => /phase/i.test(e))).toBe(true);
  });
});

// ─── renderEditorForm ─────────────────────────────────────────────────────────

describe("renderEditorForm()", () => {
  it("renders title input with existing value", () => {
    const html = renderEditorForm(validRecipe());
    expect(html).toContain('value="Test Recipe"');
  });

  it("renders serves input with correct value", () => {
    const html = renderEditorForm(validRecipe());
    expect(html).toContain('value="2"');
  });

  it("renders stage fields for each stage", () => {
    const recipe = validRecipe({
      stages: [
        { label: "One", phase: "cook", ingredients: [], method: "Do one." },
        { label: "Two", phase: "cook", ingredients: [], method: "Do two." },
      ],
    });
    const html = renderEditorForm(recipe);
    expect(html).toContain("Stage 1");
    expect(html).toContain("Stage 2");
  });

  it("renders ingredient item values", () => {
    const html = renderEditorForm(validRecipe());
    expect(html).toContain("200g pasta");
  });

  it("renders 'Add recipe' button for new recipe", () => {
    const html = renderEditorForm(buildEmptyRecipe());
    expect(html).toContain("Add recipe");
  });

  it("renders 'Save changes' button for edit mode", () => {
    const html = renderEditorForm(validRecipe(), { isEdit: true });
    expect(html).toContain("Save changes");
  });

  it("active phase button reflects current phase", () => {
    const prepRecipe = validRecipe();
    prepRecipe.stages[0].phase = "prep";
    const html = renderEditorForm(prepRecipe);
    // Prep button should have active class
    expect(html).toMatch(/phase-toggle__btn--active[^>]*>[\s\S]*?Prep/);
  });

  it("escapes HTML in recipe title", () => {
    const recipe = validRecipe({ title: '<script>xss</script>' });
    const html = renderEditorForm(recipe);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders remove-stage button only when more than one stage", () => {
    const oneStage = renderEditorForm(buildEmptyRecipe()); // 1 stage
    expect(oneStage).not.toContain("remove-stage-btn");

    const twoStages = renderEditorForm(validRecipe({
      stages: [
        { label: "A", phase: "cook", ingredients: [], method: "A." },
        { label: "B", phase: "cook", ingredients: [], method: "B." },
      ],
    }));
    expect(twoStages).toContain("remove-stage-btn");
  });
});

// ─── mergeRecipes ─────────────────────────────────────────────────────────────

describe("mergeRecipes()", () => {
  const base = [
    { title: "Focaccia",  serves: 8,  stages: [] },
    { title: "Pasta",     serves: 2,  stages: [] },
  ];

  it("returns base recipes unchanged when no user recipes", () => {
    expect(mergeRecipes(base, [])).toEqual(base);
  });

  it("appends new user recipe not in base", () => {
    const user = [{ title: "New Dish", serves: 4, stages: [] }];
    const result = mergeRecipes(base, user);
    expect(result).toHaveLength(3);
    expect(result.some((r) => r.title === "New Dish")).toBe(true);
  });

  it("user recipe overrides base recipe with same title", () => {
    const user = [{ title: "Focaccia", serves: 12, stages: [] }];
    const result = mergeRecipes(base, user);
    const focaccia = result.find((r) => r.title === "Focaccia");
    expect(focaccia.serves).toBe(12);
    expect(result).toHaveLength(2); // no duplicate
  });

  it("match is case-insensitive", () => {
    const user = [{ title: "FOCACCIA", serves: 12, stages: [] }];
    const result = mergeRecipes(base, user);
    expect(result).toHaveLength(2); // matched, not appended
  });

  it("does not mutate the base array", () => {
    const user = [{ title: "New", serves: 1, stages: [] }];
    mergeRecipes(base, user);
    expect(base).toHaveLength(2);
  });

  it("multiple user recipes are all applied", () => {
    const user = [
      { title: "New One", serves: 2, stages: [] },
      { title: "New Two", serves: 4, stages: [] },
    ];
    const result = mergeRecipes(base, user);
    expect(result).toHaveLength(4);
  });
});

// ─── 5.6 Integration: editor output renders in all three views ─────────────────

describe("5.6 Integration: recipe from editor is renderable in all views", () => {
  // Simulates what happens after save: a recipe from validateRecipe goes through
  // each view's render function without throwing.

  const editorRecipe = {
    title: "Editor Test Recipe",
    serves: 2,
    stages: [
      {
        label: "Prep",
        phase: "prep",
        timing: "30 minutes",
        ingredients: [
          { item: "500g chicken thighs", prep: "cube", category: "meat" },
        ],
        method: "Marinate the chicken.",
      },
      {
        label: "Cook",
        phase: "cook",
        timing: "20 minutes",
        ingredients: [
          { item: "2 onions", prep: "finely dice", category: "produce" },
          { item: "2 tbsp oil", prep: null, category: "store-cupboard" },
        ],
        method: "Fry onions until golden. Add chicken and cook through.",
      },
    ],
  };

  it("recipe passes validation", () => {
    expect(validateRecipe(editorRecipe).valid).toBe(true);
  });

  it("shopping view renders without throwing", async () => {
    const { renderShoppingList } = await import("./shopping.js");
    expect(() => renderShoppingList(editorRecipe)).not.toThrow();
  });

  it("mise view renders without throwing", async () => {
    const { renderMiseEnPlace } = await import("./mise.js");
    expect(() => renderMiseEnPlace(editorRecipe)).not.toThrow();
  });

  it("cook view renders without throwing", async () => {
    const { renderCookView } = await import("./cook.js");
    expect(() => renderCookView(editorRecipe, 0)).not.toThrow();
  });

  it("shopping view contains all ingredients", async () => {
    const { renderShoppingList } = await import("./shopping.js");
    const html = renderShoppingList(editorRecipe);
    expect(html).toContain("500g chicken thighs");
    expect(html).toContain("2 onions");
    expect(html).toContain("2 tbsp oil");
  });

  it("mise view shows prep action", async () => {
    const { renderMiseEnPlace } = await import("./mise.js");
    const html = renderMiseEnPlace(editorRecipe);
    expect(html).toContain("cube");
    expect(html).toContain("finely dice");
  });

  it("cook view shows only cook stage", async () => {
    const { renderCookView } = await import("./cook.js");
    const html = renderCookView(editorRecipe, 0);
    expect(html).toContain("Fry onions");
    expect(html).not.toContain("Marinate"); // prep stage excluded
  });
});

// ─── 5.7 Integration: edit existing recipe produces valid output ───────────────

describe("5.7 Integration: editing an existing recipe produces valid output", () => {
  it("modifying a base recipe field still validates", () => {
    const base = {
      title: "Focaccia",
      serves: 8,
      stages: [
        {
          label: "Dough",
          phase: "prep",
          ingredients: [{ item: "500g flour", prep: null, category: "dry-goods" }],
          method: "Make dough.",
        },
      ],
    };

    // Simulate edit: change serves and add a stage
    const edited = structuredClone(base);
    edited.serves = 12;
    edited.stages.push({
      label: "Bake",
      phase: "cook",
      ingredients: [],
      method: "Bake 25 min at 220°C.",
    });

    const { valid } = validateRecipe(edited);
    expect(valid).toBe(true);
    expect(edited.serves).toBe(12);
    expect(edited.stages).toHaveLength(2);
  });

  it("mergeRecipes correctly replaces existing recipe after edit", () => {
    const base = [{ title: "Focaccia", serves: 8, stages: [] }];
    const edited = { title: "Focaccia", serves: 12, stages: [] };
    const merged = mergeRecipes(base, [edited]);
    expect(merged).toHaveLength(1);
    expect(merged[0].serves).toBe(12);
  });
});
