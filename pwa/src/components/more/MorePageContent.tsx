import { useState } from "react";
import { DebugLogPage } from "../debug/DebugLogPage";
import { useAppStore } from "../../store/appStore";
import { useProductTourContext } from "../tour/ProductTourContext";
import type { ProductTourConfig } from "../tour/productTourTypes";
import type { AndroidTimerLaunchMode } from "../../utils/shortcutUtils";

type MoreTab = "settings" | "experiment";

const copy = {
  heading: "More",
  description: "Control local preferences, future global sync options, and experimental tools.",
  tabs: {
    settings: "Settings",
    experiment: "Experiment",
  },
  settings: {
    localTitle: "Local preferences",
    localDescription: "Stored on this device and scoped to the current app installation.",
    globalTitle: "Global preferences",
    globalDescription: "Reserved for future sync and cloud-backed configuration.",
    timerTitle: "Android TWA timer launch",
    timerDescription: "Choose how the Android TWA should react when a task timer is triggered.",
    toursTitle: "Guided tours",
    toursDescription: "Each tour is shown as its own card with its completion state, description, and replay action.",
    completedLabel: "已學",
    pendingLabel: "未學",
    learnLabel: "學習",
    replayLabel: "重播",
    anyPageLabel: "任何頁面可開啟",
    experimentalTitle: "Experimental access",
    experimentalDescription: "Enable experimental tools to reveal the advanced workflows and debug panels.",
  },
  experiment: {
    title: "Experimental tools",
    description: "Temporary features for testing and debugging advanced flows.",
    disabledMessage: "Enable experimental features first to unlock the advanced tools.",
    debugLabel: "Show debug information",
  },
} as const;

const timerModeOptions: Array<{
  value: AndroidTimerLaunchMode;
  label: string;
  description: string;
}> = [
  {
    value: "none",
    label: "Do not show timer automatically",
    description: "Skip the automatic clock/timer launch entirely.",
  },
  {
    value: "show_clock",
    label: "Show clock/timer UI",
    description: "Open the native clock UI after the task starts.",
  },
  {
    value: "set_timer",
    label: "Create timer directly",
    description: "Use a deep link to open the timer immediately with the task title.",
  },
];

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="space-y-1">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function SettingsPanel() {
  const enableExperimentalFeatures = useAppStore((state) => state.experimentalFeaturesEnabled);
  const setEnableExperimentalFeatures = useAppStore((state) => state.setExperimentalFeaturesEnabled);
  const androidTimerLaunchMode = useAppStore((state) => state.androidTimerLaunchMode);
  const setAndroidTimerLaunchMode = useAppStore((state) => state.setAndroidTimerLaunchMode);
  const { startTour, activeTour, completedTours, tours } = useProductTourContext();

  const handleReplayTour = (tour: ProductTourConfig) => {
    if (tour.requiredSheet) {
      useAppStore.getState().setCurrentSheet(tour.requiredSheet);
    }

    window.setTimeout(() => {
      startTour(tour.id, { force: true });
    }, 0);
  };

  return (
    <div className="space-y-4">
      <SettingsCard
        title={copy.settings.localTitle}
        description={copy.settings.localDescription}
      >
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <h4 className="text-sm font-medium text-gray-900">{copy.settings.timerTitle}</h4>
          <p className="mt-1 text-sm text-gray-600">{copy.settings.timerDescription}</p>
          <div className="mt-3 space-y-2">
            {timerModeOptions.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm ${
                  androidTimerLaunchMode === option.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="android-timer-launch-mode"
                  checked={androidTimerLaunchMode === option.value}
                  onChange={() => setAndroidTimerLaunchMode(option.value)}
                />
                <span>
                  <span className="font-medium">{option.label}</span>
                  <span className="mt-1 block text-gray-600">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title={copy.settings.globalTitle}
        description={copy.settings.globalDescription}
      >
        <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          Planned: sync selected preferences to Google Sheets via Dexie-backed storage.
        </div>
      </SettingsCard>

      <SettingsCard
        title={copy.settings.toursTitle}
        description={copy.settings.toursDescription}
      >
        <div className="space-y-3">
          {tours.map((tour) => {
            const isCompleted = completedTours.includes(tour.id);
            const isBusy = Boolean(activeTour);

            return (
              <div key={tour.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-900">{tour.title}</h4>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {isCompleted ? copy.settings.completedLabel : copy.settings.pendingLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{tour.description}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-gray-500">
                    {tour.requiredSheet ? `頁面: ${tour.requiredSheet}` : copy.settings.anyPageLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleReplayTour(tour)}
                    disabled={isBusy}
                    className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    {isCompleted ? copy.settings.replayLabel : copy.settings.learnLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard
        title={copy.settings.experimentalTitle}
        description={copy.settings.experimentalDescription}
      >
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={enableExperimentalFeatures}
            onChange={(e) => setEnableExperimentalFeatures(e.target.checked)}
          />
          Enable Experimental Features
        </label>
      </SettingsCard>
    </div>
  );
}

function ExperimentPanel() {
  const enableExperimentalFeatures = useAppStore((state) => state.experimentalFeaturesEnabled);
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div className="space-y-1">
          <h3 className="font-semibold text-amber-900">{copy.experiment.title}</h3>
          <p className="text-sm text-amber-800">{copy.experiment.description}</p>
        </div>

        {!enableExperimentalFeatures ? (
          <div className="mt-4 rounded-md bg-white/70 p-3 text-sm text-amber-800">
            {copy.experiment.disabledMessage}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showDebug}
                onChange={(e) => setShowDebug(e.target.checked)}
              />
              {copy.experiment.debugLabel}
            </label>

            {showDebug && <DebugLogPage />}
          </div>
        )}
      </section>
    </div>
  );
}

export function MorePageContent() {
  const [activeTab, setActiveTab] = useState<MoreTab>("settings");

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold">{copy.heading} ⚗️</h2>
        <p className="text-sm text-gray-600">{copy.description}</p>
      </div>

      <div className="flex gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            activeTab === "settings"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-transparent text-gray-700 hover:bg-white"
          }`}
        >
          {copy.tabs.settings}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("experiment")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            activeTab === "experiment"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-transparent text-gray-700 hover:bg-white"
          }`}
        >
          {copy.tabs.experiment}
        </button>
      </div>

      {activeTab === "settings" ? <SettingsPanel /> : <ExperimentPanel />}
    </div>
  );
}
