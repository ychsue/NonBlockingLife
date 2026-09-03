import { useCallback, useEffect, useRef, useState } from "react";
import { useUrlAction, SheetName } from "./hooks/useUrlAction";
import {
  ALARM_SYNC_TARGET_CLOCK,
  ALARM_SYNC_TARGET_EXACT,
  ALARM_SYNC_TARGET_NONE,
  useAppStore,
} from "./store/appStore";
import { useResponsiveTable } from "./hooks/useResponsiveTable";
import { TabNavigation } from "./components/TabNavigation";
import { Toast } from "./components/Toast";
import { SyncStatus } from "./components/SyncStatus";
import { InboxTable } from "./components/tables/InboxTable";
import { TaskPoolTable } from "./components/tables/TaskPoolTable";
import { ScheduledTable } from "./components/tables/ScheduledTable";
import { MicroTasksTable } from "./components/tables/MicroTasksTable";
import { SelectionCacheTable } from "./components/tables/SelectionCacheTable";
import { LogTable } from "./components/tables/LogTable";
import { GuidePage } from "./components/GuidePage";
import { TutorialCarousel } from "./components/TutorialCarousel";
import { db } from "./db/index";
import "./styles.css";
import { ResourceTable } from "./components/tables/ResourceTable";
import { MacroTable } from "./components/tables/MacroTable";
import { MorePage } from "./components/MorePage";
import { useDialogStore } from "./store/dialogStore";
import { GlobalDialog } from "./GlobalDialog";
import { ProductTourProvider } from "./components/tour/ProductTourContext";
import { ProductTourWrapper } from "./components/tour/ProductTourWrapper";
import { useProductTour } from "./components/tour/useProductTour";
import { canAutoStartTour } from "./components/tour/productTourUtils";
import { mimicTwaMessageChannel, useTwaBridge } from "./hooks/useTwaBridge";
import { sleep } from "./utils/timeUtils";
import { useAlarmQueueWatcher } from "./hooks/useAlarmQueueWatcher";
import {
  AlarmItem2TWA,
  getAlarmItems2TWA,
  getPlanFromTWAResults,
} from "./utils/alarmQueue";
import { AlarmQueueWatcherProvider } from "./components/tour/AlarmQueueWatcher";
import { useTwaRpc } from "./hooks/useTwaRpc";
import _ from "lodash";
import { useTWithMaps } from "./i18n";

type AllPages =
  | SheetName
  | "selection_cache"
  | "log"
  | "guide"
  | "macro"
  | "debug";

