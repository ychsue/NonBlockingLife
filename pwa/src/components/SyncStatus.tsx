import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db } from "../db/index";
import { SetupGASWizard } from "./SetupGASWizard";
import { Toast } from "./Toast";
import { type SyncResult } from "../utils/syncUtils";
import { parse } from "yaml";
import {
  exportDB,
  importDB,
  type ExportFormat,
  type ImportResult,
} from "../utils/exportImportUtils";
import { useT, useTWithMaps } from "../i18n";
import {
  GASSyncManager,
  getStoredGasUrl,
  saveGasUrl,
} from "../utils/GASSyncManager";
import {
  getStoredSupabaseUrlKey,
  getUrlAndKey,
  saveSupabaseUrlKey,
  SupabaseSyncManager,
} from "../utils/SupabaseSyncManager";
import { parseEnvString } from "../utils/parseEnvString";
import { useAppStore } from "../store/appStore";
import { SetupSupabaseWizard } from "./SetupSupabaseWizard";
import { useProductTourContext } from "./tour/ProductTourContext";

interface SyncStatusProps {
  syncStatus?: "idle" | "syncing" | "error";
  className?: string;
}

export function SyncStatus({
  syncStatus: initialStatus = "idle",
  className = "",
}: SyncStatusProps) {
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">(
    initialStatus,
  );
  const [manager, setManager] = useState<
    GASSyncManager | SupabaseSyncManager | null
  >(null);
  const syncType = useAppStore((state) => state.syncType);
  const setSyncType = useAppStore((state) => state.setSyncType);
  const syncStr = useAppStore((state) => state.syncStr);
  const setSyncStr = useAppStore((state) => state.setSyncStr);
  const pendingChangeLogs = useAppStore((state) => state.pendingChangeLogs);
  const setPendingChangeLogs = useAppStore(
    (state) => state.setPendingChangeLogs,
  );
  const [showUrlInput, setShowUrlInput] = useState(!syncStr);
  const [message, setMessage] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [includeLogOnReset, setIncludeLogOnReset] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const { nextStep, isRunning, activeStep } = useProductTourContext();
  const syncSupabaseInputRef = useRef<HTMLTextAreaElement>(null);

  const t = useT();
  const tHere = useTWithMaps({
    "zh-TW": {
      無法連接: "無法連接",
      待同步筆數: "⏳ 待同步已達 {n} 筆，自動同步中...",
      自動同步失敗: "❌ 自動同步失敗:",
      已保存: "已保存",
      Supabase配置錯誤: "❌ Supabase URL & Key 配置錯誤:",
      未配置正確無法還原: "❌ 未配置正確，無法還原",
      還原中: "🔄 還原中...",
      還原出錯: "❌ 還原出錯:",
      設置完成已自動同步: "✅ 設置完成，已自動同步",
      未配置正確無法同步: "❌ 未配置正確，無法同步",
      同步中: "🔄 同步中...",
      同步出錯: "❌ 同步出錯:",
      匯出x格式的檔案: "✅ 已匯出 ${format.toUpperCase()} 格式的備份檔案",
      匯出失敗: "❌ 匯出失敗",
      匯入中: "⏳ 匯入中...",
      匯入完成: "✅ 匯入完成",
      匯入失敗: "❌ 匯入失敗",
      剛剛: "剛剛",
      分鐘前: "{n} 分鐘前",
      小時前: "{n} 小時前",
      天前: "{n} 天前",
      "粘貼 Supabase .env": "粘貼 Supabase .env",
      "黏貼 GAS Web App URL...": "黏貼 GAS Web App URL...",
      教學之前警告:
        "進行教學之前，請先清空 Supabase 配置，然後選擇以supabase 進行同步",
      請改選其他同步方式: "請改選其他同步方式",
      設置: "設置",
      "未配置 GAS URL": "未配置 GAS URL",
      "同步本地變更到 Google Sheets": "同步本地變更到 Google Sheets",
      "重新配置 GAS URL": "重新配置 GAS URL",
      "重新配置 Supabase URL & Key": "重新配置 Supabase URL & Key",
      從雲端還原資料: "從雲端還原資料",
      同步: "同步",
      雲端重新拉取: "本地任務資料將被清除，並從 {n} 重新拉取。",
      "同時清除本地 Log（危險）": "同時清除本地 Log（危險）",
      "Log 不會從雲端拉回，勾選後本機 Log 會清空。":
        "Log 不會從雲端拉回，勾選後本機 Log 會清空。",
      目前有: "目前有",
      "筆尚未同步的變更，還原後將遺失！建議先執行「同步」。":
        "筆尚未同步的變更，還原後將遺失！建議先執行「同步」。",
      "你選擇了清除 Log。此操作後，Log 將無法透過 pull 還原。":
        "⚠️ 你選擇了清除 Log。此操作後，Log 將無法透過 pull 還原。",
      此操作不可復原: "此操作不可復原。",
      "請選擇匯出格式：JSON（最穩定）或 Markdown 表格（AI/人類友善）。":
        "請選擇匯出格式：JSON（最穩定）或 Markdown 表格（AI/人類友善）。",
      "匯出 JSON": "匯出 JSON",
      "匯出 Markdown": "匯出 Markdown",
      取消: "取消",
      確認匯入: "確認匯入",
      "相同 ID 的記錄將被覆蓋，其餘本地資料不受影響。":
        "相同 ID 的記錄將被覆蓋，其餘本地資料不受影響。",
      匯出格式: "匯出格式",
      匯入備份資料: "匯入備份資料",
      "筆尚未同步的變更，匯入後不影響這些待同步項目。":
        "筆尚未同步的變更，匯入後不影響這些待同步項目。",
      "即將匯入：": "即將匯入：",
      "{n} 筆已跳過（點開查看詳情）": "{n} 筆已跳過（點開查看詳情）",
      關閉: "關閉",
      "從 Google Sheets 還原所有資料（清空本地後重新拉取）":
        "從 Google Sheets 還原所有資料（清空本地後重新拉取）",
      "從 Supabase 還原所有資料（清空本地後重新拉取）":
        "從 Supabase 還原所有資料（清空本地後重新拉取）",
      匯出本地資料: "匯出本地資料",
      "從 JSON / MD 備份檔匯入資料（同 ID 會覆蓋）":
        "從 JSON / MD 備份檔匯入資料（同 ID 會覆蓋）",
    },
    en: {
      無法連接: "Cannot connect",
      待同步筆數: "⏳ Pending changes have reached {n}, auto-syncing...",
      自動同步失敗: "❌ Auto-sync failed:",
      已保存: "Saved",
      Supabase配置錯誤: "❌ Supabase URL & Key configuration error:",
      未配置正確無法還原: "❌ Not properly configured, cannot restore",
      還原中: "🔄 Restoring...",
      還原出錯: "❌ Restore failed:",
      設置完成已自動同步: "✅ Setup complete, auto-syncing",
      未配置正確無法同步: "❌ Not properly configured, cannot sync",
      同步中: "🔄 syncing...",
      同步出錯: "❌ Sync failed:",
      匯出x格式的檔案:
        "✅ Exported backup file in ${format.toUpperCase()} format",
      匯出失敗: "❌ Export failed",
      匯入中: "⏳ Importing...",
      匯入完成: "✅ Import complete",
      匯入失敗: "❌ Import failed",
      剛剛: "Just now",
      分鐘前: "{n} minutes ago",
      小時前: "{n} hours ago",
      天前: "{n} days ago",
      "粘貼 Supabase .env": "Paste Supabase .env",
      "黏貼 GAS Web App URL...": "Paste GAS Web App URL...",
      教學之前警告:
        "Before starting the tutorial, please clear the Supabase configuration and then choose to sync with Supabase",
      請改選其他同步方式: "Please choose another sync method",
      設置: "Setting",
      "未配置 GAS URL": "Not configured GAS URL",
      "同步本地變更到 Google Sheets": "Sync local changes to Google Sheets",
      "重新配置 GAS URL": "Reconfigure GAS URL",
      "重新配置 Supabase URL & Key": "Reconfigure Supabase URL & Key",
      從雲端還原資料: "Restore from cloud",
      同步: "Sync",
      雲端重新拉取: "Local task data will be cleared and re-fetched from {n}.",
      "同時清除本地 Log（危險）": "Also clear local log (dangerous)",
      "Log 不會從雲端拉回，勾選後本機 Log 會清空。":
        "Log will not be fetched from the cloud, and the local log will be cleared when checked.",
      目前有: "Currently have",
      "筆尚未同步的變更，還原後將遺失！建議先執行「同步」。":
        " unsynced changes, will be lost after restore! It is recommended to perform 'Sync' first.",
      "你選擇了清除 Log。此操作後，Log 將無法透過 pull 還原。":
        "⚠️ You have chosen to clear the log. After this operation, the log cannot be restored via pull.",
      此操作不可復原: "This action cannot be undone.",
      "請選擇匯出格式：JSON（最穩定）或 Markdown 表格（AI/人類友善）。":
        "Please choose the export format: JSON (most stable) or Markdown table (AI/human-friendly).",
      "匯出 JSON": "Export JSON",
      "匯出 Markdown": "Export Markdown",
      取消: "Cancel",
      確認匯入: "Confirm Import",
      "相同 ID 的記錄將被覆蓋，其餘本地資料不受影響。":
        "Records with the same ID will be overwritten, and the rest of the local data will not be affected.",
      匯出格式: "Export format",
      匯入備份資料: "Import backup data",
      "筆尚未同步的變更，匯入後不影響這些待同步項目。":
        "Unsynced changes will not be affected after import.",
      "即將匯入：": "About to import:",
      "{n} 筆已跳過（點開查看詳情）":
        "{n} items skipped (click to view details)",
      關閉: "Close",
      "從 Supabase 還原所有資料（清空本地後重新拉取）":
        "Restore all data from Supabase (clear local and re-fetch)",
      "從 Google Sheets 還原所有資料（清空本地後重新拉取）":
        "Restore all data from Google Sheets (clear local and re-fetch)",
      匯出本地資料: "Export local data",
      "從 JSON / MD 備份檔匯入資料（同 ID 會覆蓋）":
        "Import data from JSON / MD backup file (same ID will be overwritten)",
    },
    ja: {
      無法連接: "接続できません",
      待同步筆數: "⏳ 保留中の変更が {n} 件に達しました。自動同期中...",
      自動同步失敗: "❌ 自動同步失敗:",
      已保存: "保存済み",
      Supabase配置錯誤: "❌ Supabase URL & Key の設定エラー:",
      未配置正確無法還原: "❌ 正しく設定されていないため、復元できません",
      還原中: "🔄 復元中...",
      還原出錯: "❌ 復元に失敗しました:",
      設置完成已自動同步: "✅ 設定完了、自動同期中",
      未配置正確無法同步: "❌ 正しく設定されていないため、同期できません",
      同步中: "🔄 同期中...",
      同步出錯: "❌ 同期に失敗しました:",
      匯出x格式的檔案:
        "✅ ${format.toUpperCase()} 形式のバックアップファイルをエクスポートしました",
      匯出失敗: "❌ エクスポートに失敗しました",
      匯入中: "⏳ インポート中...",
      匯入完成: "✅ インポート完了",
      匯入失敗: "❌ インポートに失敗しました",
      剛剛: "たった今",
      分鐘前: "{n} 分前",
      小時前: "{n} 時間前",
      天前: "{n} 日前",
      "粘貼 Supabase .env": "Supabase の .env を貼り付け",
      "黏貼 GAS Web App URL...": "GAS Web App URL を貼り付け",
      教學之前警告:
        "チュートリアルを開始する前に、Supabase の設定をクリアしてから、Supabase で同期することを選択してください",
      請改選其他同步方式: "別の同期方法を選択してください",
      設置: "設定",
      "未配置 GAS URL": "GASのURLが設定されていない",
      "同步本地變更到 Google Sheets": "Google Sheets にローカルの変更を同期",
      "重新配置 GAS URL": "GASのURLを再設定",
      "重新配置 Supabase URL & Key": "Supabase URL & Key を再設定",
      從雲端還原資料: "クラウドから復元",
      同步: "同期",
      雲端重新拉取:
        "ローカルのタスクデータはクリアされ、{n} から再取得されます。",
      "同時清除本地 Log（危險）": "ローカルのログもクリア（危険）",
      "Log 不會從雲端拉回，勾選後本機 Log 會清空。":
        "ログはクラウドから取得されず、チェックするとローカルのログがクリアされます。",
      目前有: "現在の未同期の変更数",
      "筆尚未同步的變更，還原後將遺失！建議先執行「同步」。":
        "未同期の変更は復元後に失われます！先に「同期」を実行することをお勧めします。",
      "你選擇了清除 Log。此操作後，Log 將無法透過 pull 還原。":
        "チェックするとローカルのログがクリアされ、クラウドからは取得できません。",
      此操作不可復原: "この操作は元に戻せません。",
      "請選擇匯出格式：JSON（最穩定）或 Markdown 表格（AI/人類友善）。":
        "エクスポート形式を選択してください: JSON（最も安定）または Markdown テーブル（AI/人間に優しい）。",
      "匯出 JSON": "JSON をエクスポート",
      "匯出 Markdown": "Markdown をエクスポート",
      取消: "キャンセル",
      確認匯入: "インポートを確認",
      "相同 ID 的記錄將被覆蓋，其餘本地資料不受影響。":
        "同じ ID のレコードは上書きされ、残りのローカルデータには影響しません。",
      匯出格式: "エクスポート形式",
      匯入備份資料: "バックアップデータをインポート",
      "筆尚未同步的變更，匯入後不影響這些待同步項目。":
        "未同期の変更はインポート後も影響を受けません。",
      "即將匯入：": "これからインポート:",
      "{n} 筆已跳過（點開查看詳情）":
        "{n} 件がスキップされました（詳細を見るにはクリック）",
      關閉: "閉じる",
      "從 Google Sheets 還原所有資料（清空本地後重新拉取）":
        "Google Sheets からすべてのデータを復元（ローカルをクリアして再取得）",
      "從 Supabase 還原所有資料（清空本地後重新拉取）":
        "Supabase からすべてのデータを復元（ローカルをクリアして再取得）",
      匯出本地資料: "ローカルデータをエクスポート",
      "從 JSON / MD 備份檔匯入資料（同 ID 會覆蓋）":
        "JSON / MD バックアップファイルからデータをインポート（同じ ID は上書きされます）",
    },
  });

  // 用於 idle 偵測：記錄最後一次 pendingCount 變化的時間
  const lastPendingChangeRef = useRef<number>(0);
  const syncStatusRef = useRef(syncStatus);
  const managerRef = useRef<GASSyncManager | SupabaseSyncManager | null>(null);

  useEffect(() => {
    db.change_log
      .where("status")
      .equals("pending")
      .toArray()
      .then((logs) => {
        setPendingChangeLogs(logs);
      });
  }, []);

  /**
   * 初始化同步 URL 字串，根據當前同步類型從本地存儲中獲取對應的 URL 或 Key
   */
  useEffect(() => {
    if (syncType === "gas") {
      setSyncStr(getStoredGasUrl());
    } else if (syncType === "supabase") {
      setSyncStr(getStoredSupabaseUrlKey());
    }
  }, [syncType]);

  useEffect(() => {
    syncStatusRef.current = syncStatus;
  }, [syncStatus]);

  useEffect(() => {
    managerRef.current = manager;
  }, [manager]);

  // 初始化：檢查 GAS 與 Supabase 的 URL & Key，初始化 SyncManager
  useEffect(() => {
    if (syncStr) {
      const mgr =
        syncType === "gas"
          ? new GASSyncManager(syncStr)
          : syncType === "supabase"
            ? new SupabaseSyncManager(syncStr)
            : null;
      setManager(mgr);
      // 測試連接
      mgr?.testConnection().then((ok) => {
        if (!ok) {
          setMessage(
            `⚠️ ${tHere("無法連接")} ${syncType === "gas" ? "GAS" : "Supabase"}`,
          );
          setSyncStatus("error");
        } else {
          setShowUrlInput(false);
        }
      });
      // 如有必要，save syncStr 到本地存儲
      if (syncType === "gas") {
        saveGasUrl(syncStr);
      } else if (syncType === "supabase") {
        saveSupabaseUrlKey(syncStr);
      }
    }
  }, [syncStr]);

  // 更新待同步計數，並在 >= 20 or >= 2 且 idle 3 秒後自動同步，只用在 GAS
  useEffect(() => {
    if (syncType !== "gas") return;

    syncPendingChangeLogs();
    const interval = setInterval(syncPendingChangeLogs, 10000); // 每 10 秒檢查一次
    return () => clearInterval(interval);
  }, [syncStr]);

  // 當 pendingChangeLog 改變時，自動更新待同步計數
  useEffect(() => {
    if (pendingChangeLogs.length === 0) return;
    syncPendingChangeLogs();
  }, [pendingChangeLogs]);

  const syncPendingChangeLogs = () => {
    const AUTO_SYNC_THRESHOLD = syncType === "gas" ? 20 : 3;
    const IDLE_DELAY_MS = syncType === "gas" ? 3000 : 0;
    const count = pendingChangeLogs.length;
    if (count !== 0) lastPendingChangeRef.current = Date.now();
    // 自動同步：筆數 >= 20 且距上次變化 >= 3 秒且目前不在 syncing 且已設定 GAS URL
    if (
      count >= AUTO_SYNC_THRESHOLD &&
      Date.now() - lastPendingChangeRef.current >= IDLE_DELAY_MS &&
      syncStatusRef.current !== "syncing" &&
      syncStr &&
      managerRef.current
    ) {
      setSyncStatus("syncing");
      setMessage(tHere("待同步筆數", { n: count }));
      setToastMessage(tHere("待同步筆數", { n: count }));
      managerRef.current
        .sync()
        .then((result) => {
          if (result.status === "success") {
            setSyncStatus("idle");
            setLastSyncTime(Date.now());
            setMessage(`✅ ${result.message}`);
          } else {
            setSyncStatus("error");
            setMessage(`❌ ${result.message}`);
          }
          setTimeout(() => setMessage(""), 3000);
        })
        .catch((err) => {
          setSyncStatus("error");
          setMessage(`${tHere("自動同步失敗")} ${String(err)}`);
          setTimeout(() => setMessage(""), 3000);
        });
    }
  };

  // // 順便在console.log看一下 change_log 的內容，確保它在更新
  // useEffect(() => {
  //   const logChangeLog = async () => {
  //     const allChanges = await db.change_log.toArray();
  //     console.log("Change Log:", allChanges);
  //   };

  //   logChangeLog();
  // }, [showUrlInput]);

  // Page Visibility：離開前補送 pending 操作
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== "hidden") return;
      if (!syncStr) return;
      if (syncStatusRef.current === "syncing") return;
      if (!managerRef.current) return;

      const count = await db.change_log
        .where("status")
        .equals("pending")
        .count();
      if (count === 0) return;

      // 不更新 UI（使用者已離開），靜默送出
      managerRef.current.sync().catch(() => {
        /* 離開前盡力而為，失敗不處理 */
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [syncStr]);

  // 處理 GAS URL 配置
  const handleSetGasUrl = useCallback(
    (url: string) => {
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

      setSyncStr(normalizedUrl);
      setShowUrlInput(false);
      setMessage(
        syncType === "gas"
          ? `✅ GAS URL (${tHere("已保存")})`
          : `✅ Supabase URL & Key (${tHere("已保存")})`,
      );

      // 2 秒後清除提示
      setTimeout(() => setMessage(""), 2000);
    },
    [syncType],
  );
  // 處理 Supabase URL & Key 配置
  const handleSetSupabaseUrlKey = (urlKeyPair: string) => {
    try {
      getUrlAndKey(urlKeyPair); // 如果格式不對會報錯
      setSyncStr(urlKeyPair);
      setShowUrlInput(false);
      setShowSetupWizard(false);
      setMessage(`✅ Supabase URL & Key (${tHere("已保存")})`);
    } catch (error) {
      setMessage(`${tHere("Supabase配置錯誤")}: ${String(error)}`);
      setShowSetupWizard(true);
      setSyncStatus("error");
    }
  };

  // 從 Supabase 或 GAS 完整還原（清空本地非 Log 資料後重新拉取）
  const handleResetAndPull = async () => {
    setShowResetConfirm(false);
    if (!manager) {
      setMessage(tHere("未配置正確無法還原"));
      setSyncStatus("error");
      return;
    }

    setSyncStatus("syncing");
    setMessage(tHere("還原中"));

    try {
      const result: SyncResult = await manager.resetAndPull({
        includeLog: includeLogOnReset,
      });
      if (result.status === "success") {
        setSyncStatus("idle");
        setLastSyncTime(Date.now());
        setMessage(`✅ ${result.message}`);
      } else {
        setSyncStatus("error");
        setMessage(`❌ ${result.message}`);
      }
    } catch (error) {
      setSyncStatus("error");
      setMessage(`${tHere("還原出錯")}: ${String(error)}`);
    }

    setTimeout(() => setMessage(""), 4000);
  };

  // 處理 SetupWizard 完成
  const handleSetupComplete = async (url: string) => {
    setSyncStr(url);
    setShowUrlInput(false);
    setShowSetupWizard(false);
    setMessage(`✅ (${tHere("設置完成已自動同步")})`);
    setTimeout(() => setMessage(""), 3000);
  };

  // 執行同步
  const handleSync = async () => {
    if (!manager) {
      setMessage(tHere("未配置正確無法同步"));
      setSyncStatus("error");
      return;
    }

    setSyncStatus("syncing");
    setMessage(tHere("同步中"));

    try {
      const result: SyncResult = await manager.sync();

      if (result.status === "success") {
        setSyncStatus("idle");
        setLastSyncTime(Date.now());
        setMessage(`✅ ${result.message}`);
      } else {
        setSyncStatus("error");
        setMessage(`❌ ${result.message}`);
      }
    } catch (error) {
      setSyncStatus("error");
      setMessage(`${tHere("同步出錯")}: ${String(error)}`);
    }

    // 3 秒後清除提示
    setTimeout(() => setMessage(""), 3000);
  };

  // 處理匯出
  const handleExport = async (format: ExportFormat) => {
    setShowExportConfirm(false);
    try {
      await exportDB({ format });
      setMessage(`${tHere("匯出x格式的檔案", { n: format.toUpperCase() })}`);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(`${tHere("匯出失敗")}: ${String(error)}`);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // 處理匯入：選檔後先確認
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImportFile(file);
    setShowImportConfirm(true);
    // 清空 input 以便同一檔案可再次選取
    e.target.value = "";
  };

  const handleConfirmImport = async () => {
    if (!pendingImportFile) return;
    setShowImportConfirm(false);
    setMessage(`${tHere("匯入中")}`);
    try {
      const result = await importDB(pendingImportFile);
      setImportResult(result);
      if (result.status === "success") {
        setMessage(`${tHere("匯入完成")}`);
      } else {
        setMessage(`${tHere("匯入失敗")}: ${result.message}`);
      }
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(`${tHere("匯入失敗")}: ${String(error)}`);
      setTimeout(() => setMessage(""), 3000);
    }
    setPendingImportFile(null);
  };

  // 格式化最後同步時間
  const formatLastSyncTime = (): string => {
    if (!lastSyncTime) return "";
    const now = Date.now();
    const diff = now - lastSyncTime;
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return tHere("剛剛");
    if (mins < 60) return `${tHere("分鐘前", { n: mins })}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${tHere("小時前", { n: hours })}`;
    const days = Math.floor(hours / 24);
    return `${tHere("天前", { n: days })}`;
  };

  const statusIcon: Record<string, string> = {
    idle: "✅",
    syncing: "🔄",
    error: "⚠️",
  };

  const statusText: Record<string, string> = useMemo(() => {
    return {
      idle:
        pendingChangeLogs.length > 0
          ? `Pending ${pendingChangeLogs.length}`
          : "Synced",
      syncing: "Syncing...",
      error: "Sync Error",
    };
  }, [pendingChangeLogs]);

  const UrlInputView = () => (
    <div className="flex items-center gap-2 text-sm">
      {syncType === "supabase" ? (
        <textarea
          placeholder={tHere("粘貼 Supabase .env")}
          ref={syncSupabaseInputRef}
          defaultValue={syncStr}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSetSupabaseUrlKey((e.target as HTMLInputElement).value);
            }
          }}
          className="min-w-15 resize-none px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
        ></textarea>
      ) : syncType === "gas" ? (
        <input
          type="text"
          placeholder={tHere("黏貼 GAS Web App URL...")}
          defaultValue={syncStr}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSetGasUrl((e.target as HTMLInputElement).value);
            }
          }}
          className="min-w-0 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
        />
      ) : null}
      <button
        onClick={(e) => {
          if (isRunning && activeStep?.id === "show-sync-status") {
            if (
              !!syncSupabaseInputRef.current?.value ||
              syncType !== "supabase"
            ) {
              alert(tHere("教學之前警告"));
              return;
            } else {
              const input = (e.target as HTMLElement)
                .previousElementSibling as HTMLInputElement;
              if (syncType === "supabase") {
                handleSetSupabaseUrlKey(input.value);
              } else if (syncType === "gas") {
                handleSetGasUrl(input.value);
              } else if (syncType === "none") {
                // Do nothing for 'none' sync type
                alert(tHere("請改選其他同步方式"));
              }
              nextStep();
            }
          }
        }}
        data-tour="sync-status-settings-button"
        className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
      >
        {tHere("設置")}
      </button>
      <select
        value={syncType}
        onChange={(e) =>
          setSyncType(e.target.value as "gas" | "supabase" | "none")
        }
        className="min-w-0 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
      >
        <option value="gas">GAS</option>
        <option value="supabase">Supabase</option>
        <option value="none">None</option>
      </select>
    </div>
  );

  const StatusView = () => (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span>{statusIcon[syncStatus]}</span>
      <span>{statusText[syncStatus]}</span>

      {lastSyncTime && (
        <span className="text-xs text-gray-400">({formatLastSyncTime()})</span>
      )}

      <button
        onClick={handleSync}
        disabled={syncStatus === "syncing"}
        title={
          syncStr
            ? tHere("同步本地變更到 Google Sheets")
            : tHere("未配置 GAS URL")
        }
        className={`ml-4 px-3 py-1 rounded text-xs font-medium transition-colors ${
          syncStatus === "syncing"
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-500 text-white hover:bg-blue-600 active:scale-95"
        }`}
      >
        {syncStatus === "syncing" ? "⏳" : "💾"} {tHere("同步")}
      </button>

      <button
        onClick={() => {
          setShowUrlInput(true);
        }}
        data-tour="sync-status-open-configuration-button"
        title={
          syncType === "gas"
            ? tHere("重新配置 GAS URL")
            : tHere("重新配置 Supabase URL & Key")
        }
        className="px-2 py-1 text-xs text-gray-500 hover:text-blue-500 hover:underline"
      >
        ⚙️
      </button>

      <button
        onClick={() => {
          setIncludeLogOnReset(false);
          setShowResetConfirm(true);
        }}
        title={
          syncType === "gas"
            ? tHere("從 Google Sheets 還原所有資料（清空本地後重新拉取）")
            : tHere("從 Supabase 還原所有資料（清空本地後重新拉取）")
        }
        className="px-2 py-1 text-xs text-gray-500 hover:text-orange-500 hover:underline"
      >
        ☁️
      </button>
    </div>
  );

  // 正常顯示：狀態 + 同步按鈕
  return (
    <div data-tour="sync-status-container" className={`flex flex-wrap flex-row gap-1 ${className}`}>
      {showUrlInput ? <UrlInputView /> : <StatusView />}

      <button
        onClick={() => setShowExportConfirm(true)}
        title={tHere("匯出本地資料") + "（JSON / Markdown）"}
        className="px-2 py-1 text-xs text-gray-500 hover:text-blue-500 hover:underline"
      >
        📤
      </button>

      <button
        onClick={() => importFileRef.current?.click()}
        title={tHere("從 JSON / MD 備份檔匯入資料（同 ID 會覆蓋）")}
        className="px-2 py-1 text-xs text-gray-500 hover:text-green-500 hover:underline"
      >
        📥
      </button>

      <input
        ref={importFileRef}
        type="file"
        accept=".json,.md,application/json,text/markdown,text/plain"
        className="hidden"
        onChange={handleImportFileChange}
      />

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

      {showSetupWizard &&
        (syncType === "gas" ? (
          <SetupGASWizard
            isModal={true}
            onComplete={handleSetupComplete}
            onClose={() => setShowSetupWizard(false)}
          />
        ) : (
          <SetupSupabaseWizard
            isModal={true}
            onComplete={handleSetupComplete}
            onClose={() => setShowSetupWizard(false)}
          />
        ))}

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-orange-600 mb-3">
              ☁️ {tHere("從雲端還原資料")}
            </h3>
            <p className="text-gray-700 text-sm mb-3">
              {tHere("雲端重新拉取", {
                n: syncType === "gas" ? "Google Sheets" : "Supabase",
              })}
            </p>
            <label className="flex items-start gap-2 mb-3 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeLogOnReset}
                onChange={(e) => setIncludeLogOnReset(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                {tHere("同時清除本地 Log（危險）")}
                <span className="block text-xs text-gray-500">
                  {tHere("Log 不會從雲端拉回，勾選後本機 Log 會清空。")}
                </span>
              </span>
            </label>
            {pendingChangeLogs.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-2 mb-3 text-xs text-red-700">
                ⚠️ {tHere("目前有")} <strong>{pendingChangeLogs.length}</strong>{" "}
                {tHere("筆尚未同步的變更，還原後將遺失！建議先執行「同步」。")}
              </div>
            )}
            {includeLogOnReset && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-3 text-xs text-amber-700">
                ⚠️{" "}
                {tHere(
                  "你選擇了清除 Log。此操作後，Log 將無法透過 pull 還原。",
                )}
              </div>
            )}
            <p className="text-gray-400 text-xs mb-4">
              {tHere("此操作不可復原")}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                {t("sync.cancel")}
              </button>
              <button
                onClick={handleResetAndPull}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                {includeLogOnReset
                  ? t("sync.confirmRestoreWithLog")
                  : t("sync.confirmRestore")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 匯出格式選擇 modal */}
      {showExportConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-blue-700 mb-3">
              📤 {tHere("匯出格式")}
            </h3>
            <p className="text-gray-700 text-sm mb-4">
              {tHere(
                "請選擇匯出格式：JSON（最穩定）或 Markdown 表格（AI/人類友善）。",
              )}
            </p>
            <div className="grid grid-cols-1 gap-2 mb-3">
              <button
                onClick={() => handleExport("json")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {tHere("匯出 JSON")}
              </button>
              <button
                onClick={() => handleExport("mdtable")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {tHere("匯出 Markdown")}
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowExportConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                {tHere("取消")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 匯入確認 modal */}
      {showImportConfirm && pendingImportFile && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-green-700 mb-3">
              📥 {tHere("匯入備份資料")}
            </h3>
            <p className="text-gray-700 text-sm mb-2">
              {tHere("即將匯入：")}
              <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                {pendingImportFile.name}
              </span>
            </p>
            <p className="text-gray-600 text-sm mb-4">
              {tHere("相同 ID 的記錄將被覆蓋，其餘本地資料不受影響。")}
            </p>
            {pendingChangeLogs.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-3 text-xs text-amber-700">
                ⚠️ {tHere("目前有")} <strong>{pendingChangeLogs.length}</strong>{" "}
                {tHere("筆尚未同步的變更，匯入後不影響這些待同步項目。")}
              </div>
            )}
            <p className="text-gray-400 text-xs mb-4">
              {tHere("此操作不可復原")}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowImportConfirm(false);
                  setPendingImportFile(null);
                }}
                className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                {tHere("取消")}
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {tHere("確認匯入")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 匯入結果 modal */}
      {importResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3
              className={`text-lg font-bold mb-3 ${
                importResult.status === "success"
                  ? "text-green-700"
                  : "text-red-600"
              }`}
            >
              {importResult.status === "success"
                ? `${tHere("匯入完成")}`
                : `${tHere("匯入失敗")}`}
            </h3>
            <p className="text-gray-700 text-sm mb-3">{importResult.message}</p>
            {importResult.counts && (
              <ul className="text-xs text-gray-600 mb-3 space-y-0.5">
                {Object.entries(importResult.counts).map(([table, count]) => (
                  <li key={table} className="flex justify-between">
                    <span className="font-mono">{table}</span>
                    <span className="text-gray-500">{count} 筆</span>
                  </li>
                ))}
              </ul>
            )}
            {importResult.warnings && importResult.warnings.length > 0 && (
              <details className="mb-3">
                <summary className="text-xs text-amber-600 cursor-pointer">
                  ⚠️{" "}
                  {tHere("{n} 筆已跳過（點開查看詳情）", {
                    count: importResult.warnings.length,
                  })}
                </summary>
                <ul className="mt-1 text-xs text-gray-500 max-h-28 overflow-y-auto space-y-0.5">
                  {importResult.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </details>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setImportResult(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                {tHere("關閉")}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <Toast
          message={toastMessage}
          duration={4000}
          onClose={() => setToastMessage("")}
        />
      )}
    </div>
  );
}
