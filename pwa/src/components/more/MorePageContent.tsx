import { useState } from "react";
import { DebugLogPage } from "../debug/DebugLogPage";
import { useAppStore, type AlarmTestMode } from "../../store/appStore";
import { useProductTourContext } from "../tour/ProductTourContext";
import type { ProductTourConfig } from "../tour/productTourTypes";
import type { AndroidTimerLaunchMode } from "../../utils/shortcutUtils";
import type { AlarmQueueItem } from "../../db/schema";
import { triggerAlarmNotification } from "../../utils/alarmNotifications";
import { syncAlarmQueueFromScheduled } from "../../utils/alarmQueue";
import { useAlarmQueueWatcher } from "../../hooks/useAlarmQueueWatcher";
import { AlarmQueuePanel } from "./AlarmQueuePanel";
import { db } from "../../db";
import { buildTwaBridgePayload, listenForTwaMessages, sendTwaBridgeTestMessage, getTwaBridgeState } from "../../utils/twaBridge";

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

const alarmTestModeOptions: Array<{
  value: AlarmTestMode;
  label: string;
  description: string;
}> = [
  {
    value: "none",
    label: "None",
    description: "Disable the alarm test and keep the app quiet.",
  },
  {
    value: "notification",
    label: "Notification",
    description: "Trigger a local browser notification for a quick device check.",
  },
  {
    value: "system",
    label: "System",
    description: "Attempt to open the Android clock/timer intent for native checking.",
  },
];

