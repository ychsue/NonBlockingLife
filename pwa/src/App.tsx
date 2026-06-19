import { useCallback, useEffect, useRef, useState } from "react";
import { useUrlAction, SheetName } from "./hooks/useUrlAction";
import { useAppStore } from "./store/appStore";
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

type AllPages = SheetName | "selection_cache" | "log" | "guide";

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
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const defaultTitleRef = useRef(BASE_TITLE);
  const previousRunningTaskIdRef = useRef<string | null>(null);
  const { isMobile } = useResponsiveTable();

  const nextLocale =
    locale === "zh-TW" ? "en" : locale === "en" ? "ja" : "zh-TW";
  const localeLabelMap = {
    "zh-TW": "中文",
    en: "EN",
    ja: "日本語",
  } as const;
  const currentLocaleLabel = localeLabelMap[locale];
  const nextLocaleLabel =
    localeLabelMap[nextLocale];

  useEffect(() => {
    // 初始加载时获取当前正在运行的任务
    loadRunningTask();
  }, [loadRunningTask]);

  useEffect(() => {
    defaultTitleRef.current = document.title || BASE_TITLE;
  }, [BASE_TITLE]);

  useEffect(() => {
    type BadgeNavigator = Navigator & {
      setAppBadge?: (contents?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };

    const nav = navigator as BadgeNavigator;
    const notify = (title: string, body: string) => {
      if (typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return;
      // if (!document.hidden) return;
      try {
        new Notification(title, { body, tag: "nbl-running-task" });
      } catch (e) {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          void navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, { body, tag: "nbl-running-task" });
          }).catch((err)=> console.warn("Failed to show notification via service worker:", err)); //不曉得與下面的code是否有差
          // navigator.serviceWorker.controller.postMessage({
          //   type: "show-notification",
          //   title,
          //   options: { body, tag: "nbl-running-task" },
          // });
        } else {
          console.warn("Unable to show notification:", e);
        }
      }
    };

    if (!runningTask) {
      document.title = defaultTitleRef.current;
      if (nav.clearAppBadge) {
        void nav.clearAppBadge().catch(() => undefined);
      }

      if (previousRunningTaskIdRef.current) {
        notify(
          locale === "zh-TW" ? "工作已結束" : locale === "ja" ? "作業が終了しました" : "Work session ended",
          locale === "zh-TW"
            ? "Non-Blocking Life 已離開工作中狀態。"
            : locale === "ja"
              ? "Non-Blocking Life は作業中ステータスを終了しました。"
              : "Non-Blocking Life is no longer in running mode.",
        );
      }

      previousRunningTaskIdRef.current = null;
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

    if (previousRunningTaskIdRef.current !== runningTask.taskId) {
      notify(
        locale === "zh-TW" ? "工作進行中" : locale === "ja" ? "作業中" : "Work session running",
        locale === "zh-TW"
          ? `${runningTask.taskId} 已開始，保持專注。`
          : locale === "ja"
            ? `${runningTask.taskId} を開始しました。`
            : `${runningTask.taskId} has started. Stay focused.`,
      );
    }

    previousRunningTaskIdRef.current = runningTask.taskId;

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
        locale === "zh-TW" ? "前往啟用" : locale === "ja" ? "有効化する" : "Enable",
      onAction: () => setCurrentSheet("guide"),
    });
  }, [runningTask, locale, setCurrentSheet, showGlobalToast, NOTIFICATION_NUDGE_SESSION_KEY]);

  useEffect(() => {
    let isCancelled = false;

    const checkTutorialVisibility = async () => {
      const hasUrlParams = window.location.search.trim().length > 0;
      const isDismissedInSession = sessionStorage.getItem(TUTORIAL_SESSION_KEY) === "1";

      if (hasUrlParams || isDismissedInSession) {
        return;
      }

      const [inboxCount, taskPoolCount, scheduledCount] = await Promise.all([
        db.inbox.count(),
        db.task_pool.count(),
        db.scheduled.count(),
      ]);

      if (!isCancelled && (/*inboxCount === 0 ||*/ taskPoolCount === 0 || scheduledCount === 0)) {
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
          db.change_log.clear(),
          db.sync_state.clear(),
        ]);
      },
    );

    setToast("✅ Database reset successfully");
    setShowResetConfirm(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div
        className={`sticky top-0 z-40 border-b border-gray-200 ${runningTask ? "bg-amber-50/95 backdrop-blur-sm" : "bg-white"}`}
      >
        <header className="border-b border-gray-200">
          <div className={`max-w-7xl mx-auto px-4 py-4 flex justify-between items-center gap-3 ${runningTask ? "flex-wrap" : ""}`}>
            <div className="min-w-0 flex flex-col flex-shrink-1">
              <h1 className="text-2xl font-bold text-gray-800">
                📱 Non-Blocking Life
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600">
                  Local-first Task Management
                </p>
                {!isMobile && <SyncStatus />}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
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
              {isMobile && (
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg text-xl leading-none"
                  aria-label="選單"
                >
                  {showMobileMenu ? "✕" : "☰"}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* 手機選單下拉面板 */}
        {isMobile && showMobileMenu && (
          <div className="bg-white border-t border-gray-100 px-4 py-3 shadow-md">
            <SyncStatus />
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
        <Toast message={toast} duration={3000} onClose={() => setToast("")} />
      )}

      {showTutorial && (
        <TutorialCarousel
          onClose={handleCloseTutorial}
          onOpenTaskPool={() => handleOpenTutorialSheet("task_pool")}
          onOpenScheduled={() => handleOpenTutorialSheet("scheduled")}
        />
      )}
    </div>
  );
}
