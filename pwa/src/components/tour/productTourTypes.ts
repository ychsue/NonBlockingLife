import { StepTarget } from "react-joyride";

export type TourSheet = "inbox" | "selection_cache" | "guide" | "macro" | "debug" | "scheduled" | "task_pool" | "micro_tasks" | "resource" | "log";

export interface ProductTourStep {
  id: string;
  title: string;
  content: string;
  target: string;
  placement?: "top" | "bottom" | "left" | "right";
  disableBeacon?: boolean;
  waitForElement?: boolean;
  spotlightPadding?: number;
  hideCloseButton?: boolean;
  hideFooterButton?: boolean;
  device?: "desktop" | "mobile";
  scrollTarget?: StepTarget;
}

export interface ProductTourConfig {
  id: string;
  version: number;
  title: string;
  description: string;
  requiredSheet?: TourSheet;
  steps: ProductTourStep[];
}