export default function App() {
  const TUTORIAL_SESSION_KEY = "nbl-home-tutorial-dismissed";
  const NOTIFICATION_NUDGE_SESSION_KEY = "nbl-notification-nudge-dismissed";
  const BASE_TITLE = "Non-Blocking Life";
  const currentSheet = useAppStore((state) => state.currentSheet);
  const setCurrentSheet = useAppStore((state) => state.setCurrentSheet);
  const [toast, setToast] = useState("");
  const globalToast = useAppStore((state) => state.globalToast);
  const showGlobalToast = useAppStore((state) => state.showGlobalToast);
  const clearGlobalToast = useAppStore((state) => state.clearGlobalToast);
  const runningTask = useAppStore((state) => state.runningTask);
  const loadRunningTask = useAppStore((state) => state.loadRunningTask);
  const locale = useAppStore((state) => state.locale);
  const setLocale = useAppStore((state) => state.setLocale);
  const debugMode = useAppStore((state) => state.debugMode);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const productTourState = useProductTour(currentSheet);
  const {
    activeTour,
    activeStep,
    isRunning,
    startTour,
    stopTour,
    completeTour,
    nextStep,
    resetTour,
    tours,
  } = productTourState;
  const defaultTitleRef = useRef(BASE_TITLE);
  const { isMobile, isTooSmall } = useResponsiveTable();

  const nextLocale =
    locale === "zh-TW" ? "en" : locale === "en" ? "ja" : "zh-TW";
  const localeLabelMap = {
    "zh-TW": "中文",
    en: "EN",
    ja: "日本語",
  } as const;
  const currentLocaleLabel = localeLabelMap[locale];
  const nextLocaleLabel = localeLabelMap[nextLocale];
  // For Global Dialog
  const dialogConfig = useDialogStore((state) => state.dialogConfig);
  const openDialog = useDialogStore((state) => state.openDialog);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const AQWatcher = useAlarmQueueWatcher(true);
  const { updateTableBasedOnScheduled, queueItems, applySyncPlan } = AQWatcher;
  const { sendRequest } = useTwaRpc();

  const fontSizeScale = useAppStore((state) => state.fontSizeScale);

  const t = useTWithMaps({
    en: {
      "useTwaBridge.twaNotAvailable":
        "There might be an update that caused the channel to break.\n\r" +
        "Please swipe away this app and reopen it to fix this issue.",
      "即將設定：": "Setting up: (Note, if it jumps to the system clock, please press cancel, otherwise the alarm may not be set correctly)",
      "鬧鐘:": "Alarm:",
      "通知:(可能因重開機等因素丟失)":
        "Notification: (may be lost due to reboot or other factors)",
      "若想更動，請到Scheduled頁面修改。":
        "If you want to make changes, please modify it on the Scheduled page.",
    },
    "zh-TW": {
      "useTwaBridge.twaNotAvailable":
        "可能有更新，導致channel斷掉。\n\r" +
        "請滑掉這個APP，再重開，好修復這個的問題。",
      "即將設定：": "即將設定：(注意，若他跳轉到系統時鐘，請按取消，否則鬧鐘可能無法正確設定)",
      "鬧鐘:": "鬧鐘:",
      "通知:(可能因重開機等因素丟失)": "通知:(可能因重開機等因素丟失)",
      "若想更動，請到Scheduled頁面修改。": "若想更動，請到Scheduled頁面修改。",
    },
    ja: {
      "useTwaBridge.twaNotAvailable":
        "更新の影響でchannelが切断されている可能性があります。\n\r" +
        "このアプリをスワイプして閉じ、再度開くことで問題を修復してください。",
      "即將設定：": "設定予定：(注意、システム時計にジャンプした場合はキャンセルを押してください。そうしないとアラームが正しく設定されない可能性があります)",
      "鬧鐘:": "アラーム：",
      "通知:(可能因重開機等因素丟失)":
        "通知：（再起動などの要因で失われる可能性があります）",
      "若想更動，請到Scheduled頁面修改。":
        "変更したい場合は、Scheduledページで修正してください。", 
    },
  });

  // 與 TWA 相關
  const needToCheckTwaChannel = useAppStore(
    (state) => state.needToCheckTwaChannel,
  );
  const setNeedToCheckTwaChannel = useAppStore(
    (state) => state.setNeedToCheckTwaChannelDebounced,
  );
  const [alarmSetup, setAlarmSetup] = useState<{
    selectedClockApp: { packageName: string; label: string } | null;
    exactAlarmAllowed: boolean;
  } | null>(null);

  const [twaClocks, setTwaClocks] = useState<{
    apps: { packageName: string; label: string }[];
    selectedPackageName: string;
  } | null>(null);
  const [twaSelectedClockAppResult, setTwaSelectedClockAppResult] = useState<{
    packageName: string;
    label: string;
  } | null>(null);

  // Alarm Queue Watcher
  const alarmSyncTargets = useAppStore((state) => state.alarmSyncTargets);
  const AQ2TWA = useRef<{
    earliestClockItem?: AlarmItem2TWA;
    exactItems: AlarmItem2TWA[];
  }>({ earliestClockItem: undefined, exactItems: [] });

  // 如果 alarmSyncTargets 有變化，則更新 db.alarm_queue 的狀態
  useEffect(() => {
    if (alarmSyncTargets === ALARM_SYNC_TARGET_NONE) return;
    void updateTableBasedOnScheduled(alarmSyncTargets);
  }, [alarmSyncTargets, updateTableBasedOnScheduled]);

  // Listen for TWA messages
  if (import.meta.env.DEV) {
    useEffect(() => {
      mimicTwaMessageChannel();
    }, []);
  }

  // 如果 alarmSyncTargets !=0 && isTwaAvailable === false，那就10秒後再嘗試一次，因為 TWA 可能還沒啟動，若還是沒有，那就告知使用者，請使用者滑掉這個APP，再重開，好修復這個channel斷掉的問題
  useEffect(() => {
    if (needToCheckTwaChannel) {
      const timer = setTimeout(() => {
        sendRequest("nbl:ping", {}, { timeoutMs: 2000, expectResponse: true })
          .then((res) => {
            if ((res as any)?.type === "nbl:pong") {
              console.log("[App.tsx] TWA is available after retry");
            } else {
              console.warn("[App.tsx] TWA is not available after 10 seconds");
              alert(t("useTwaBridge.twaNotAvailable"));
            }
          })
          .catch((err) => {
            console.error("[App.tsx] Error pinging TWA after 10 seconds:", err);
            alert(t("useTwaBridge.twaNotAvailable"));
          })
          .finally(() => {
            setNeedToCheckTwaChannel(false);
          });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [needToCheckTwaChannel, alarmSyncTargets, sendRequest]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSizeScale * 100}%`;
  }, [fontSizeScale]);

  const syncTwaSettings = useCallback(async () => {
    try {
      let res: unknown = null;
      // 1. 確認 TWA 連線狀態，若尚未連線則嘗試重新連線
      res = await sendRequest(
        "nbl:ping",
        {},
        { timeoutMs: 2000, expectResponse: true },
      );
      if (!res || (res as any).type !== "nbl:pong") {
        console.warn("[App.tsx] 1. TWA is not available");
        setNeedToCheckTwaChannel(true);
        return;
      }
      setNeedToCheckTwaChannel(false);
      console.log("[App.tsx] 1. TWA is available");

      //2. 若 TWA 已連線，且尚未取得鬧鐘(clock & exact alarm)設定狀態，則嘗試查詢鬧鐘設定狀態
      res = await sendRequest(
        "nbl:query-alarm-setup",
        {},
        { timeoutMs: 1000, expectResponse: true },
      );
      if (!res || (res as any).type !== "nbl:alarm-setup") {
        console.warn("[App.tsx] 2. Failed to query alarm setup from TWA");
        return;
      }
      setAlarmSetup({
        selectedClockApp: (res as any).selectedClockApp || null,
        exactAlarmAllowed: (res as any).exactAlarmAllowed || false,
      });
      setTwaSelectedClockAppResult((res as any).selectedClockApp || null);
      let selectedClockApp = (res as any).selectedClockApp || null;
      let exactAlarmAllowed = (res as any).exactAlarmAllowed || false;

      //3. 若 TWA 已連線，且已取得鬧鐘設定狀態，若沒有selectedClockApp，則查詢可用的鬧鐘應用程式列表讓使用者選
      if (
        (alarmSyncTargets & ALARM_SYNC_TARGET_CLOCK) !== 0 &&
        !selectedClockApp?.packageName
      ) {
        res = await sendRequest(
          "nbl:query-clock-apps",
          {},
          { timeoutMs: 1000, expectResponse: true },
        );
        if (!res || (res as any).type !== "nbl:clock-apps") {
          console.warn("[App.tsx] 3. Failed to query clock apps from TWA");
          return;
        }
        const resTwaClocks = {
          apps: (res as any).apps || [],
          selectedPackageName: (res as any).selectedPackageName || "",
        };
        setTwaClocks(resTwaClocks);
        // 4. 叫出 openDialog 讓使用者選擇 Clock App
        const clockAppResult = await openDialog({
          title: "TWA Clock App Not Selected",
          message:
            "Please select a clock app in TWA settings to enable alarm sync.",
          actions: [{ id: "ok", label: "OK" }],
          selects: [
            {
              name: "clockApp",
              label: "Clock App",
              options:
                resTwaClocks.apps.map(
                  (app: { packageName: string; label: string }) => ({
                    value: app.packageName,
                    label: app.label,
                  }),
                ) ?? [],
              defaultValue: resTwaClocks.selectedPackageName || "",
            },
          ],
        });
        if (
          clockAppResult.actionId === "ok" &&
          clockAppResult.formData.clockApp
        ) {
          const selectedPackageName = clockAppResult.formData.clockApp;
          setTwaSelectedClockAppResult({
            packageName: selectedPackageName,
            label:
              resTwaClocks.apps.find(
                (app: { packageName: string; label: string }) =>
                  app.packageName === selectedPackageName,
              )?.label || "",
          });
        }
      }
      // 5. 若 TWA 已連線，且已取得鬧鐘設定狀態，若沒有 exactAlarmAllowed，則要求 TWA 端的精確鬧鐘權限
      if (
        (alarmSyncTargets & ALARM_SYNC_TARGET_CLOCK) !== 0 &&
        !exactAlarmAllowed
      ) {
        res = await sendRequest(
          "nbl:request-exact-alarm-permission",
          {},
          { timeoutMs: 1000, expectResponse: false },
        );
        // 6. 由於他是默默地做，所以需要 openDialog 告知使用者若選用Notification提醒，就必須允許精確鬧鐘的權限
        openDialog({
          title: "Enable Exact Alarm Permission",
          message:
            "To ensure accurate notifications, please enable the exact alarm permission in your TWA settings.",
          actions: [{ id: "ok", label: "OK" }],
        });
      }

      // 7. 現在可以同步鬧鐘了，將 queueItems 轉換為 TWA 所需的格式，並發送給 TWA
      if (queueItems.length > 0) {
        const { earliestClockItem, exactItems } = getAlarmItems2TWA(queueItems);
        if (
          _.isEqual(AQ2TWA.current.earliestClockItem, earliestClockItem) &&
          _.isEqual(AQ2TWA.current.exactItems, exactItems)
        ) {
          console.log("[App.tsx] 7. Alarms are already up to date in TWA");
          return;
        }
        AQ2TWA.current = { earliestClockItem, exactItems };
        // 7.1 丟出 alert 提醒使用者鬧鐘準備設定
        if (!earliestClockItem && exactItems.length === 0) {
          console.log("[App.tsx] 7. No alarms to set in TWA");
          return;
        }
        function padZero(num: number): string {
          return num.toString().padStart(2, "0");
        }
        const userConfirmed = confirm(
          t("即將設定：") +
            "\n\r" +
            (earliestClockItem
                ?t("鬧鐘:") +
                "\n\r" +
                `  [${padZero(earliestClockItem.time[0])}:${padZero(earliestClockItem.time[1])}] ${earliestClockItem.label}` +
                "\n\r"
              : "") +
            (exactItems.length > 0
                ? t("通知:(可能因重開機等因素丟失)") +
                "\n\r" +
                `${exactItems.map((item) => `  [${item.time[0]}-${padZero(item.time[1])}-${padZero(item.time[2])} ${padZero(item.time[3])}:${padZero(item.time[4])}] ${item.label}`).join("\n\r")}`
              : "") +
            "\n\r" +
            t("若想更動，請到Scheduled頁面修改。"),
        );
        if (!userConfirmed) {
          console.log("[App.tsx] 7. User cancelled setting alarms in TWA 因為跳轉到系統時鐘應該要取消");
          return;
        }
        res = await sendRequest(
          "nbl:set-alarms",
          { alarms: [earliestClockItem, ...exactItems].filter(Boolean) },
          { timeoutMs: 10000, expectResponse: true },
        );
        if (!res || (res as any).type !== "nbl:set-alarms-result") {
          console.warn("[App.tsx] 7. Failed to set alarms in TWA");
          return;
        }
        // 7.2 處理 TWA 回傳的結果，並更新 db.alarm_queue 的 clockState 與 exactState
        const twaResults = (res as any).results || [];
        const syncPlan = getPlanFromTWAResults(twaResults, queueItems);
        await applySyncPlan(syncPlan);
        console.log("[App.tsx] 7. Sync plan applied:", syncPlan);
      }
    } catch (e) {
      console.error("Failed to sync TWA settings:", e);
    }
  }, [queueItems, alarmSyncTargets, sendRequest, applySyncPlan, openDialog]);

  useEffect(() => {
    void syncTwaSettings();
  }, [syncTwaSettings]);

  // For Global Dialog
  useEffect(() => {
    if (dialogConfig && dialogRef.current) {
      dialogRef.current.showModal();
    } else if (dialogRef.current) {
      dialogRef.current.close();
    }
  }, [dialogConfig]);

  useEffect(() => {
    // 初始加载时获取当前正在运行的任务
    loadRunningTask();
  }, [loadRunningTask]);

  useEffect(() => {
    defaultTitleRef.current = document.title || BASE_TITLE;
  }, [BASE_TITLE]);

  /**
   *  一開始打開 App 時，或runningTask有變化，
   *  - 設定 BadgeNavigator 的 badge
   */
  useEffect(() => {
    type BadgeNavigator = Navigator & {
      setAppBadge?: (contents?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };

    const nav = navigator as BadgeNavigator;

    if (!runningTask) {
      document.title = defaultTitleRef.current;
      if (nav.clearAppBadge) {
        void nav.clearAppBadge().catch(() => undefined);
      }
      return;
    }

    const updateRunningTitle = () => {
      const elapsedMinutes = runningTask.startAt
        ? Math.max(0, Math.floor((Date.now() - runningTask.startAt) / 60000))
        : 0;
      const taskLabel = runningTask.title || runningTask.taskId;
      document.title = `⏳ ${elapsedMinutes}m ${taskLabel}`;
    };

    updateRunningTitle();
    const intervalId = window.setInterval(updateRunningTitle, 30000);

    if (nav.setAppBadge) {
      void nav.setAppBadge(1).catch(() => undefined);
    }

    return () => {
      window.clearInterval(intervalId);
    };
  }, [runningTask, locale]);

  useEffect(() => {
    if (!runningTask) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return;
    if (sessionStorage.getItem(NOTIFICATION_NUDGE_SESSION_KEY) === "1") return;

    sessionStorage.setItem(NOTIFICATION_NUDGE_SESSION_KEY, "1");
    showGlobalToast({
      message:
        locale === "zh-TW"
          ? "可在說明頁啟用背景通知，開始/結束工作時會有提醒。"
          : locale === "ja"
            ? "ガイドページで通知を有効にすると、作業の開始/終了を通知できます。"
            : "Enable background notifications in Guide to get start/end work alerts.",
      duration: 7000,
      actionLabel:
        locale === "zh-TW"
          ? "前往啟用"
          : locale === "ja"
            ? "有効化する"
            : "Enable",
      onAction: () => setCurrentSheet("guide"),
    });
  }, [
    runningTask,
    locale,
    setCurrentSheet,
    showGlobalToast,
    NOTIFICATION_NUDGE_SESSION_KEY,
  ]);

  useEffect(() => {
    let isCancelled = false;

    const checkTutorialVisibility = async () => {
      const hasUrlParams = window.location.search.trim().length > 0;
      const isDismissedInSession =
        sessionStorage.getItem(TUTORIAL_SESSION_KEY) === "1";

      if (hasUrlParams || isDismissedInSession) {
        return;
      }

      const [inboxCount, taskPoolCount, scheduledCount] = await Promise.all([
        db.inbox.count(),
        db.task_pool.count(),
        db.scheduled.count(),
      ]);

      if (
        !isCancelled &&
        /*inboxCount === 0 ||*/ (taskPoolCount === 0 || scheduledCount === 0)
      ) {
        setShowTutorial(true);
      }
    };

    void checkTutorialVisibility();

    return () => {
      isCancelled = true;
    };
  }, [TUTORIAL_SESSION_KEY]);

  const handleCloseTutorial = useCallback(() => {
    sessionStorage.setItem(TUTORIAL_SESSION_KEY, "1");
    setShowTutorial(false);
  }, [TUTORIAL_SESSION_KEY]);

  useEffect(() => {
    if (showTutorial) {
      stopTour();
      return; // 因為正在跑 tutorial，所以不需要再跑 product tour，會互相干擾
      }
    if (!currentSheet || activeTour) return;
    const completedTours = JSON.parse(
      window.localStorage.getItem("completed_tours") ?? "[]",
    ) as string[];
    const lastTourTime = Number(
      window.localStorage.getItem("last_tour_time") ?? "0",
    );
    const eligibleTour = tours.find((tour) =>
      canAutoStartTour({ tour, currentSheet, completedTours, lastTourTime }),
    );
    if (eligibleTour) {
      startTour(eligibleTour.id);
    }
  }, [activeTour, currentSheet, startTour, tours, showTutorial]);

  const handleOpenTutorialSheet = useCallback(
    (sheet: SheetName) => {
      sessionStorage.setItem(TUTORIAL_SESSION_KEY, "1");
      setCurrentSheet(sheet);
      setShowTutorial(false);
    },
    [setCurrentSheet, TUTORIAL_SESSION_KEY],
  );

  const handleUrlNavigate = useCallback(
    (sheet: SheetName | "selection_cache") => {
      setCurrentSheet(sheet);
    },
    [setCurrentSheet],
  );

  // 監聽 iPhone Shortcut URL 參數
  useUrlAction({
    onNavigate: handleUrlNavigate,
    onSuccess: setToast,
    clientId: "iphone-webkit",
  });

  const renderTable = () => {
    switch (currentSheet) {
      case "inbox":
        return <InboxTable />;
      case "task_pool":
        return <TaskPoolTable />;
      case "scheduled":
        return <ScheduledTable />;
      case "micro_tasks":
        return <MicroTasksTable />;
      case "selection_cache":
        return <SelectionCacheTable />;
      case "log":
        return <LogTable />;
      case "resource":
        return <ResourceTable />;
      case "guide":
        return <GuidePage />;
      case "macro":
        return <MacroTable />;
      case "debug":
        return <MorePage />;
      default:
        return <InboxTable />;
    }
  };

  const handleResetDB = async () => {
    await db.transaction(
      "rw",
      [
        db.log,
        db.dashboard,
        db.inbox,
        db.task_pool,
        db.scheduled,
        db.selection_cache,
        db.micro_tasks,
        db.macro,
        db.macro_execution,
        db.app_log,
        db.change_log,
        db.sync_state,
      ],
      async () => {
        await Promise.all([
          db.log.clear(),
          db.dashboard.clear(),
          db.inbox.clear(),
          db.task_pool.clear(),
          db.scheduled.clear(),
          db.selection_cache.clear(),
          db.micro_tasks.clear(),
          db.macro.clear(),
          db.macro_execution.clear(),
          db.app_log.clear(),
          db.change_log.clear(),
          db.sync_state.clear(),
        ]);
      },
    );

    setToast("✅ Database reset successfully");
    setShowResetConfirm(false);
  };

  return (
    <AlarmQueueWatcherProvider watcher={AQWatcher}>
      <ProductTourProvider value={productTourState}>
        <div className="min-h-screen bg-white flex flex-col">
          {/* Header */}
          <div
            className={`sticky top-0 z-40 border-b border-gray-200 ${runningTask ? "bg-amber-50/95 backdrop-blur-sm" : "bg-white"}`}
          >
            <header className="border-b border-gray-200">
              <div
                className={`max-w-7xl mx-auto px-4 py-4 flex justify-between items-center gap-3`}
              >
                <div className="min-w-0 flex flex-col shrink">
                  {isTooSmall && (
                    <h2 className="text-l font-bold text-gray-800 truncate">
                      📱 Non-Blocking Life
                    </h2>
                  )}
                  {!!!isTooSmall && (
                    <h1 className="text-2xl font-bold text-gray-800">
                      📱 Non-Blocking Life
                    </h1>
                  )}
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm text-gray-600">
                      {isTooSmall
                        ? "Task Management"
                        : "Local-first Task Management"}
                    </p>
                    {!isMobile && (
                      <div className="flex flex-row flex-wrap space-between gap-1">
                        <SyncStatus />
                        <button
                          onClick={() => {
                            setCurrentSheet("debug");
                            if (
                              isRunning &&
                              activeStep?.target === "[data-tour='more-button']"
                            ) {
                              nextStep();
                            }
                          }}
                          className="px-3 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-100 shrink"
                          aria-label="Open debug logs"
                          title="Open debug logs"
                          data-tour="more-button"
                        >
                          ...
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-auto shrink-0">
                  {/* Language toggle */}
                  <button
                    onClick={() => setLocale(nextLocale)}
                    className="px-2 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-100"
                    aria-label={`Switch language, current ${currentLocaleLabel}, next ${nextLocaleLabel}`}
                    title={`Current: ${currentLocaleLabel} / Next: ${nextLocaleLabel}`}
                  >
                    <span className="grid grid-cols-[auto_auto] gap-x-2 leading-tight text-left">
                      <span className="text-[10px] text-gray-500">Now</span>
                      <span>{currentLocaleLabel}</span>
                      <span className="text-[10px] text-gray-500">Next</span>
                      <span>{nextLocaleLabel}</span>
                    </span>
                  </button>
                  {/* 手機漢堡選單按鈕 */}
                  <button
                    onClick={() => {
                      if (
                        isRunning &&
                        activeStep?.target === "[data-tour='menu-button']"
                      ) {
                        setShowMobileMenu(true);
                        nextStep();
                        return;
                      }
                      setShowMobileMenu((value) => !value);
                    }}
                    className={
                      `p-2 text-gray-600 hover:bg-gray-100 rounded-lg text-xl leading-none` +
                      (isMobile ? " " : " hidden w-0")
                    }
                    data-tour={"menu-button"}
                    aria-label="選單"
                  >
                    {showMobileMenu ? "✕" : "☰"}
                  </button>
                </div>
              </div>
              {runningTask && (
                <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-white/90 px-3 py-1.5 text-sm text-amber-900 shadow-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                  </span>
                  <span className="font-medium">
                    {runningTask.title || runningTask.taskId}
                  </span>
                  <span className="hidden sm:inline text-amber-700/80">
                    {runningTask.startAt
                      ? `${Math.max(0, Math.floor((Date.now() - runningTask.startAt) / 60000))}m`
                      : "Running"}
                  </span>
                  <button
                    onClick={() => setCurrentSheet("selection_cache")}
                    className="ml-1 rounded-full p-1.5 text-amber-700 hover:bg-amber-100"
                    aria-label="Go to Selection Cache"
                    title="Go to Selection Cache"
                  >
                    📝
                  </button>
                </div>
              )}
            </header>

            {/* 手機選單下拉面板 */}
            {isMobile && showMobileMenu && (
              <div className="bg-white border-t border-gray-100 px-4 py-3 shadow-md flex flex-wrap flex-row gap-1">
                <SyncStatus />
                <button
                  onClick={() => {
                    setCurrentSheet("debug");
                    if (
                      isRunning &&
                      activeStep?.target === "[data-tour='more-button']"
                    ) {
                      nextStep();
                    }
                  }}
                  className="px-3 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-100 shrink"
                  aria-label="Open debug logs"
                  title="Open debug logs"
                  data-tour="more-button"
                >
                  ...
                </button>
              </div>
            )}

            {/* Tabs */}
            <TabNavigation />
          </div>

          {/* Main Content */}
          <main className="flex-1 bg-gray-50">{renderTable()}</main>

          {/* Footer with Dev Tools */}
          {import.meta.env.DEV && (
            <footer className="border-t border-gray-200 bg-white p-4 flex justify-end gap-2">
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                ⚠️ Reset DB (Dev)
              </button>
            </footer>
          )}

          {/* Reset Confirmation Dialog */}
          {showResetConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-sm">
                <h3 className="text-lg font-bold text-red-600 mb-2">
                  ⚠️ Reset Database?
                </h3>
                <p className="text-gray-600 mb-4">
                  This will delete all data. This action cannot be undone.
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetDB}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Confirm Reset
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toast Notification */}
          {globalToast && (
            <Toast
              message={globalToast.message}
              duration={globalToast.duration ?? 3000}
              actionLabel={globalToast.actionLabel}
              onAction={() => {
                globalToast.onAction?.();
                clearGlobalToast();
              }}
              onClose={clearGlobalToast}
            />
          )}

          {toast && !globalToast && (
            <Toast
              message={toast}
              duration={3000}
              onClose={() => setToast("")}
            />
          )}

          <ProductTourWrapper
            tour={activeTour}
            step={activeStep}
            run={isRunning}
            stopTour={stopTour}
            onComplete={() => completeTour(activeTour?.id ?? "")}
            onNext={nextStep}
            onReset={resetTour}
          />

          {showTutorial && (
            <TutorialCarousel
              onClose={handleCloseTutorial}
              onOpenTaskPool={() => handleOpenTutorialSheet("task_pool")}
              onOpenScheduled={() => handleOpenTutorialSheet("scheduled")}
            />
          )}

          {/* Global Dialog */}
          <GlobalDialog ref={dialogRef} />
        </div>
      </ProductTourProvider>
    </AlarmQueueWatcherProvider>
  );
}
