import { useEffect, useState } from "react";
import { db } from "../db/index";
import { SetupWizard } from "./SetupWizard";
import {
  SyncManager,
  getStoredGasUrl,
  saveGasUrl,
  type SyncResult,
} from "../utils/syncUtils";

interface SyncStatusProps {
  syncStatus?: "idle" | "syncing" | "error";
}

export function SyncStatus({
  syncStatus: initialStatus = "idle",
}: SyncStatusProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">(
    initialStatus,
  );
  const [manager, setManager] = useState<SyncManager | null>(null);
  const [gasUrl, setGasUrl] = useState(getStoredGasUrl());
  const [showUrlInput, setShowUrlInput] = useState(!gasUrl);
  const [message, setMessage] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [includeLogOnReset, setIncludeLogOnReset] = useState(false);

  // 初始化：檢查 GAS URL，初始化 SyncManager
  useEffect(() => {
    if (gasUrl) {
      const mgr = new SyncManager(gasUrl);
      setManager(mgr);
      // 測試連接
      mgr.testConnection().then((ok) => {
        if (!ok) {
          setMessage("⚠️ 無法連接 GAS");
          setSyncStatus("error");
        }
      });
    }
  }, [gasUrl]);

  // 更新待同步計數
  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await db.change_log
        .where("status")
        .equals("pending")
        .count();
      setPendingCount(count);
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000); // 每 5 秒檢查一次
    return () => clearInterval(interval);
  }, []);

  // 順便在console.log看一下 change_log 的內容，確保它在更新
  useEffect(() => {
    const logChangeLog = async () => {
      const allChanges = await db.change_log.toArray();
      console.log("Change Log:", allChanges);
    };

    logChangeLog();
  }, [showUrlInput]);

  // 處理 GAS URL 配置
  const handleSetGasUrl = async (url: string) => {
    const normalizedUrl = url
      .trim()
      .replace(/^\[\[?/, "")
      .replace(/\]\]?$/, "");

    if (!normalizedUrl) {
      setShowSetupWizard(true);
      return;
    }

    // 簡單驗證 URL 格式
    if (!normalizedUrl.includes("script.google.com")) {
      setShowSetupWizard(true);
      return;
    }

    saveGasUrl(normalizedUrl);
    setGasUrl(normalizedUrl);
    setShowUrlInput(false);
    setMessage("✅ GAS URL 已保存");

    // 2 秒後清除提示
    setTimeout(() => setMessage(""), 2000);
  };

  // 從 GAS 完整還原（清空本地非 Log 資料後重新拉取）
  const handleResetAndPull = async () => {
    setShowResetConfirm(false);
    if (!manager) {
      setMessage("❌ 未配置 GAS URL，無法還原");
      setSyncStatus("error");
      return;
    }

    setSyncStatus("syncing");
    setMessage("🔄 還原中...");

    try {
      const result: SyncResult = await manager.resetAndPull({
        includeLog: includeLogOnReset,
      });
      if (result.status === "success") {
        setSyncStatus("idle");
        setLastSyncTime(Date.now());
        setMessage(`✅ ${result.message}`);
        setPendingCount(0);
      } else {
        setSyncStatus("error");
        setMessage(`❌ ${result.message}`);
      }
    } catch (error) {
      setSyncStatus("error");
      setMessage(`❌ 還原出錯: ${String(error)}`);
    }

    setTimeout(() => setMessage(""), 4000);
  };

  // 處理 SetupWizard 完成
  const handleSetupComplete = async (url: string) => {
    saveGasUrl(url);
    setGasUrl(url);
    setShowUrlInput(false);
    setShowSetupWizard(false);
    setMessage("✅ 設置完成，已自動同步");
    setTimeout(() => setMessage(""), 3000);
  };

  // 執行同步
  const handleSync = async () => {
    if (!manager) {
      setMessage("❌ 未配置 GAS URL");
      setSyncStatus("error");
      return;
    }

    setSyncStatus("syncing");
    setMessage("🔄 同步中...");

    try {
      const result: SyncResult = await manager.sync();

      if (result.status === "success") {
        setSyncStatus("idle");
        setLastSyncTime(Date.now());
        setMessage(`✅ ${result.message}`);
        setPendingCount(0);
      } else {
        setSyncStatus("error");
        setMessage(`❌ ${result.message}`);
      }
    } catch (error) {
      setSyncStatus("error");
      setMessage(`❌ 同步出錯: ${String(error)}`);
    }

    // 3 秒後清除提示
    setTimeout(() => setMessage(""), 3000);
  };

  // 格式化最後同步時間
  const formatLastSyncTime = (): string => {
    if (!lastSyncTime) return "";
    const now = Date.now();
    const diff = now - lastSyncTime;
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return "剛剛";
    if (mins < 60) return `${mins} 分鐘前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} 小時前`;
    const days = Math.floor(hours / 24);
    return `${days} 天前`;
  };

  const statusIcon: Record<string, string> = {
    idle: "✅",
    syncing: "🔄",
    error: "⚠️",
  };

  const statusText: Record<string, string> = {
    idle: pendingCount > 0 ? `Pending ${pendingCount}` : "Synced",
    syncing: "Syncing...",
    error: "Sync Error",
  };

  // 顯示 GAS URL 輸入框
  if (showUrlInput) {
    return (
      <>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="text"
            placeholder="粘貼 GAS Web App URL..."
            defaultValue={gasUrl}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSetGasUrl((e.target as HTMLInputElement).value);
              }
            }}
            className="w-80 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={(e) => {
              const input = (e.target as HTMLElement)
                .previousElementSibling as HTMLInputElement;
              handleSetGasUrl(input.value);
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          >
            設置
          </button>
        </div>
        {showSetupWizard && (
          <SetupWizard
            isModal={true}
            onComplete={handleSetupComplete}
            onClose={() => setShowSetupWizard(false)}
          />
        )}
      </>
    );
  }

  // 正常顯示：狀態 + 同步按鈕
  return (
    <>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>{statusIcon[syncStatus]}</span>
        <span>{statusText[syncStatus]}</span>

        {lastSyncTime && (
          <span className="text-xs text-gray-400">({formatLastSyncTime()})</span>
        )}

        <button
          onClick={handleSync}
          disabled={syncStatus === "syncing"}
          title={gasUrl ? "同步本地變更到 Google Sheets" : "未配置 GAS URL"}
          className={`ml-4 px-3 py-1 rounded text-xs font-medium transition-colors ${
            syncStatus === "syncing"
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600 active:scale-95"
          }`}
        >
          {syncStatus === "syncing" ? "⏳" : "💾"} 同步
        </button>

        <button
          onClick={() => setShowUrlInput(true)}
          title="重新配置 GAS URL"
          className="px-2 py-1 text-xs text-gray-500 hover:text-blue-500 hover:underline"
        >
          ⚙️
        </button>

        <button
          onClick={() => {
            setIncludeLogOnReset(false);
            setShowResetConfirm(true);
          }}
          title="從 Google Sheets 還原所有資料（清空本地後重新拉取）"
          className="px-2 py-1 text-xs text-gray-500 hover:text-orange-500 hover:underline"
        >
          ☁️
        </button>

        {message && (
          <span
            className={`ml-2 text-xs ${
              message.includes("❌")
                ? "text-red-500"
                : message.includes("✅")
                  ? "text-green-500"
                  : "text-amber-500"
            }`}
          >
            {message}
          </span>
        )}
      </div>
      {showSetupWizard && (
        <SetupWizard
          isModal={true}
          onComplete={handleSetupComplete}
          onClose={() => setShowSetupWizard(false)}
        />
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-orange-600 mb-3">
              ☁️ 從雲端還原資料
            </h3>
            <p className="text-gray-700 text-sm mb-3">
              本地任務資料將被清除，並從 Google Sheets 重新拉取。
            </p>
            <label className="flex items-start gap-2 mb-3 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeLogOnReset}
                onChange={(e) => setIncludeLogOnReset(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                同時清除本地 Log（危險）
                <span className="block text-xs text-gray-500">
                  Log 不會從雲端拉回，勾選後本機 Log 會清空。
                </span>
              </span>
            </label>
            {pendingCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-2 mb-3 text-xs text-red-700">
                ⚠️ 目前有 <strong>{pendingCount}</strong> 筆尚未同步的變更，還原後將遺失！建議先執行「同步」。
              </div>
            )}
            {includeLogOnReset && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-3 text-xs text-amber-700">
                ⚠️ 你選擇了清除 Log。此操作後，Log 將無法透過 pull 還原。
              </div>
            )}
            <p className="text-gray-400 text-xs mb-4">此操作不可復原。</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleResetAndPull}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                確認還原{includeLogOnReset ? "（含 Log）" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
