import { useState } from "react";
import { DebugLogPage } from "../debug/DebugLogPage";
import { useAppStore } from "../../store/appStore";
import { useProductTourContext } from "../tour/ProductTourContext";
import type { ProductTourConfig } from "../tour/productTourTypes";
import {
  getDeviceType,
  type AndroidTimerLaunchMode,
} from "../../utils/shortcutUtils";
import { useTWithMaps } from "../../i18n";

type MoreTab = "settings" | "experiment";

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
  const t = useTWithMaps({
    en: {
      "settings.localTitle": "Local preferences",
      "settings.localDescription":
        "Stored on this device and scoped to the current app installation.",
      "settings.globalTitle": "Global preferences",
      "settings.globalDescription":
        "Reserved for future sync and cloud-backed configuration.",
      "settings.timerTitle": "Android TWA timer launch",
      "settings.timerDescription":
        "Choose how the Android TWA should react when a task timer is triggered.",
      "settings.toursTitle": "Guided tours",
      "settings.toursDescription":
        "Each tour is shown as its own card with its completion state, description, and replay action.",
      "settings.completedLabel": "Completed",
      "settings.pendingLabel": "Pending",
      "settings.learnLabel": "Learn",
      "settings.replayLabel": "Replay",
      "settings.anyPageLabel": "Any page can open",
      "settings.experimentalTitle": "Experimental access",
      "settings.experimentalDescription":
        "Enable access to experimental features.",
      "settings.enableExperimentalFeaturesLabel":
        "Enable Experimental Features",
      "settings.fontsizeTitle": "Font Size",
      "settings.fontsizeDescription":
        "Adjust the font size for better readability.",
      "timerMode.none.label": "Do not show timer automatically",
      "timerMode.none.description":
        "Skip the automatic clock/timer launch entirely.",
      "timerMode.show_clock.label": "Show clock/timer UI",
      "timerMode.show_clock.description":
        "Open the native clock UI after the task starts.",
      "timerMode.set_timer.label": "Create timer directly",
      "timerMode.set_timer.description":
        "Use a deep link to open the timer immediately with the task title.",
    },
    "zh-TW": {
      "settings.localTitle": "本地偏好設定",
      "settings.localDescription":
        "儲存在此裝置上，並限定於目前的應用程式安裝。",
      "settings.globalTitle": "全域偏好設定",
      "settings.globalDescription": "保留給未來的同步與雲端支援設定。",
      "settings.timerTitle": "Android TWA 計時器啟動",
      "settings.timerDescription":
        "選擇當任務計時器觸發時，Android TWA 應如何反應。",
      "settings.toursTitle": "導覽教學",
      "settings.toursDescription":
        "每個導覽教學都會以自己的卡片顯示，包含完成狀態、描述和重播操作。",
      "settings.completedLabel": "已完成",
      "settings.pendingLabel": "待完成",
      "settings.learnLabel": "學習",
      "settings.replayLabel": "重播",
      "settings.anyPageLabel": "任何頁面可開啟",
      "settings.experimentalTitle": "實驗性功能",
      "settings.experimentalDescription": "啟用對實驗性功能的存取權限。",
      "settings.enableExperimentalFeaturesLabel": "啟用實驗性功能",
      "settings.fontsizeTitle": "字體大小",
      "settings.fontsizeDescription": "調整字體大小以提高可讀性。",
      "timerMode.none.label": "完全跳過自動開啟時鐘/計時器",
      "timerMode.none.description": "完全跳過自動開啟時鐘/計時器。",
      "timerMode.show_clock.label": "顯示時鐘/計時器介面",
      "timerMode.show_clock.description": "任務開始後開啟原生時鐘介面。",
      "timerMode.set_timer.label": "直接建立計時器",
      "timerMode.set_timer.description":
        "使用深層連結立即以任務標題開啟計時器。",
    },
    ja: {
      "settings.localTitle": "ローカル設定",
      "settings.localDescription":
        "このデバイスに保存され、現在のアプリのインストールに限定されます。",
      "settings.globalTitle": "グローバル設定",
      "settings.globalDescription":
        "将来の同期とクラウド対応の設定のために予約されています。",
      "settings.timerTitle": "Android TWA タイマー起動",
      "settings.timerDescription":
        "タスクタイマーがトリガーされたときに、Android TWA がどのように反応するかを選択します。",
      "settings.toursTitle": "ガイド付きツアー",
      "settings.toursDescription":
        "各ツアーは、完了状態、説明、および再生アクションを含む独自のカードとして表示されます。",
      "settings.completedLabel": "完了",
      "settings.pendingLabel": "保留中",
      "settings.learnLabel": "学ぶ",
      "settings.replayLabel": "再生",
      "settings.anyPageLabel": "任意のページで開くことができます",
      "settings.experimentalTitle": "実験的アクセス",
      "settings.experimentalDescription":
        "実験的機能へのアクセスを有効にします。",
      "settings.enableExperimentalFeaturesLabel": "実験的機能を有効にする",
      "settings.fontsizeTitle": "フォントサイズ",
      "settings.fontsizeDescription":
        "読みやすさを向上させるためにフォントサイズを調整します。",
      "timerMode.none.label": "タイマーを自動的に表示しない",
      "timerMode.none.description":
        "タスクタイマーがトリガーされたときに、Android TWA がどのように反応するかを選択します。",
      "timerMode.show_clock.label": "時計/タイマーUIを表示",
      "timerMode.show_clock.description":
        "タスクが開始された後、ネイティブの時計UIを開きます。",
      "timerMode.set_timer.label": "直接タイマーを作成",
      "timerMode.set_timer.description":
        "ディープリンクを使用して、タスクのタイトルでタイマーを即座に開きます。",
    },
  });

  const timerModeOptions: Array<{
    value: AndroidTimerLaunchMode;
    label: string;
    description: string;
  }> = [
    {
      value: "none",
      label: t("timerMode.none.label"),
      description: t("timerMode.none.description"),
    },
    {
      value: "show_clock",
      label: t("timerMode.show_clock.label"),
      description: t("timerMode.show_clock.description"),
    },
    {
      value: "set_timer",
      label: t("timerMode.set_timer.label"),
      description: t("timerMode.set_timer.description"),
    },
  ];

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
  const {
    startTour,
    activeTour,
    activeStep,
    completedTours,
    tours,
    nextStep,
    isRunning,
    clearCompletedTours,
  } = useProductTourContext();

  const fontSizeScale = useAppStore((state) => state.fontSizeScale);
  const setFontSizeScale = useAppStore((state) => state.setFontSizeScale);

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
        title={t("settings.fontsizeTitle")}
        description={t("settings.fontsizeDescription")}
      >
        <div
          className="rounded-lg border border-gray-100 bg-gray-50 p-3"
          data-tour="change-font-size-card"
        >
          {/* scroll from 50% ~ 200% 顯示50 100, 150, 200*/}
          <input
            type="range"
            className="w-full"
            min={50}
            max={200}
            step={5}
            list="fontSizeScaleList"
            value={fontSizeScale * 100}
            onChange={(e) => {
              setFontSizeScale(Number(e.target.value) / 100);
            }}
          />
          <datalist id="fontSizeScaleList" className="flex justify-between">
            <option value={50} label="50%" />
            <option value={100} label="100%" />
            <option value={150} label="150%" />
            <option value={200} label="200%" />
          </datalist>
        </div>
      </SettingsCard>

      <SettingsCard
        title={t("settings.localTitle")}
        description={t("settings.localDescription")}
      >
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <h4 className="text-sm font-medium text-gray-900">
            {t("settings.timerTitle")}
          </h4>
          <p className="mt-1 text-sm text-gray-600">
            {t("settings.timerDescription")}
          </p>
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
                  data-tour={
                    option.value === "set_timer"
                      ? "android-timer-set-timer-option"
                      : undefined
                  }
                  onChange={() => {
                    setAndroidTimerLaunchMode(option.value);
                    if (
                      option.value === "set_timer" &&
                      isRunning &&
                      activeStep?.id === "android-set-timer"
                    ) {
                      nextStep();
                    }
                  }}
                />
                <span>
                  <span className="font-medium">{option.label}</span>
                  <span className="mt-1 block text-gray-600">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title={t("settings.globalTitle")}
        description={t("settings.globalDescription")}
      >
        <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          Planned: sync selected preferences to Google Sheets via Dexie-backed
          storage.
        </div>
      </SettingsCard>

      <SettingsCard
        title={t("settings.toursTitle")}
        description={t("settings.toursDescription")}
      >
        <div className="space-y-3" data-tour="more-settings-tours-card">
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
              <div
                key={tour.id}
                className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {tour.title}
                      </h4>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          isCompleted
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {isCompleted
                          ? t("settings.completedLabel")
                          : t("settings.pendingLabel")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {tour.description}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-gray-500">
                    {tour.requiredSheet
                      ? `頁面: ${tour.requiredSheet}`
                      : t("settings.anyPageLabel")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleReplayTour(tour)}
                    disabled={isBusy}
                    className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    {isCompleted
                      ? t("settings.replayLabel")
                      : t("settings.learnLabel")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard
        title={t("settings.experimentalTitle")}
        description={t("settings.experimentalDescription")}
      >
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={enableExperimentalFeatures}
            onChange={(e) => setEnableExperimentalFeatures(e.target.checked)}
          />
          {t("settings.enableExperimentalFeaturesLabel")}
        </label>
      </SettingsCard>
    </div>
  );
}

