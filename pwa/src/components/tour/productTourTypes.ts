import { StepTarget } from "react-joyride";
import { getDeviceType } from "../../utils/shortcutUtils";
import { useAppStore } from "../../store/appStore";

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
  app?: ReturnType<typeof getAppType>[];
}

export function getAppType():
  | "pwa"
  | "extension"
  | "androidWebView"
  | "windows"
  | "linux"
  | "shortcuts" {
  const deviceType = getDeviceType();
  const { kind } = useAppStore.getState().capabilitiesAndKind;
  if (["windows", "linux"].includes(kind)) return kind as "windows" | "linux";
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
