import path from "node:path";

const ignoredExtensions = new Set([".md", ".sh", ".ts"]);

// Chokidar 4+ does not expand globs, so the watcher applies the old copy
// ignore list itself. Directories stay visible so nested assets are still found.
export function shouldIgnoreAsset(filePath, stats) {
  if (stats?.isDirectory()) return false;
  const base = path.basename(filePath);
  if (base === ".DS_Store") return true;
  return ignoredExtensions.has(path.extname(base).toLowerCase());
}