const alarmQueueSample: AlarmQueueItem = {
  taskId: "test-alarm",
  title: "NBL Alarm Test",
  alarmAt: Date.now(),
  offsetMinutes: 0,
  state: "pending",
  dedupeKey: `test-alarm:${Date.now()}`,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

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
  const { startTour, activeTour, completedTours, tours, nextStep, isRunning, clearCompletedTours } = useProductTourContext();

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
                  data-tour={option.value === "set_timer" ? "android-timer-set-timer-option" : undefined}
                  onChange={() => {
                    setAndroidTimerLaunchMode(option.value);
                    if (option.value === "set_timer" && isRunning && activeTour?.id === "android-timer-setup") {
                      nextStep();
                    }
                  }}
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
        <div
          className="space-y-3"
          data-tour="more-settings-tours-card"
        >
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => clearCompletedTours()}
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
            >
              Clear completed tours
            </button>
          </div>
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
  const showGlobalToast = useAppStore((state) => state.showGlobalToast);
  const alarmTestMode = useAppStore((state) => state.alarmTestMode);
  const setAlarmTestMode = useAppStore((state) => state.setAlarmTestMode);
  const { queueItems, refreshQueue, triggerItem, dismissItem, deleteItem, applySyncPlan } = useAlarmQueueWatcher(enableExperimentalFeatures);
  const [showDebug, setShowDebug] = useState(false);
  const [twaMessageLog, setTwaMessageLog] = useState<string[]>([]);
  const [twaBridgeReady, setTwaBridgeReady] = useState(false);

  useState(() => {
    const cleanup = listenForTwaMessages((event) => {
      const payload = typeof event.data === 'object' && event.data ? (event.data as Record<string, unknown>) : { raw: String(event.data ?? '') };
      const message = `Received from TWA: ${JSON.stringify(payload)}`;
      setTwaMessageLog((current) => [message, ...current].slice(0, 10));
      setTwaBridgeReady(true);
    });

    return cleanup;
  });

  const handleTwaBridgePing = () => {
    const success = sendTwaBridgeTestMessage('pwa->twa bridge check');
    setTwaMessageLog((current) => [
      success ? 'Sent PWA test message via TWA bridge.' : 'TWA bridge port not ready yet.',
      ...current,
    ].slice(0, 10));
  };

  const handleSendTwaBridgeMessage = () => {
    const payload = buildTwaBridgePayload('nbl:probe', { action: 'hello', from: 'pwa', time: Date.now() });
    const port = getTwaBridgeState().port;
    if (port) {
      port.postMessage(payload);
      setTwaMessageLog((current) => [`Sent two-way probe via port: ${JSON.stringify(payload)}`, ...current].slice(0, 10));
      return;
    }

    setTwaMessageLog((current) => ['No TWA message port ready yet; waiting for Android bridge setup.', ...current].slice(0, 10));
  };

  const handleSyncAlarmQueue = async () => {
    const scheduledRows = await db.scheduled.toArray();
    const existingRows = await db.alarm_queue.orderBy("alarmAt").toArray();
    const plan = syncAlarmQueueFromScheduled(scheduledRows, existingRows, new Date(), 30 * 24 * 60 * 60 * 1000);

    await applySyncPlan(plan);
    showGlobalToast({
      message: `${plan.toAdd.length + plan.toUpdate.length} alarm queue entries synced; ${plan.toDelete.length} removed.`,
      duration: 2500,
    });
  };

  const handleAlarmTest = async () => {
    if (alarmTestMode === "none") {
      showGlobalToast({
        message: "Alarm test is disabled.",
        duration: 2500,
      });
      return;
    }

    if (alarmTestMode === "notification") {
      if (typeof Notification === "undefined") {
        window.alert("This browser does not support Notification.");
        return;
      }

      const permission = Notification.permission;
      if (permission === "granted") {
        triggerAlarmNotification(alarmQueueSample);
        await refreshQueue();
        return;
      }

      if (permission === "default") {
        const nextPermission = await Notification.requestPermission();
        if (nextPermission === "granted") {
          triggerAlarmNotification(alarmQueueSample);
        } else {
          showGlobalToast({
            message: "Notification permission was not granted.",
            duration: 3000,
          });
        }
        return;
      }

      showGlobalToast({
        message: "Notification permission is blocked. Please allow it in browser settings.",
        duration: 4000,
      });
      return;
    }

    const testUrl = "nonblockinglife://show-clock";
    try {
      window.location.href = testUrl;
      showGlobalToast({
        message: "Attempting to open the Android clock UI for system test.",
        duration: 3000,
      });
    } catch {
      window.alert("Unable to launch the Android clock intent from this environment.");
    }
  };

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
          <div className="mt-4 space-y-4">
            {/* {alarmTestMode !== "none" && ( */}
              <div className="rounded-lg border border-amber-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-gray-900">Alarm test</h4>
                  <button
                    type="button"
                    onClick={() => void handleAlarmTest()}
                    className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
                  >
                    Test Alarm
                  </button>
                </div>

                <div className="space-y-2">
                  {alarmTestModeOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm ${
                        alarmTestMode === option.value
                          ? "border-amber-500 bg-amber-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="alarm-test-mode"
                        checked={alarmTestMode === option.value}
                        onChange={() => setAlarmTestMode(option.value)}
                      />
                      <span>
                        <span className="font-medium">{option.label}</span>
                        <span className="mt-1 block text-gray-600">{option.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            {/* )} */}

            <div className="rounded-lg border border-amber-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-gray-900">TWA bridge probe</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleTwaBridgePing}
                    className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                  >
                    Send test
                  </button>
                  <button
                    type="button"
                    onClick={handleSendTwaBridgeMessage}
                    className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
                  >
                    Two-way probe
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {twaBridgeReady ? 'TWA bridge is receiving messages.' : 'Waiting for TWA bridge connection to be ready.'}
              </p>
              <div className="mt-3 space-y-1">
                {twaMessageLog.length === 0 ? (
                  <div className="text-xs text-gray-500">No messages yet.</div>
                ) : (
                  twaMessageLog.map((message, index) => (
                    <div key={`${message}-${index}`} className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-700">
                      {message}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-gray-900">Alarm queue sync</h4>
                <button
                  type="button"
                  onClick={() => void handleSyncAlarmQueue()}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Sync from scheduled
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Rebuild the derived queue from scheduled items and keep future reminders in the local queue.
              </p>
            </div>

            <AlarmQueuePanel
              items={queueItems}
              onRefresh={() => refreshQueue()}
              onTrigger={triggerItem}
              onDismiss={dismissItem}
              onDelete={deleteItem}
            />

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
  const { nextStep, isRunning, activeTour } = useProductTourContext();

  const handleTabChange = (tab: MoreTab) => {
    setActiveTab(tab);
    if (tab === "settings" && isRunning) {
      nextStep();
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold">{copy.heading} ⚗️</h2>
        <p className="text-sm text-gray-600">{copy.description}</p>
      </div>

      <div className="flex gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1">
        <button
          type="button"
          onClick={() => handleTabChange("settings")}
          data-tour="more-settings-tab"
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
          onClick={() => handleTabChange("experiment")}
          data-tour="more-experiment-tab"
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
