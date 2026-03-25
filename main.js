/**
 * main.js
 *
 * Router and view orchestrator for the recipe PWA.
 *
 * Routes:
 *   #/                    → recipe list
 *   #/recipe/:slug        → recipe detail (Shopping / Mise / Cook tabs)
 *
 * State managed here:
 *   recipes        - loaded once at init
 *   currentServes  - user-adjusted serves for current recipe
 *   currentStep    - current cook step index (0-based)
 */

import {
  loadRecipes,
  getRecipes,
  findBySlug,
  titleToSlug,
  scaleIngredients,
  servesMultiplier,
} from "./data.js";

import { renderShoppingList, bindShoppingEvents } from "./views/shopping.js";
import { renderCookView, bindCookEvents, clearActiveTimer } from "./views/cook.js";
import { renderEditorForm, bindEditorEvents, buildEmptyRecipe, loadUserRecipes, mergeRecipes, deleteUserRecipe } from "./views/editor.js";
import { renderProcessFlow } from "./views/flow.js";
import {
  hasFileSystemAccess,
  openFileWithPicker,
  saveToFileHandle,
  downloadJson,
  readUploadedFile,
} from "./storage.js";

// ─── State ────────────────────────────────────────────────────────────────────

let recipes      = [];
let currentServes = null;
let currentStep   = 0;
let currentSlug   = null; // track which recipe is open to detect navigation
let cloudFileHandle = null; // FileSystemFileHandle if user opened a cloud file
let shopSubMode = "shop"; // shopping sub-mode: 'shop' | 'phase'

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function init() {
  // Apply saved theme before render to avoid flash
  if (localStorage.getItem("theme") === "basic") {
    document.body.classList.add("theme-basic");
  }

  try {
    const base = await loadRecipes();
    recipes = mergeRecipes(base, loadUserRecipes());
  } catch (err) {
    document.getElementById("app-root").innerHTML = renderError(err.message);
    return;
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("sw.js")
      .catch((err) => console.warn("SW registration failed:", err));
  }

  window.addEventListener("hashchange", route);
  route();
}

// ─── Router ───────────────────────────────────────────────────────────────────

