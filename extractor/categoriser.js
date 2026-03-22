/**
 * categoriser.js
 *
 * Infers a shopping category from a raw ingredient string.
 * Uses a keyword lookup table with specificity-based priority:
 * longer matches win over shorter ones, so "smoked salmon" → fish
 * rather than "smoked" matching store-cupboard first.
 *
 * Returns one of the schema enum values:
 *   produce | meat | fish | dairy | dry-goods | store-cupboard | bakery | other
 *
 * Designed to cover ~80% of common ingredient strings.
 * Unknown ingredients fall through to "other" for manual correction
 * in the recipe editor.
 */

export const CATEGORIES = [
  "produce",
  "meat",
  "fish",
  "dairy",
  "dry-goods",
  "store-cupboard",
  "bakery",
  "other",
];

/**
 * Keyword rules.
 *
 * Structure: { pattern: string | RegExp, category: string }
 *
 * - String patterns are matched as whole words (word-boundary aware), case-insensitive.
 * - RegExp patterns are used as-is (write your own boundaries).
 *
 * ORDER WITHIN THE ARRAY DOES NOT DETERMINE PRIORITY.
 * Priority is determined by match length (longer match wins).
 * List all terms here regardless of order.
 *
 * Add new terms freely. Prefer specific multi-word phrases over single words
 * where ambiguity exists (e.g. "smoked salmon" before "smoked").
 */
