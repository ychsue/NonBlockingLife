import { useEffect } from "react";
import { ButtonType, Joyride, type EventData, type Step } from "react-joyride";
import type { ProductTourConfig, ProductTourStep } from "./productTourTypes";

type ProductTourWrapperProps = {
  tour: ProductTourConfig | null;
  step: ProductTourStep | null;
  continuous?: boolean;
  stopTour: () => void;
  onComplete: () => void;
  onNext: () => void;
  onReset: () => void;
  run: boolean;
};

function waitForTarget(target: string, timeoutMs = 5000, stopTour?: () => void): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const check = () => {
      const element = document.querySelector(target);
      if (element) {
        console.debug("[Joyride] target resolved", { target, element: element.tagName });
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        console.warn("[Joyride] target not found after timeout", { target, timeoutMs });
        stopTour?.();
        reject(new Error(`Joyride target not found: ${target}`));
        return;
      }

      window.setTimeout(check, 100);
    };

    check();
  });
}

export function toJoyrideStep(step: ProductTourStep, stopTour?: () => void): Step {
  const buttons: ButtonType[] = step.hideFooterButton
    ? []
    : step.hideCloseButton
      ? ["primary"]
      : ["close", "primary"];

  return {
    target: step.target,
    title: step.title,
    content: step.content,
    placement: step.placement ?? "bottom",
    spotlightPadding: step.spotlightPadding ?? 8,
    buttons,
    targetWaitTimeout: step.waitForElement ? 5000 : 1000,
    before: step.waitForElement
      ? async () => {
          await waitForTarget(step.target, 5000, stopTour);
        }
      : undefined,
    styles: {
      buttonPrimary: {
        backgroundColor: "#2563eb",
        borderRadius: "9999px",
      },
      tooltip: {
        zIndex: 2000,
      },
    },
  };
}

export function ProductTourWrapper({
  tour,
  step,
  stopTour,
  onComplete,
  onNext,
  onReset,
  continuous = true,
  run,
}: ProductTourWrapperProps) {
  useEffect(() => {
    if (!run || !step?.target) return;

    const timerId = window.setTimeout(() => {
      const element = document.querySelector(step.target);
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);

    return () => window.clearTimeout(timerId);
  }, [run, step?.id, step?.target]);

  if (!tour || !step || !run) {
    return null;
  }

  const joyrideSteps = tour.steps.map((step) => toJoyrideStep(step, stopTour));

  const handleJoyrideCallback = (data: EventData) => {
    console.debug("[Joyride onEvent] event", data);

    if (data.status === "finished" || data.status === "skipped") {
      onComplete();
      return;
    }

    if (data.action === "next" && data.lifecycle === "complete") {
      onNext();
    }

    if (data.action === "prev" && data.lifecycle === "complete") {
      onReset();
    }

    if (data.action === "reset" || data.action === "close") {
      onReset();
    }
  };

  return (
    <Joyride
      run={run}
      steps={joyrideSteps}
      stepIndex={tour.steps.findIndex((entry) => entry.id === step.id)}
      continuous={continuous}
      scrollToFirstStep={false}
      debug={true}
      options={{
        skipScroll: true,
        overlayClickAction: "close",
        zIndex: 9999,
      }}
      portalElement={step?.portalElement ?? document.body}
      onEvent={handleJoyrideCallback}
      locale={{ back: "Back", close: "Close", last: "Finish", next: "Next", skip: "Skip" }}
    />
  );
}
