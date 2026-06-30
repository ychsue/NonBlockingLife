import { useState } from "react";
import { DebugLogPage } from "./debug/DebugLogPage";
import { useAppStore } from "../store/appStore";

export function MorePage() {
  const enableExperimentalFeatures = useAppStore(
    (state) => state.experimentalFeaturesEnabled,
  );
  const setEnableExperimentalFeatures = useAppStore(
    (state) => state.setExperimentalFeaturesEnabled,
  );
  const [showDebug, setShowDebug] = useState(false);

  const text = {
    subtitle:
      "Enable experimental features to access new functionalities that are still in development. Use with caution.",
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold">More ⚗️</h2>
        <p className="text-sm text-gray-600">{text.subtitle}</p>
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={enableExperimentalFeatures}
            onChange={(e) => setEnableExperimentalFeatures(e.target.checked)}
          />
          Enable Experimental Features
        </label>
      </div>
      {enableExperimentalFeatures && (
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
      )}
    </div>
  );
}
