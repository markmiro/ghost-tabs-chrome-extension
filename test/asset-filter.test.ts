import { describe, expect, it } from "vitest";
import copyGlobs from "../scripts-build-copy-globs.json";
import { shouldIgnoreAsset } from "../scripts/asset-filter.mjs";

const directory = { isDirectory: () => true };

describe("asset copy filter", () => {
  it("copies static assets and skips source files", () => {
    expect(shouldIgnoreAsset("src/popup.html")).toBe(false);
    expect(shouldIgnoreAsset("src/css/styles.css")).toBe(false);
    expect(shouldIgnoreAsset("src/manifest.json")).toBe(false);
    expect(shouldIgnoreAsset("src/js/popup-debug.js")).toBe(false);
    expect(shouldIgnoreAsset("src/js/background.ts")).toBe(true);
    expect(shouldIgnoreAsset("src/img/README.md")).toBe(true);
    expect(shouldIgnoreAsset("src/js/helpers/note.sh")).toBe(true);
    expect(shouldIgnoreAsset("src/.DS_Store")).toBe(true);
    expect(shouldIgnoreAsset("src/js", directory)).toBe(false);
  });

  it("keeps typescript and notes out of the production copy list", () => {
    expect(copyGlobs).toContain("src/**/*");
    expect(copyGlobs).toContain("!src/**/*.ts");
    expect(copyGlobs).toContain("!src/**/*.md");
    expect(copyGlobs).toContain("!src/**/*.sh");
    expect(copyGlobs).toContain("!src/**/*.DS_Store");
  });
});
