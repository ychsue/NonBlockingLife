import type { ProductTourConfig } from "./productTourTypes";

const REPLAY_DELAY_MS = 10 * 60 * 1000;

export function canAutoStartTour({
  tour,
  currentSheet,
  completedTours,
  lastTourTime,
  now = Date.now(),
}: {
  tour: ProductTourConfig;
  currentSheet?: string;
  completedTours: string[];
  lastTourTime: number | null;
  now?: number;
}): boolean {
  if (completedTours.includes(tour.id)) {
    return false;
  }

  if (tour.requiredSheet && currentSheet !== tour.requiredSheet) {
    return false;
  }

  if (lastTourTime && now - lastTourTime < REPLAY_DELAY_MS) {
    return false;
  }

  return true;
}