function route() {
  const hash = window.location.hash || "#/";
  const root = document.getElementById("app-root");

  const recipeMatch = hash.match(/^#\/recipe\/([^?/]+)/);
  if (recipeMatch) {
    const slug = recipeMatch[1];
    const recipe = findBySlug(recipes, slug);
    if (!recipe) {
      root.innerHTML = renderError(`Recipe "${slug}" not found.`);
      return;
    }

    // Reset per-recipe state when navigating to a different recipe
    if (slug !== currentSlug) {
      currentServes = recipe.serves;
      currentStep   = 0;
      currentSlug   = slug;
      shopSubMode   = "shop";
      clearActiveTimer();
    }

    const mode = getMode(hash);
    const qs2 = new URLSearchParams((hash.split("?")[1] || ""));
    const stepParam = qs2.get("step");
    const subModeParam = qs2.get("submode");
    if (stepParam !== null) currentStep = Math.max(0, parseInt(stepParam, 10) || 0);
    if (subModeParam) shopSubMode = subModeParam;
    renderDetailView(recipe, mode, root);
    return;
  }

  // Sync panel
  if (hash === '#/sync') {
    root.innerHTML = renderSyncPanel();
    bindSyncEvents(root);
    return;
  }

  // Editor — new recipe
  if (hash === '#/editor') {
    root.innerHTML = renderEditorPage(null);
    bindEditorPage(null, root);
    return;
  }

  // Editor — edit existing recipe
  const editMatch = hash.match(/^#\/editor\/([^?/]+)/);
  if (editMatch) {
    const recipe = findBySlug(recipes, editMatch[1]);
    root.innerHTML = renderEditorPage(recipe);
    bindEditorPage(recipe, root);
    return;
  }

  // Recipe list
  currentSlug   = null;
  currentServes = null;
  currentStep   = 0;
  clearActiveTimer();
  root.innerHTML = renderList(getRecipes(recipes));
  bindThemeToggle(root);
}

function getMode(hash) {
  const qs = hash.split("?")[1] || "";
  return new URLSearchParams(qs).get("mode") || "flow";
}

// ─── List view ────────────────────────────────────────────────────────────────

function renderList(recipeList) {
  if (recipeList.length === 0) {
    return `<div class="empty-state"><p>No recipes yet.</p></div>`;
  }

  const items = recipeList.map((r) => `
    <div class="recipe-card-wrapper">
      <a class="recipe-card" href="#/recipe/${titleToSlug(r.title)}">
        <span class="recipe-card__title">${escHtml(r.title)}</span>
        <span class="recipe-card__meta">Serves ${r.serves}</span>
        <span class="recipe-card__arrow" aria-hidden="true">→</span>
      </a>
      <a class="recipe-card__edit" href="#/editor/${titleToSlug(r.title)}" aria-label="Edit ${escHtml(r.title)}">✏</a>
    </div>`).join("");

  return `
    <header class="page-header">
      <h1 class="page-header__title">Recipes</h1>
      <div class="page-header__tools">
        <button class="theme-toggle-btn" id="theme-toggle" aria-label="Toggle basic format">
          ${document.body.classList.contains("theme-basic") ? "🎨" : "Aa"}
        </button>
        <a class="sync-btn" href="#/sync" aria-label="Sync &amp; storage settings">⚙</a>
      </div>
    </header>
    <main class="recipe-list">${items}<a class="add-recipe-btn" href="#/editor">+ New recipe</a></main>`;
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function renderDetailView(recipe, mode, root) {
  const scaled = scaleIngredients(
    recipe,
    servesMultiplier(recipe, currentServes ?? recipe.serves)
  );

  const tabs = ["shopping", "detail", "flow"].map((m) => `
    <button
      class="mode-tab ${m === mode ? "mode-tab--active" : ""}"
      data-mode="${m}"
      aria-selected="${m === mode}"
    >${tabLabel(m)}</button>`).join("");

  const panel = renderModePanel(scaled, mode);

  root.innerHTML = `
    <header class="detail-header">
      <a class="back-btn" href="#/" aria-label="Back to recipes">←</a>
      <div class="detail-header__text">
        <h1 class="detail-header__title">${escHtml(recipe.title)}</h1>
        <div class="serves-control">
          <button class="serves-btn" data-delta="-1" aria-label="Decrease serves">−</button>
          <span class="serves-label">Serves <strong id="serves-count">${currentServes ?? recipe.serves}</strong></span>
          <button class="serves-btn" data-delta="1" aria-label="Increase serves">+</button>
        </div>
      </div>
      <div class="detail-header__actions">
        <a class="detail-action-btn" href="#/editor/${titleToSlug(recipe.title)}" aria-label="Edit recipe">✏</a>
        <button class="detail-action-btn detail-action-btn--delete" id="delete-recipe-btn" aria-label="Delete recipe">🗑</button>
      </div>
    </header>
    <nav class="mode-tabs" role="tablist" aria-label="Recipe modes">${tabs}</nav>
    <main class="detail-content" id="mode-panel">${panel}</main>`;

  bindDetailEvents(recipe, scaled, mode, root);
}

function tabLabel(mode) {
  return { shopping: "Shopping", detail: "Detail", flow: "Flow" }[mode];
}

// ─── Mode panel ───────────────────────────────────────────────────────────────

function renderModePanel(scaledRecipe, mode) {
  switch (mode) {
    case "shopping": return renderShoppingList(scaledRecipe, shopSubMode);
    case "detail":   return renderCookView(scaledRecipe, currentStep);
    case "flow":     return renderProcessFlow(scaledRecipe, currentSlug);
    default:         return renderShoppingList(scaledRecipe);
  }
}

// ─── Event binding ────────────────────────────────────────────────────────────

function bindDetailEvents(recipe, scaled, mode, root) {
  // Mode tabs
  document.querySelectorAll(".mode-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const slug = titleToSlug(recipe.title);
      window.location.hash = `#/recipe/${slug}?mode=${btn.dataset.mode}`;
    });
  });

  // Serves adjustment
  document.querySelectorAll(".serves-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const delta = parseInt(btn.dataset.delta, 10);
      currentServes = Math.max(1, (currentServes ?? recipe.serves) + delta);
      renderDetailView(recipe, mode, root);
    });
  });

  // Delete recipe
  document.getElementById("delete-recipe-btn")?.addEventListener("click", () => {
    if (!confirm(`Delete "${recipe.title}"? This cannot be undone.`)) return;
    deleteUserRecipe(recipe.title);
    // Remove from in-memory array
    recipes = recipes.filter((r) => r.title !== recipe.title);
    window.location.hash = "#/";
  });

  // Mode-specific bindings
  if (mode === "shopping") {
    bindShoppingEvents(scaled, (newSubMode) => {
      shopSubMode = newSubMode;
      renderDetailView(recipe, mode, root);
    });
  }

  if (mode === "detail") {
    bindCookEvents(recipe, currentStep, (newStep) => {
      currentStep = newStep;
      renderDetailView(recipe, mode, root);
    });
  }
}