function ExperimentPanel() {
  const t = useTWithMaps({
    en: {
      "experiment.title": "Experimental tools",
      "experiment.description":
        "Temporary features for testing and debugging advanced flows.",
      "experiment.disabledMessage":
        "Enable experimental features first to unlock the advanced tools.",
      "experiment.debugLabel": "Show debug information",
    },
    "zh-TW": {
      "experiment.title": "實驗性工具",
      "experiment.description": "用於測試和調試高級流程的臨時功能。",
      "experiment.disabledMessage": "請先啟用實驗性功能以解鎖高級工具。",
      "experiment.debugLabel": "顯示除錯資訊",
    },
    ja: {
      "experiment.title": "実験的ツール",
      "experiment.description":
        "高度なフローのテストとデバッグのための一時的な機能。",
      "experiment.disabledMessage":
        "高度なツールをアンロックするには、まず実験的な機能を有効にしてください。",
      "experiment.debugLabel": "デバッグ情報を表示",
    },
  });
  const enableExperimentalFeatures = useAppStore(
    (state) => state.experimentalFeaturesEnabled,
  );
  const showGlobalToast = useAppStore((state) => state.showGlobalToast);
  const [showDebug, setShowDebug] = useState(false);

  const handleAlarmTest = async () => {
    const testUrl = "nonblockinglife://show-clock";
    try {
      window.location.href = testUrl;
      showGlobalToast({
        message: "Attempting to open the Android clock UI for system test.",
        duration: 3000,
      });
    } catch {
      window.alert(
        "Unable to launch the Android clock intent from this environment.",
      );
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div className="space-y-1">
          <h3 className="font-semibold text-amber-900">
            {t("experiment.title")}
          </h3>
          <p className="text-sm text-amber-800">
            {t("experiment.description")}
          </p>
        </div>

        {!enableExperimentalFeatures ? (
          <div className="mt-4 rounded-md bg-white/70 p-3 text-sm text-amber-800">
            {t("experiment.disabledMessage")}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {getDeviceType() === "TWA" ? (
              <div className="rounded-lg border border-amber-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Alarm test
                  </h4>
                  <button
                    type="button"
                    onClick={() => void handleAlarmTest()}
                    className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
                  >
                    Test Alarm
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Attempts to open the Android clock UI for a native
                  connectivity check.
                </p>
              </div>
            ) : null}

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showDebug}
                onChange={(e) => setShowDebug(e.target.checked)}
              />
              {t("experiment.debugLabel")}
            </label>

            {showDebug && <DebugLogPage />}
          </div>
        )}
      </section>
    </div>
  );
}

