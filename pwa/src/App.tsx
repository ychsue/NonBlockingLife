import { useCallback, useEffect, useState } from "react";
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
import { db } from "./db/index";
import "./styles.css";
import { ResourceTable } from "./components/tables/ResourceTable";

type AllPages = SheetName | "selection_cache" | "log" | "guide";

export default function App() {
  const currentSheet = useAppStore((state) => state.currentSheet);
  const setCurrentSheet = useAppStore((state) => state.setCurrentSheet);
  const [toast, setToast] = useState("");
  const globalToast = useAppStore((state) => state.globalToast);
  const clearGlobalToast = useAppStore((state) => state.clearGlobalToast);
  const runningTask = useAppStore((state) => state.runningTask);
  const loadRunningTask = useAppStore((state) => state.loadRunningTask);
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { isMobile } = useResponsiveTable();

  useEffect(() => {
    // 初始加载时获取当前正在运行的任务
    loadRunningTask();
  }, []);

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
     {/* 當runningTask存在時，背景變成閃爍的顏色，順便多一個iconbutton可以跳到SelectionCacheTable */}
      <div className={`border-b border-gray-200 sticky top-0 z-40 ${runningTask ? "bg-yellow-100 animate-pulse" : "bg-white"}`}>
        <header className="border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div>
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
            {runningTask && (
              <button
                onClick={() => setCurrentSheet("selection_cache")}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg text-xl leading-none"
                aria-label="跳轉到 Selection Cache"
              >
                📝
              </button>
            )}
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
    </div>
  );
}
