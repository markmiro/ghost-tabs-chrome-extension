import { describe, expect, it } from "vitest";
import {
  freshness,
  isFavIconUntouched,
  isSvg,
} from "../src/js/helpers/util.js";

describe("freshness", () => {
  it("starts at full freshness", () => {
    expect(freshness(0, 60_000)).toBe(1);
  });

  it("decays by half after one half-life", () => {
    expect(freshness(60_000, 60_000)).toBeCloseTo(0.5);
  });

  it("decays to a quarter after two half-lives", () => {
    expect(freshness(120_000, 60_000)).toBeCloseTo(0.25);
  });
});

describe("favicon urls", () => {
  it("treats remote favicons as untouched", () => {
    expect(isFavIconUntouched("https://example.com/favicon.ico")).toBe(true);
  });

  it("treats data urls as already rewritten", () => {
    expect(isFavIconUntouched("data:image/png;base64,abc")).toBe(false);
  });

  it("detects svg icons from the url without fetching", async () => {
    await expect(isSvg("")).resolves.toBe(false);
    await expect(isSvg("https://example.com/icon.svg")).resolves.toBe(true);
    await expect(isSvg("https://example.com/icon.svg?v=4")).resolves.toBe(true);
    await expect(isSvg("https://example.com/icon.png")).resolves.toBe(false);
    await expect(isSvg("https://example.com/icon.jpg")).resolves.toBe(false);
    await expect(isSvg("https://example.com/icon.jpeg")).resolves.toBe(false);
    await expect(isSvg("https://example.com/icon.ico?v=4")).resolves.toBe(
      false
    );
  });
});
