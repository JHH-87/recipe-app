/**
 * data.js
 *
 * Data layer for the recipe PWA.
 *
 * Design: pure functions accept a recipes array as their first argument.
 * This makes them fully testable without mocking fetch.
 * The async loadRecipes() function is the only side-effectful export
 * and is not unit tested directly.
 *
 * Usage in app:
 *   import { loadRecipes, findByTitle, scaleIngredients } from './data.js';
 *   const recipes = await loadRecipes();
 *   const recipe  = findByTitle(recipes, 'Focaccia');
 *
 * Usage in tests:
 *   import { findByTitle, scaleIngredients } from './data.js';
 *   const result = findByTitle(testRecipes, 'Focaccia');
 */

// ─── Loader ───────────────────────────────────────────────────────────────────

/**
 * Fetch and return the recipes array from the data file.
 * Not unit tested — tested via integration test 3.7.
 *
 * @returns {Promise<Array>}
 */
export async function loadRecipes() {
  const response = await fetch("/data/recipes.json");
  if (!response.ok) {
    throw new Error(`Failed to load recipes: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Return all recipes.
 * Thin wrapper — exists so the calling code doesn't need to know about
 * the array structure, and to give a named entry point for future filtering.
 *
 * @param {Array} recipes
 * @returns {Array}
 */
export function getRecipes(recipes) {
  return recipes;
}

/**
 * Find a recipe by exact title match (case-insensitive).
 * Returns null if not found.
 *
 * @param {Array} recipes
 * @param {string} title
 * @returns {object | null}
 */
export function findByTitle(recipes, title) {
  if (!title) return null;
  const needle = title.toLowerCase();
  return recipes.find((r) => r.title.toLowerCase() === needle) ?? null;
}

/**
 * Convert a recipe title to a URL slug.
 * "Chicken Tikka Masala" → "chicken-tikka-masala"
 *
 * @param {string} title
 * @returns {string}
 */
export function titleToSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Find a recipe by its URL slug.
 * Returns null if not found.
 *
 * @param {Array} recipes
 * @param {string} slug
 * @returns {object | null}
 */
export function findBySlug(recipes, slug) {
  if (!slug) return null;
  return recipes.find((r) => titleToSlug(r.title) === slug) ?? null;
}

// ─── Scaling ──────────────────────────────────────────────────────────────────

/**
 * Parse a numeric quantity from the start of an ingredient string.
 * Handles integers ("200"), decimals ("1.5"), simple fractions ("1/2").
 * Returns { value: number, rest: string } or null if no leading number.
 *
 * @param {string} str
 * @returns {{ value: number, rest: string } | null}
 */
export function parseLeadingQuantity(str) {
  // Match: optional integer + optional fraction or decimal part
  const match = str.match(/^(\d+(?:[./]\d+)?)(.*)/s);
  if (!match) return null;

  const raw = match[1];
  const rest = match[2];

  let value;
  if (raw.includes("/")) {
    const [num, den] = raw.split("/");
    value = parseInt(num, 10) / parseInt(den, 10);
  } else {
    value = parseFloat(raw);
  }

  if (isNaN(value)) return null;
  return { value, rest };
}

/**
 * Format a scaled number back to a clean string.
 * - Integers are left as integers: 400, not 400.0
 * - Values < 10 are rounded to 1 decimal place: 1.5, not 1.500
 * - Values >= 10 are rounded to nearest integer: 13, not 12.5
 *
 * @param {number} value
 * @returns {string}
 */
export function formatQuantity(value) {
  if (Number.isInteger(value)) return value.toString();
  if (value < 10) return parseFloat(value.toFixed(1)).toString();
  return Math.round(value).toString();
}

/**
 * Scale the leading numeric quantity in an ingredient item string.
 * Non-numeric strings (e.g. "Salt to taste") are returned unchanged.
 *
 * @param {string} itemStr - e.g. "200g spaghetti"
 * @param {number} multiplier - e.g. 2 for double
 * @returns {string}
 */
export function scaleItemString(itemStr, multiplier) {
  if (multiplier === 1) return itemStr;
  const parsed = parseLeadingQuantity(itemStr);
  if (!parsed) return itemStr;
  const scaled = parsed.value * multiplier;
  return formatQuantity(scaled) + parsed.rest;
}

/**
 * Return a new recipe with all ingredient quantities scaled by multiplier.
 * The original recipe is not mutated.
 * The serves field is updated proportionally.
 *
 * @param {object} recipe
 * @param {number} multiplier - ratio: 0.5 = half, 2 = double
 * @returns {object}
 */
export function scaleIngredients(recipe, multiplier) {
  if (multiplier === 1) return recipe;

  return {
    ...recipe,
    serves: Math.round(recipe.serves * multiplier),
    stages: recipe.stages.map((stage) => ({
      ...stage,
      ingredients: stage.ingredients.map((ing) => ({
        ...ing,
        item: scaleItemString(ing.item, multiplier),
      })),
    })),
  };
}

/**
 * Compute the multiplier needed to scale a recipe from its base serves
 * to a target serves count.
 *
 * @param {object} recipe
 * @param {number} targetServes
 * @returns {number}
 */
export function servesMultiplier(recipe, targetServes) {
  if (!recipe.serves || recipe.serves === 0) return 1;
  return targetServes / recipe.serves;
}
