import { useEffect, useRef } from "react";
import { applyChange } from "../db/index";
import { useAppStore } from "../store/appStore";
import Utils from "../../../gas/src/Utils";
import { interruptTask } from "../utils/taskFlow";

export type SheetName = "inbox" | "scheduled" | "task_pool" | "micro_tasks" | "resource";

interface UseUrlActionOptions {
  onNavigate: (sheet: SheetName|"selection_cache") => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  clientId?: string;
}

/**
 * 監聽 URL Query 參數，自動將 iPhone Shortcut 的新增請求寫入 Dexie
 *
 * 使用範例：
 * useUrlAction({
 *   onNavigate: setCurrentSheet,
 *   onSuccess: setToast,
 *   clientId: 'iphone-shortcut'
 * })
 *
 * URL 格式：
 * ?sheet=inbox&action=add&title=Buy%20milk
 * ?sheet=scheduled&action=add&title=Morning%20Run&cronExpr=0%209%20*%20*%20*
 * ?sheet=micro_tasks&action=add&title=Read&url=https%3A%2F%2Fexample.com
 */
export function useUrlAction(options: UseUrlActionOptions) {
  const {
    onNavigate,
    onSuccess,
    onError,
    clientId = "iphone-shortcut",
  } = options;
  const isHandlingRef = useRef(false);

  useEffect(() => {
    if (isHandlingRef.current) return;

    const rawQuery = window.location.search;
    let queryString = rawQuery;
    if (rawQuery.includes('web+nbl')) {
      // 兼容 protocol handler 的 URL 格式：web+nbl://?sheet=inbox&action=add&title=Buy%20milk
      const protocolPrefix = 'web+nbl://';
      queryString = rawQuery.replace('?','').replace(protocolPrefix, '');
    }
    const params = new URLSearchParams(queryString);
    const sheet = params.get("sheet") as SheetName | null;
    const action = params.get("action");

    // 處理中斷動作
    if (action === "interrupt") {
      isHandlingRef.current = true;
      void handleInterruptAction(params).finally(() => {
        isHandlingRef.current = false;
      });
      return;
    }

    if (action === "query") {
      onNavigate("selection_cache"); // 自動切到 Selection Cache 頁籤
        // 清除 URL（避免重複新增）
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      return;
    }

    // 若沒有參數或 action 不是 'add'，不處理
    if (!sheet || action !== "add") return;

    // 允許的 sheet
    const validSheets: SheetName[] = [
      "inbox",
      "scheduled",
      "task_pool",
      "micro_tasks",
    ];
    if (!validSheets.includes(sheet)) {
      console.warn(`Invalid sheet: ${sheet}`);
      return;
    }

    // 先清除 URL，避免 StrictMode/重渲染導致同一 action 被重複觸發
    window.history.replaceState({}, document.title, window.location.pathname);
    isHandlingRef.current = true;

    // 提取所有參數為 record patch（排除 sheet 和 action）
    const patch: Record<string, unknown> = {};
    params.forEach((value, key) => {
      if (key !== "sheet" && key !== "action") {
        // *重要NOTE* 修復 URL 編碼問題：URLSearchParams 會將 + 解析成空格，需要手動恢復
        // 針對 ISO 8601 日期字符串的容錯處理
        let fixedValue = value;
        if (key === "nextRun" || key === "createdAt" || key === "updatedAt") {
          // 修复时区偏移中的空格 (e.g., "2026-03-10T10:00:00 08:00" → "2026-03-10T10:00:00+08:00")
          fixedValue = fixedValue.replace(/T(\d{2}:\d{2}:\d{2})\s+(\d{2}:\d{2})/, "T$1+$2");
        } else {
          // decodeURIComponent 會將 + 解析成空格，因此需要先將 + 替换回 %2B 再解码
          fixedValue = decodeURIComponent(fixedValue.replace(/\+/g, "%2B"));
        }

        // 嘗試解析數字
        if (!isNaN(Number(fixedValue))) {
          patch[key] = Number(fixedValue);
        } else {
          patch[key] = fixedValue;
        }
      }
    });

    // 補預設值，避免欄位顯示空白
    if (sheet === "inbox" && patch.receivedAt == null) {
      patch.receivedAt = Date.now();
    }

    // 生成 recordId
    const recordId = generateRecordId(sheet, patch);

    // 寫入 Dexie
    applyChange({
      table: sheet,
      recordId,
      op: "add",
      patch,
      clientId,
    })
      .then(() => {
        // 導航到該頁籤
        onNavigate(sheet);

        // 顯示成功提示
        const sheetLabel: Record<SheetName, string> = {
          inbox: "Inbox",
          scheduled: "Scheduled",
          task_pool: "Task Pool",
          micro_tasks: "Micro Tasks",
          resource: "Resource"
        };
        onSuccess?.(
          `✅ 已新增到 ${sheetLabel[sheet]}: ${patch.title || recordId}`,
        );

      })
      .catch((err) => {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("Failed to add from URL action:", err);
        onError?.(`❌ 新增失敗：${errorMsg}`);
      })
      .finally(() => {
        isHandlingRef.current = false;
      });
  }, [onNavigate, onSuccess, onError, clientId]);
}

/**
 * 處理中斷動作（使用 Zustand store，可在 .ts 文件中直接調用）
 */
function handleInterruptAction(params: URLSearchParams) {
  const note = params.get("note") || "";

  return interruptTask(note)
    .then((result) => {
      if (result.status === "success") {
        // ⏱️ 使用 queueMicrotask 確保 DOM 已更新後再設置狀態
        queueMicrotask(() => {
          useAppStore.setState({
            showEndDialog: true,
            isInterruptMode: true,
            currentSheet: "selection_cache", // 自動切到 Selection Cache 頁籤
          });
          console.log("✅ 已進入中斷模式，showEndDialog 設為 true");
        });
      } else {
        console.error("❌ 中斷失敗：", result.message);
      }

      // 清除 URL（避免重複執行）
      window.history.replaceState({}, document.title, window.location.pathname);
    })
    .catch((err) => {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("Failed to interrupt:", err);
      console.error("❌ 中斷失敗：", errorMsg);
    });
}

/**
 * 根據 sheet 類型生成 recordId，使用 GAS 的 ID 生成器
 */
function generateRecordId(
  sheet: SheetName,
  _patch: Record<string, unknown>,
): string {
  switch (sheet) {
    case "inbox":
      return Utils.generateId("I");
    case "task_pool":
      return Utils.generateId("T");
    case "micro_tasks":
      return Utils.generateId("t");
    case "scheduled":
      return Utils.generateId("S");
    default:
      return Utils.generateId("X");
  }
}
