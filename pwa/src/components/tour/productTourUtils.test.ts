import { describe, expect, it } from "vitest";
import { isTourCompleted } from "./productTourUtils";

describe("isTourCompleted", () => {
  it("returns true when the tour id is in the completed list", () => {
    expect(isTourCompleted("inbox-new-task", ["inbox-new-task", "another-tour"])).toBe(true);
  });

  it("returns false when the tour id is not completed yet", () => {
    expect(isTourCompleted("inbox-new-task", ["another-tour"])).toBe(false);
  });
});
