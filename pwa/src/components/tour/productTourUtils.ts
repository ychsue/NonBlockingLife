import type { ProductTourConfig } from "./productTourTypes";

const REPLAY_DELAY_MS = 1000;

export function isTourCompleted(tourId: string, completedTours: string[]): boolean {
  return completedTours.includes(tourId);
}

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
  if (isTourCompleted(tour.id, completedTours)) {
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
