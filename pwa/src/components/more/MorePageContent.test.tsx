import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { MorePageContent } from "./MorePageContent";
import { useAppStore } from "../../store/appStore";

describe("MorePageContent", () => {
  beforeEach(() => {
    useAppStore.setState({
      experimentalFeaturesEnabled: true,
      androidTimerLaunchMode: "show_clock",
    } as Partial<ReturnType<typeof useAppStore.getState>>);
  });

  it("renders the Android timer launch options in local settings", () => {
    const html = renderToStaticMarkup(<MorePageContent />);

    expect(html).toContain("Local preferences");
    expect(html).toContain("Android TWA timer launch");
    expect(html).toContain("Do not show timer automatically");
  });
});
