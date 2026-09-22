import { StepTarget } from "react-joyride";
import { getDeviceType } from "../../utils/shortcutUtils";

export type TourSheet =
  | "inbox"
  | "selection_cache"
  | "guide"
  | "macro"
  | "debug"
  | "scheduled"
  | "task_pool"
  | "micro_tasks"
  | "resource"
  | "log";

export interface ProductTourStep {
  id: string;
  title: string;
  content: string;
  target: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  styles?: {
    tooltip?: React.CSSProperties;
  };
  disableBeacon?: boolean;
  waitForElement?: boolean;
  spotlightPadding?: number;
  hideCloseButton?: boolean;
  hideFooterButton?: boolean;
  device?: "desktop" | "mobile";
  scrollTarget?: StepTarget;
  portalElement?: HTMLElement | string | null;
}

export interface ProductTourConfig {
  id: string;
  version: number;
  title: string;
  description: string;
  requiredSheet?: TourSheet;
  steps: ProductTourStep[];
  app?: ReturnType<typeof getAppType>;
}

export function getAppType():
  | "pwa"
  | "extension"
  | "androidWebView"
  | "shortcuts" {
  const deviceType = getDeviceType();
  switch (deviceType) {
    case "TWA":
    case "AndroidWebView":
      return "androidWebView";
    case "Shortcuts":
      return "shortcuts";
    default:
      return "pwa";
  }
}
