import { describe, expect, it } from "vitest";
import { getToursList } from "./productTours";
import { isTourCompleted } from "./productTourUtils";

describe("isTourCompleted", () => {
  it("returns true when the tour id is in the completed list", () => {
    expect(isTourCompleted("inbox-new-task", ["inbox-new-task", "another-tour"])).toBe(true);
  });

  it("returns false when the tour id is not completed yet", () => {
    expect(isTourCompleted("inbox-new-task", ["another-tour"])).toBe(false);
  });
});

describe("getToursList", () => {
  it("includes the Android timer setup tour with the expected steps", () => {
    const tours = getToursList("en");
    const androidTour = tours.find((tour) => tour.id === "android-timer-setup");

    expect(androidTour).toBeDefined();
    expect(androidTour?.steps.map((step) => step.id)).toEqual([
      "android-menu",
      "android-more",
      "android-settings",
      "android-set-timer",
      "android-selection-cache",
      "android-complete",
    ]);
  });
});
