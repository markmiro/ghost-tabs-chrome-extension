import { describe, expect, it } from "vitest";
import {
  fadeHalfLife,
  fadeTimeToReset,
  minFavIconOpacity,
} from "../src/js/helpers/fade-option-steps.js";

const options = [fadeHalfLife, fadeTimeToReset, minFavIconOpacity];

describe("fade option steps", () => {
  it("round-trips every slider step", () => {
    for (const option of options) {
      option.steps.forEach((_, index) => {
        expect(option.valueToStep(option.stepValue(index))).toBe(index);
      });
    }
  });

  it("rejects a value that is not one of the steps", () => {
    expect(() => fadeHalfLife.valueToStep(1)).toThrow(/Unsupported value: 1/);
    expect(() => minFavIconOpacity.valueToStep(0.2)).toThrow(
      /Unsupported value: 0.2/
    );
    expect(() => fadeTimeToReset.valueToStep(30)).toThrow(
      /Unsupported value: 30/
    );
  });
});
