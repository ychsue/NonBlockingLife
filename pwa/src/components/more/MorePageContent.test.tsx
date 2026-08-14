import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { MorePageContent } from "./MorePageContent";
import { ProductTourProvider } from "../tour/ProductTourContext";
import { useAppStore } from "../../store/appStore";

describe("MorePageContent", () => {
  const renderWithTour = () => {
    const tourValue = {
      activeTour: null,
      activeStep: null,
      isRunning: false,
      completedTours: [],
      tours: [],
      startTour: () => undefined,
      completeTour: () => undefined,
      nextStep: () => undefined,
      resetTour: () => undefined,
      clearCompletedTours: () => undefined,
    };

    return renderToStaticMarkup(
      <ProductTourProvider value={tourValue}>
        <MorePageContent />
      </ProductTourProvider>
    );
  };

  beforeEach(() => {
    useAppStore.setState({
      experimentalFeaturesEnabled: true,
      androidTimerLaunchMode: "show_clock",
      alarmTestMode: "none",
    } as Partial<ReturnType<typeof useAppStore.getState>>);
  });

  it("renders the Android timer launch options in local settings", () => {
    const html = renderWithTour();

    expect(html).toContain("Local preferences");
    expect(html).toContain("Android TWA timer launch");
    expect(html).toContain("Do not show timer automatically");
  });

  it("hides the alarm test controls when the global alarm test mode is none", () => {
    const html = renderWithTour();

    expect(html).not.toContain("Test Alarm");
    expect(html).not.toContain("Alarm test");
  });
});
