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
}

export interface ProductTourConfig {
  id: string;
  version: number;
  title: string;
  requiredSheet?: TourSheet;
  steps: ProductTourStep[];
}
