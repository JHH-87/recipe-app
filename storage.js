/**
 * storage.js
 *
 * Handles loading and saving recipes.json from/to:
 *   1. File System Access API (Chrome/Edge desktop) — can target any folder
 *      including Google Drive and OneDrive synced folders. The file handle
 *      is kept in memory so saves write back to the same file.
 *   2. Traditional file input + download (Firefox, Safari, all mobile) —
 *      user picks a file to import; export triggers a download.
 *
 * The cloud sync workflow:
 *   - Sync your Google Drive / OneDrive folder to your desktop
 *   - Use "Open cloud file" to pick recipes.json from that folder
 *   - The app reads it and keeps the file handle open
 *   - "Save to cloud file" writes changes back to the same file
 *   - Cloud client syncs the change to all your devices
 *
 * Exports:
 *   hasFileSystemAccess()          → boolean
 *   openFileWithPicker()           → Promise<{ recipes, handle }>
 *   saveToFileHandle(handle, data) → Promise<void>
 *   downloadJson(data, filename)   → void   (fallback export)
 *   readUploadedFile(file)         → Promise<Array>  (fallback import)
 */

// ─── Feature detection ────────────────────────────────────────────────────────

/**
 * Returns true if the File System Access API is available.
 * Chrome 86+, Edge 86+. Not available in Firefox, Safari, or any mobile browser.
 */
export function hasFileSystemAccess() {
  return typeof window !== "undefined" && "showOpenFilePicker" in window;
}

// ─── File System Access API ────────────────────────────────────────────────────

const FILE_PICKER_OPTIONS = {
  types: [
    {
      description: "Recipe collection (JSON)",
      accept: { "application/json": [".json"] },
    },
  ],
  excludeAcceptAllOption: true,
  multiple: false,
};

/**
 * Open a file picker, read the selected recipes.json and return its contents
 * along with the file handle (needed for saving back).
 *
 * @returns {Promise<{ recipes: Array, handle: FileSystemFileHandle }>}
 * @throws if user cancels or file is not valid JSON
 */
export async function openFileWithPicker() {
  const [handle] = await window.showOpenFilePicker(FILE_PICKER_OPTIONS);
  const file     = await handle.getFile();
  const text     = await file.text();

  let recipes;
  try {
    recipes = JSON.parse(text);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  if (!Array.isArray(recipes)) {
    throw new Error("Expected a JSON array of recipes.");
  }

  return { recipes, handle };
}

/**
 * Save recipes array back to an open file handle.
 * Requires "readwrite" permission — will prompt the user if needed.
 *
 * @param {FileSystemFileHandle} handle
 * @param {Array} recipes
 * @returns {Promise<void>}
 */
export async function saveToFileHandle(handle, recipes) {
  // Request write permission (may show a browser prompt)
  const perm = await handle.requestPermission({ mode: "readwrite" });
  if (perm !== "granted") {
    throw new Error("Write permission was not granted.");
  }

  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(recipes, null, 2));
  await writable.close();
}

// ─── Fallback: download ────────────────────────────────────────────────────────

/**
 * Trigger a JSON file download (fallback for browsers without File System Access).
 *
 * @param {Array} recipes
 * @param {string} [filename]
 */
export function downloadJson(recipes, filename = "recipes.json") {
  const blob = new Blob([JSON.stringify(recipes, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Read an uploaded File object and parse as a recipes array.
 * Used with a traditional <input type="file"> element.
 *
 * @param {File} file
 * @returns {Promise<Array>}
 */
export async function readUploadedFile(file) {
  const text = await file.text();
  let recipes;
  try {
    recipes = JSON.parse(text);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }
  if (!Array.isArray(recipes)) {
    throw new Error("Expected a JSON array of recipes.");
  }
  return recipes;
}