export function MorePageContent() {
  const t = useTWithMaps({
    en: {
      heading: "More",
      description:
        "Control local preferences, future global sync options, and experimental tools.",
      "tabs.settings": "Settings",
      "tabs.experiment": "Experiment",
    },
    "zh-TW": {
      heading: "更多",
      description: "控制本地偏好設定、未來的全域同步選項，以及實驗性工具。",
      "tabs.settings": "設定",
      "tabs.experiment": "實驗",
    },
    ja: {
      heading: "その他",
      description:
        "ローカル設定、将来のグローバル同期オプション、および実験的なツールを制御します。",
      "tabs.settings": "設定",
      "tabs.experiment": "実験",
    },
  });
  const [activeTab, setActiveTab] = useState<MoreTab>("settings");
  const { nextStep, isRunning, activeStep, activeTour } =
    useProductTourContext();

  const handleTabChange = (tab: MoreTab) => {
    setActiveTab(tab);
    if (
      tab === "settings" &&
      isRunning &&
      activeStep?.target === "[data-tour='more-settings-tab']"
    ) {
      nextStep();
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold">{t("heading")} ⚗️</h2>
        <p className="text-sm text-gray-600">{t("description")}</p>
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
          {t("tabs.settings")}
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
          {t("tabs.experiment")}
        </button>
      </div>

      {activeTab === "settings" ? <SettingsPanel /> : <ExperimentPanel />}
    </div>
  );
}
