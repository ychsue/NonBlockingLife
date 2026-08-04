import { describe, expect, it } from "vitest";
import { toJoyrideStep } from "./ProductTourWrapper";
import type { ProductTourStep } from "./productTourTypes";

describe("toJoyrideStep", () => {
  it("maps hideFooterButton and hideCloseButton to Joyride button options", () => {
    const step = toJoyrideStep({
      id: "test-step",
      title: "Test",
      content: "Test content",
      target: "[data-tour='demo']",
      hideFooterButton: true,
      hideCloseButton: true,
    } as ProductTourStep);

    expect(step.buttons).toEqual([]);
  });

  it("waits for the target element when requested", () => {
    const step = toJoyrideStep({
      id: "test-step",
      title: "Test",
      content: "Test content",
      target: "[data-tour='demo']",
      waitForElement: true,
    } as ProductTourStep);

    expect(step.before).toBeTypeOf("function");
    expect(step.targetWaitTimeout).toBe(5000);
  });
});