export const RULES = [
  // ── produce ──────────────────────────────────────────────────────────────
  { pattern: "onion", category: "produce" },
  { pattern: "shallot", category: "produce" },
  { pattern: "garlic", category: "produce" },
  { pattern: "ginger", category: "produce" },
  { pattern: "chilli", category: "produce" },
  { pattern: "chili", category: "produce" },
  { pattern: "pepper", category: "produce" },
  { pattern: "tomato", category: "produce" },
  { pattern: "tomatoes", category: "produce" },
  { pattern: "lemon", category: "produce" },
  { pattern: "lime", category: "produce" },
  { pattern: "orange", category: "produce" },
  { pattern: "lemon juice", category: "produce" },
  { pattern: "lime juice", category: "produce" },
  { pattern: "carrot", category: "produce" },
  { pattern: "celery", category: "produce" },
  { pattern: "courgette", category: "produce" },
  { pattern: "zucchini", category: "produce" },
  { pattern: "aubergine", category: "produce" },
  { pattern: "eggplant", category: "produce" },
  { pattern: "potato", category: "produce" },
  { pattern: "sweet potato", category: "produce" },
  { pattern: "spinach", category: "produce" },
  { pattern: "kale", category: "produce" },
  { pattern: "cabbage", category: "produce" },
  { pattern: "lettuce", category: "produce" },
  { pattern: "rocket", category: "produce" },
  { pattern: "watercress", category: "produce" },
  { pattern: "broccoli", category: "produce" },
  { pattern: "cauliflower", category: "produce" },
  { pattern: "leek", category: "produce" },
  { pattern: "fennel", category: "produce" },
  { pattern: "mushroom", category: "produce" },
  { pattern: "asparagus", category: "produce" },
  { pattern: "avocado", category: "produce" },
  { pattern: "cucumber", category: "produce" },
  { pattern: "cherry tomato", category: "produce" },
  { pattern: "cherry tomatoes", category: "produce" },
  { pattern: "spring onion", category: "produce" },
  { pattern: "parsley", category: "produce" },
  { pattern: "coriander", category: "produce" },
  { pattern: "basil", category: "produce" },
  { pattern: "mint", category: "produce" },
  { pattern: "thyme", category: "produce" },
  { pattern: "rosemary", category: "produce" },
  { pattern: "sage", category: "produce" },
  { pattern: "tarragon", category: "produce" },
  { pattern: "dill", category: "produce" },
  { pattern: "chives", category: "produce" },
  { pattern: "bay leaf", category: "produce" },
  { pattern: "bay leaves", category: "produce" },
  { pattern: "flat-leaf parsley", category: "produce" },
  { pattern: "fresh coriander", category: "produce" },
  { pattern: "fresh ginger", category: "produce" },
  { pattern: "apple", category: "produce" },
  { pattern: "pear", category: "produce" },
  { pattern: "banana", category: "produce" },
  { pattern: "mango", category: "produce" },
  { pattern: "pineapple", category: "produce" },
  { pattern: "grapes", category: "produce" },
  { pattern: "strawberr", category: "produce" },  // strawberry / strawberries
  { pattern: "raspberr", category: "produce" },
  { pattern: "blueberr", category: "produce" },
  { pattern: "blackberr", category: "produce" },

  // ── meat ─────────────────────────────────────────────────────────────────
  { pattern: "chicken", category: "meat" },
  { pattern: "chicken thigh", category: "meat" },
  { pattern: "chicken breast", category: "meat" },
  { pattern: "beef", category: "meat" },
  { pattern: "mince", category: "meat" },
  { pattern: "lamb", category: "meat" },
  { pattern: "pork", category: "meat" },
  { pattern: "pork belly", category: "meat" },
  { pattern: "pork shoulder", category: "meat" },
  { pattern: "bacon", category: "meat" },
  { pattern: "pancetta", category: "meat" },
  { pattern: "guanciale", category: "meat" },
  { pattern: "lardons", category: "meat" },
  { pattern: "chorizo", category: "meat" },
  { pattern: "salami", category: "meat" },
  { pattern: "prosciutto", category: "meat" },
  { pattern: "ham", category: "meat" },
  { pattern: "sausage", category: "meat" },
  { pattern: "duck", category: "meat" },
  { pattern: "turkey", category: "meat" },
  { pattern: "venison", category: "meat" },
  { pattern: "rabbit", category: "meat" },
  { pattern: "oxtail", category: "meat" },
  { pattern: "short rib", category: "meat" },
  { pattern: "brisket", category: "meat" },

  // ── fish ─────────────────────────────────────────────────────────────────
  { pattern: "salmon", category: "fish" },
  { pattern: "smoked salmon", category: "fish" },  // beats "smoked" alone
  { pattern: "cod", category: "fish" },
  { pattern: "haddock", category: "fish" },
  { pattern: "sea bass", category: "fish" },
  { pattern: "sea bream", category: "fish" },
  { pattern: "mackerel", category: "fish" },
  { pattern: "tuna", category: "fish" },
  { pattern: "sardine", category: "fish" },
  { pattern: "anchov", category: "fish" },  // anchovy / anchovies
  { pattern: "prawn", category: "fish" },
  { pattern: "shrimp", category: "fish" },
  { pattern: "scallop", category: "fish" },
  { pattern: "mussel", category: "fish" },
  { pattern: "clam", category: "fish" },
  { pattern: "squid", category: "fish" },
  { pattern: "crab", category: "fish" },
  { pattern: "lobster", category: "fish" },
  { pattern: "monkfish", category: "fish" },
  { pattern: "trout", category: "fish" },
  { pattern: "halibut", category: "fish" },
  { pattern: "plaice", category: "fish" },

  // ── dairy ─────────────────────────────────────────────────────────────────
  { pattern: "butter", category: "dairy" },
  { pattern: "milk", category: "dairy" },
  { pattern: "double cream", category: "dairy" },
  { pattern: "single cream", category: "dairy" },
  { pattern: "soured cream", category: "dairy" },
  { pattern: "sour cream", category: "dairy" },
  { pattern: "creme fraiche", category: "dairy" },
  { pattern: "crème fraîche", category: "dairy" },
  { pattern: "cream cheese", category: "dairy" },
  { pattern: "mascarpone", category: "dairy" },
  { pattern: "ricotta", category: "dairy" },
  { pattern: "parmesan", category: "dairy" },
  { pattern: "pecorino", category: "dairy" },
  { pattern: "cheddar", category: "dairy" },
  { pattern: "mozzarella", category: "dairy" },
  { pattern: "feta", category: "dairy" },
  { pattern: "halloumi", category: "dairy" },
  { pattern: "gruyere", category: "dairy" },
  { pattern: "gruyère", category: "dairy" },
  { pattern: "cheese", category: "dairy" },
  { pattern: "yoghurt", category: "dairy" },
  { pattern: "yogurt", category: "dairy" },
  { pattern: "egg", category: "dairy" },
  { pattern: "egg yolk", category: "dairy" },
  { pattern: "egg white", category: "dairy" },
  { pattern: "cream", category: "dairy" },

  // ── dry-goods ─────────────────────────────────────────────────────────────
  { pattern: "spaghetti", category: "dry-goods" },
  { pattern: "pasta", category: "dry-goods" },
  { pattern: "penne", category: "dry-goods" },
  { pattern: "rigatoni", category: "dry-goods" },
  { pattern: "tagliatelle", category: "dry-goods" },
  { pattern: "linguine", category: "dry-goods" },
  { pattern: "lasagne", category: "dry-goods" },
  { pattern: "rice", category: "dry-goods" },
  { pattern: "arborio", category: "dry-goods" },
  { pattern: "basmati", category: "dry-goods" },
  { pattern: "lentil", category: "dry-goods" },
  { pattern: "chickpea", category: "dry-goods" },
  { pattern: "kidney bean", category: "dry-goods" },
  { pattern: "black bean", category: "dry-goods" },
  { pattern: "cannellini", category: "dry-goods" },
  { pattern: "borlotti", category: "dry-goods" },
  { pattern: "flour", category: "dry-goods" },
  { pattern: "bread flour", category: "dry-goods" },
  { pattern: "plain flour", category: "dry-goods" },
  { pattern: "self-raising flour", category: "dry-goods" },
  { pattern: "semolina", category: "dry-goods" },
  { pattern: "polenta", category: "dry-goods" },
  { pattern: "oats", category: "dry-goods" },
  { pattern: "quinoa", category: "dry-goods" },
  { pattern: "couscous", category: "dry-goods" },
  { pattern: "noodle", category: "dry-goods" },
  { pattern: "yeast", category: "dry-goods" },
  { pattern: "baking powder", category: "dry-goods" },
  { pattern: "bicarbonate of soda", category: "dry-goods" },
  { pattern: "baking soda", category: "dry-goods" },
  { pattern: "cocoa powder", category: "dry-goods" },
  { pattern: "chocolate", category: "dry-goods" },
  { pattern: "sugar", category: "dry-goods" },
  { pattern: "caster sugar", category: "dry-goods" },
  { pattern: "brown sugar", category: "dry-goods" },
  { pattern: "icing sugar", category: "dry-goods" },
  { pattern: "almond", category: "dry-goods" },
  { pattern: "walnut", category: "dry-goods" },
  { pattern: "cashew", category: "dry-goods" },
  { pattern: "pine nut", category: "dry-goods" },
  { pattern: "pistachio", category: "dry-goods" },
  { pattern: "hazelnut", category: "dry-goods" },
  { pattern: "dried fruit", category: "dry-goods" },
  { pattern: "raisin", category: "dry-goods" },
  { pattern: "sultana", category: "dry-goods" },
  { pattern: "breadcrumb", category: "dry-goods" },

  // ── store-cupboard ────────────────────────────────────────────────────────
  { pattern: "olive oil", category: "store-cupboard" },
  { pattern: "extra virgin olive oil", category: "store-cupboard" },
  { pattern: "vegetable oil", category: "store-cupboard" },
  { pattern: "sunflower oil", category: "store-cupboard" },
  { pattern: "neutral oil", category: "store-cupboard" },
  { pattern: "sesame oil", category: "store-cupboard" },
  { pattern: "rapeseed oil", category: "store-cupboard" },
  { pattern: "salt", category: "store-cupboard" },
  { pattern: "flaky salt", category: "store-cupboard" },
  { pattern: "sea salt", category: "store-cupboard" },
  { pattern: "black pepper", category: "store-cupboard" },
  { pattern: "white pepper", category: "store-cupboard" },
  { pattern: "cumin", category: "store-cupboard" },
  { pattern: "cumin seeds", category: "store-cupboard" },
  { pattern: "coriander", category: "store-cupboard" },  // ground spice (vs fresh herb — fresh wins by specificity)
  { pattern: "ground coriander", category: "store-cupboard" },
  { pattern: "turmeric", category: "store-cupboard" },
  { pattern: "paprika", category: "store-cupboard" },
  { pattern: "smoked paprika", category: "store-cupboard" },
  { pattern: "garam masala", category: "store-cupboard" },
  { pattern: "cardamom", category: "store-cupboard" },
  { pattern: "cinnamon", category: "store-cupboard" },
  { pattern: "cloves", category: "store-cupboard" },
  { pattern: "star anise", category: "store-cupboard" },
  { pattern: "nutmeg", category: "store-cupboard" },
  { pattern: "chilli flakes", category: "store-cupboard" },
  { pattern: "chili flakes", category: "store-cupboard" },
  { pattern: "dried chilli", category: "store-cupboard" },
  { pattern: "cayenne", category: "store-cupboard" },
  { pattern: "bay", category: "store-cupboard" },
  { pattern: "vinegar", category: "store-cupboard" },
  { pattern: "red wine vinegar", category: "store-cupboard" },
  { pattern: "white wine vinegar", category: "store-cupboard" },
  { pattern: "balsamic", category: "store-cupboard" },
  { pattern: "soy sauce", category: "store-cupboard" },
  { pattern: "fish sauce", category: "store-cupboard" },
  { pattern: "worcestershire", category: "store-cupboard" },
  { pattern: "tabasco", category: "store-cupboard" },
  { pattern: "mustard", category: "store-cupboard" },
  { pattern: "dijon", category: "store-cupboard" },
  { pattern: "honey", category: "store-cupboard" },
  { pattern: "maple syrup", category: "store-cupboard" },
  { pattern: "tomato puree", category: "store-cupboard" },
  { pattern: "tomato paste", category: "store-cupboard" },
  { pattern: "tinned tomato", category: "store-cupboard" },
  { pattern: "tinned tomatoes", category: "store-cupboard" },
  { pattern: "chopped tomatoes", category: "store-cupboard" },
  { pattern: "stock", category: "store-cupboard" },
  { pattern: "chicken stock", category: "store-cupboard" },
  { pattern: "vegetable stock", category: "store-cupboard" },
  { pattern: "beef stock", category: "store-cupboard" },
  { pattern: "coconut milk", category: "store-cupboard" },
  { pattern: "coconut cream", category: "store-cupboard" },
  { pattern: "tahini", category: "store-cupboard" },
  { pattern: "miso", category: "store-cupboard" },
  { pattern: "wine", category: "store-cupboard" },
  { pattern: "white wine", category: "store-cupboard" },
  { pattern: "red wine", category: "store-cupboard" },
  { pattern: "water", category: "store-cupboard" },
  { pattern: "vanilla", category: "store-cupboard" },
  { pattern: "vanilla extract", category: "store-cupboard" },

  // ── bakery ────────────────────────────────────────────────────────────────
  { pattern: "bread", category: "bakery" },
  { pattern: "sourdough", category: "bakery" },
  { pattern: "baguette", category: "bakery" },
  { pattern: "pitta", category: "bakery" },
  { pattern: "pita", category: "bakery" },
  { pattern: "tortilla", category: "bakery" },
  { pattern: "flatbread", category: "bakery" },
  { pattern: "naan", category: "bakery" },
  { pattern: "brioche", category: "bakery" },
  { pattern: "croissant", category: "bakery" },
  { pattern: "pastry", category: "bakery" },
  { pattern: "puff pastry", category: "bakery" },
  { pattern: "shortcrust", category: "bakery" },
];