// ─── Editor page ──────────────────────────────────────────────────────────────

function renderEditorPage(recipe) {
  const isEdit = recipe != null;
  const seed   = recipe ? structuredClone(recipe) : buildEmptyRecipe();
  const heading = isEdit ? `Edit: ${escHtml(recipe.title)}` : "New recipe";

  return `
    <header class="detail-header">
      <a class="back-btn" href="#/" aria-label="Back to recipes">←</a>
      <div class="detail-header__text">
        <h1 class="detail-header__title">${heading}</h1>
      </div>
    </header>
    <main class="editor-content">
      ${renderEditorForm(seed, { isEdit })}
    </main>`;
}

function bindEditorPage(recipe, root) {
  const isEdit = recipe != null;
  const seed   = recipe ? structuredClone(recipe) : buildEmptyRecipe();

  bindEditorEvents(
    seed,
    // onSave
    (saved) => {
      // Merge saved recipe into in-memory recipes array
      recipes = mergeRecipes(
        recipes.filter((r) => r.title.toLowerCase() !== saved.title.toLowerCase()),
        [saved]
      );
      // Navigate to the saved recipe
      window.location.hash = `#/recipe/${titleToSlug(saved.title)}`;
    },
    // onNavigate — re-render editor with updated draft
    (draft) => {
      root.innerHTML = renderEditorPage(draft);
      bindEditorPage(draft, root);
    }
  );
}



// ─── Theme toggle ─────────────────────────────────────────────────────────────

function bindThemeToggle(root) {
  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const isBasic = document.body.classList.toggle("theme-basic");
    localStorage.setItem("theme", isBasic ? "basic" : "default");
    root.innerHTML = renderList(getRecipes(recipes));
    bindThemeToggle(root);
  });
}

// ─── Sync panel ───────────────────────────────────────────────────────────────

