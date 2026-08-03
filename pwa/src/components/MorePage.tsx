import { useState } from "react";
import { DebugLogPage } from "./debug/DebugLogPage";
import { useAppStore } from "../store/appStore";
import type { AndroidTimerLaunchMode } from "../utils/shortcutUtils";

type MoreTab = "experiment" | "settings";

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

export function MorePage() {
  const enableExperimentalFeatures = useAppStore(
    (state) => state.experimentalFeaturesEnabled,
  );
  const setEnableExperimentalFeatures = useAppStore(
    (state) => state.setExperimentalFeaturesEnabled,
  );
  const androidTimerLaunchMode = useAppStore(
    (state) => state.androidTimerLaunchMode,
  );
  const setAndroidTimerLaunchMode = useAppStore(
    (state) => state.setAndroidTimerLaunchMode,
  );
  const [activeTab, setActiveTab] = useState<MoreTab>("settings");
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold">More ⚗️</h2>
        <p className="text-sm text-gray-600">
          Explore experimental features and adjust the settings that affect timer behavior.
        </p>
      </div>

      <div className="flex gap-2 rounded-lg border border-gray-200 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            activeTab === "settings"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("experiment")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            activeTab === "experiment"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          Experiment
        </button>
      </div>

      {activeTab === "settings" && (
        <div className="space-y-4 rounded-lg border border-gray-200 p-4">
          <div>
            <h3 className="font-semibold">General settings</h3>
            <p className="text-sm text-gray-600">
              Turn experimental features on to access the timer experiment controls.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={enableExperimentalFeatures}
              onChange={(e) => setEnableExperimentalFeatures(e.target.checked)}
            />
            Enable Experimental Features
          </label>
        </div>
      )}

      {activeTab === "experiment" && (
        <div className="space-y-4 rounded-lg border border-gray-200 p-4">
          {!enableExperimentalFeatures ? (
            <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
              Enable experimental features first to access the timer experiment section.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="font-semibold">Android TWA timer launch</h3>
                <p className="text-sm text-gray-600">
                  Choose how the Android TWA should react when a task timer is triggered.
                </p>
                <div className="space-y-2">
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

              <div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={showDebug}
                    onChange={(e) => setShowDebug(e.target.checked)}
                  />
                  Show Debug Information
                </label>

                {showDebug && <DebugLogPage />}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