// ─── Matching engine ─────────────────────────────────────────────────────────

/**
 * Normalise a string: lowercase, collapse whitespace, remove leading quantities
 * e.g. "200g Strong White Bread Flour" → "strong white bread flour"
 *      "4 cloves garlic" → "cloves garlic"  (quantity stripped)
 *      "1 tsp ground cumin" → "ground cumin" (quantity + unit stripped)
 */
export function normalise(str) {
  return str
    .toLowerCase()
    .replace(/^\d[\d/.]*\s*(g|kg|ml|l|tsp|tbsp|cup|oz|lb|cloves?|sprigs?|bunches?|small|medium|large|handful|pinch|slice|slices|tin|tins|x)?\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Given a raw ingredient string, return the best-matching category.
 * "Best" = longest matched pattern string (specificity).
 * Falls back to "other" if no rule matches.
 *
 * @param {string} ingredientStr - Raw ingredient item, e.g. "150g guanciale"
 * @returns {string} - One of the CATEGORIES enum values
 */
export function categorise(ingredientStr) {
  const normalised = normalise(ingredientStr);

  let bestMatch = null;
  let bestLength = 0;

  for (const rule of RULES) {
    const pattern = rule.pattern;
    let matched = false;
    let matchLength = 0;

    if (pattern instanceof RegExp) {
      const m = normalised.match(pattern);
      if (m) {
        matched = true;
        matchLength = m[0].length;
      }
    } else {
      // String pattern: match as substring (word-boundary not enforced to handle
      // partial stems like "anchov" → anchovy/anchovies, "strawberr" → strawberries)
      const idx = normalised.indexOf(pattern.toLowerCase());
      if (idx !== -1) {
        matched = true;
        matchLength = pattern.length;
      }
    }

    if (matched && matchLength > bestLength) {
      bestLength = matchLength;
      bestMatch = rule.category;
    }
  }

  return bestMatch ?? "other";
}