function renderSyncPanel() {
  const fsa = hasFileSystemAccess();
  const cloudStatus = cloudFileHandle
    ? `<span class="sync-status sync-status--ok">Connected: ${escHtml(cloudFileHandle.name)}</span>`
    : `<span class="sync-status sync-status--none">No cloud file connected</span>`;

  return `
    <header class="detail-header">
      <a class="back-btn" href="#/" aria-label="Back to recipes">←</a>
      <div class="detail-header__text">
        <h1 class="detail-header__title">Sync &amp; Storage</h1>
      </div>
    </header>
    <main class="sync-content">

      <section class="sync-section">
        <h2 class="sync-section__heading">Cloud sync</h2>
        <p class="sync-section__desc">
          Connect to a <strong>recipes.json</strong> file in your Google Drive or OneDrive
          synced folder. Changes save back to that file automatically.
        </p>
        ${fsa ? `
          <div class="sync-cloud-status">${cloudStatus}</div>
          <div class="sync-actions">
            <button class="sync-action-btn" id="open-cloud-btn">
              📂 Open cloud file
            </button>
            <button class="sync-action-btn" id="save-cloud-btn" ${cloudFileHandle ? "" : "disabled"}>
              💾 Save to cloud file
            </button>
          </div>
          <p class="sync-hint">
            Tip: save recipes.json inside your Google Drive or OneDrive folder on this computer.
            After connecting, any saves will sync to all your devices automatically.
          </p>` : `
          <div class="sync-no-fsa">
            <p>Cloud file sync requires Chrome or Edge on desktop.</p>
            <p>On this browser, use Import / Export below instead.</p>
          </div>`}
      </section>

      <section class="sync-section">
        <h2 class="sync-section__heading">Import &amp; Export</h2>
        <p class="sync-section__desc">
          Import a recipes.json file from your device, or export your current collection.
        </p>
        <div class="sync-actions">
          <label class="sync-action-btn sync-action-btn--label" id="import-label">
            📥 Import recipes.json
            <input type="file" id="import-file-input" accept=".json" hidden />
          </label>
          <button class="sync-action-btn" id="export-btn">
            📤 Export recipes.json
          </button>
        </div>
        <p class="sync-hint">
          Import replaces your current recipe collection with the file contents.
          Export downloads your full collection including any recipes you've added or edited.
        </p>
      </section>

      <div class="sync-feedback" id="sync-feedback" role="status"></div>

    </main>`;
}

function bindSyncEvents(root) {
  const feedback = (msg, isError = false) => {
    const el = document.getElementById("sync-feedback");
    if (!el) return;
    el.textContent = msg;
    el.className = "sync-feedback " + (isError ? "sync-feedback--error" : "sync-feedback--ok");
    setTimeout(() => { el.textContent = ""; el.className = "sync-feedback"; }, 4000);
  };

  // Open cloud file
  document.getElementById("open-cloud-btn")?.addEventListener("click", async () => {
    try {
      const { recipes: loaded, handle } = await openFileWithPicker();
      cloudFileHandle = handle;
      recipes = mergeRecipes(
        loaded,
        [] // cloud file IS the source of truth; don't merge localStorage over it
      );
      feedback(`Opened ${handle.name} — ${loaded.length} recipes loaded.`);
      root.innerHTML = renderSyncPanel();
      bindSyncEvents(root);
    } catch (err) {
      if (err.name !== "AbortError") feedback(err.message, true);
    }
  });

  // Save to cloud file
  document.getElementById("save-cloud-btn")?.addEventListener("click", async () => {
    if (!cloudFileHandle) return;
    try {
      await saveToFileHandle(cloudFileHandle, recipes);
      feedback(`Saved ${recipes.length} recipes to ${cloudFileHandle.name}.`);
    } catch (err) {
      feedback(err.message, true);
    }
  });

  // Import from file input (fallback)
  document.getElementById("import-file-input")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const loaded = await readUploadedFile(file);
      recipes = loaded;
      feedback(`Imported ${loaded.length} recipes from ${file.name}.`);
    } catch (err) {
      feedback(err.message, true);
    }
  });

  // Export download
  document.getElementById("export-btn")?.addEventListener("click", () => {
    downloadJson(recipes);
    feedback(`Exported ${recipes.length} recipes.`);
  });
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function renderError(message) {
  return `
    <div class="error-state">
      <h2>Something went wrong</h2>
      <p>${escHtml(message)}</p>
      <a href="#/">← Back to recipes</a>
    </div>`;
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Start ────────────────────────────────────────────────────────────────────

init();
