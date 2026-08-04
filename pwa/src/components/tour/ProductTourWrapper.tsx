import { Joyride, type EventData, type Step } from "react-joyride";
import type { ProductTourConfig, ProductTourStep } from "./productTourTypes";

type ProductTourWrapperProps = {
  tour: ProductTourConfig | null;
  step: ProductTourStep | null;
  onComplete: () => void;
  onNext: () => void;
  onReset: () => void;
  run: boolean;
};

function toJoyrideStep(step: ProductTourStep): Step {
  return {
    target: step.target,
    title: step.title,
    content: step.content,
    placement: step.placement ?? "bottom",
    spotlightPadding: step.spotlightPadding ?? 8,
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
  onComplete,
  onNext,
  onReset,
  run,
}: ProductTourWrapperProps) {
  if (!tour || !step || !run) {
    return null;
  }

  const joyrideSteps = tour.steps.map(toJoyrideStep);

  const handleJoyrideCallback = (data: EventData) => {
    if (data.status === "finished" || data.status === "skipped") {
      onComplete();
      return;
    }

    if (data.action === "next") {
      onNext();
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
      continuous
      onEvent={handleJoyrideCallback}
      locale={{ back: "Back", close: "Close", last: "Finish", next: "Next", skip: "Skip" }}
    />
  );
}
