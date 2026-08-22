import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../../store/appStore";
import type { ProductTourConfig, ProductTourStep } from "./productTourTypes";
import { getToursList } from "./productTours";
import { isTourCompleted } from "./productTourUtils";
import { useResponsiveTable } from "../../hooks/useResponsiveTable";

type UseProductTourResult = {
  activeTour: ProductTourConfig | null;
  activeStep: ProductTourStep | null;
  isRunning: boolean;
  completedTours: string[];
  tours: ProductTourConfig[];
  startTour: (tourId: string, options?: { force?: boolean }) => void;
  stopTour: () => void;
  completeTour: (tourId: string) => void;
  nextStep: () => void;
  resetTour: () => void;
  clearCompletedTours: () => void;
  setActiveStepIndex: (index: number) => void;
};

const COMPLETED_TOURS_KEY = "completed_tours";
const LAST_TOUR_TIME_KEY = "last_tour_time";
const MIN_REPLAY_DELAY_MS = 100;

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function readCompletedTours(): string[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(COMPLETED_TOURS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCompletedTours(tours: string[]) {
  const storage = getStorage();
  if (storage) {
    storage.setItem(COMPLETED_TOURS_KEY, JSON.stringify(tours));
  }
}

function readLastTourTime(): number | null {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(LAST_TOUR_TIME_KEY);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function writeLastTourTime(timestamp: number) {
  const storage = getStorage();
  if (storage) {
    storage.setItem(LAST_TOUR_TIME_KEY, String(timestamp));
  }
}

export function useProductTour(currentSheet?: string): UseProductTourResult {
  const locale = useAppStore((state) => state.locale);
  const forceStartRef = useRef(false);
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [completedTours, setCompletedTours] = useState<string[]>(() => readCompletedTours());
  const {isMobile} = useResponsiveTable();
  const toursList = useMemo(() => getToursList(locale, isMobile), [locale, isMobile]);

  const activeTour = useMemo(() => {
    if (!activeTourId) return null;
    return toursList.find((tour) => tour.id === activeTourId) ?? null;
  }, [activeTourId, toursList]);

  const activeStep = activeTour?.steps[activeStepIndex] ?? null;
  const isRunning = Boolean(activeTour && activeStep);

  const completeTour = useCallback((tourId: string) => {
    const nextCompletedTours = Array.from(new Set([...readCompletedTours(), tourId]));
    setCompletedTours(nextCompletedTours);
    writeCompletedTours(nextCompletedTours);
    writeLastTourTime(Date.now());
    setActiveTourId(null);
    setActiveStepIndex(0);
  }, []);

  const startTour = useCallback((tourId: string, options?: { force?: boolean }) => {
    const tour = toursList.find((entry) => entry.id === tourId);
    if (!tour) return;
    if (!options?.force && isTourCompleted(tourId, readCompletedTours())) return;
    forceStartRef.current = Boolean(options?.force);
    setActiveTourId(tourId);
    setActiveStepIndex(0);
  }, [toursList]);

  const stopTour = useCallback(() => {
    setActiveTourId(null);
    setActiveStepIndex(0);
  }, []);

  const nextStep = useCallback(() => {
    if (!activeTour) return;
    if (activeStepIndex >= activeTour.steps.length - 1) {
      completeTour(activeTour.id);
      return;
    }
    setActiveStepIndex((value) => value + 1);
  }, [activeStepIndex, activeTour, completeTour]);

  const resetTour = useCallback(() => {
    setActiveTourId(null);
    setActiveStepIndex(0);
  }, []);

  const clearCompletedTours = useCallback(() => {
    writeCompletedTours([]);
    writeLastTourTime(0);
    setCompletedTours([]);
    setActiveTourId(null);
    setActiveStepIndex(0);
  }, []);

  useEffect(() => {
    if (!activeTour || !currentSheet) return;
    if (activeTour.requiredSheet && activeTour.requiredSheet !== currentSheet) {
      setActiveTourId(null);
      setActiveStepIndex(0);
    }
  }, [activeTour, currentSheet]);

  useEffect(() => {
    if (!activeTour) return;
    if (forceStartRef.current) {
      forceStartRef.current = false;
      return;
    }

    const completed = readCompletedTours();
    if (isTourCompleted(activeTour.id, completed)) {
      resetTour();
      return;
    }

    const lastTourTime = readLastTourTime();
    if (lastTourTime && Date.now() - lastTourTime < MIN_REPLAY_DELAY_MS) {
      resetTour();
    }
  }, [activeTour, resetTour]);

  useEffect(() => {
    if (!activeTour) return;
    const completed = readCompletedTours();
    if (!isTourCompleted(activeTour.id, completed)) {
      const lastTourTime = readLastTourTime();
      if (!lastTourTime || Date.now() - lastTourTime >= MIN_REPLAY_DELAY_MS) {
        return;
      }
      resetTour();
    }
  }, [activeTour, resetTour]);

  return {
    activeTour,
    activeStep,
    isRunning,
    completedTours,
    tours: toursList,
    startTour,
    stopTour,
    completeTour,
    nextStep,
    resetTour,
    clearCompletedTours,
    setActiveStepIndex,
  };
}
