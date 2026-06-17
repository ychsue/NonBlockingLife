import { useEffect, useRef } from "react";
import { applyChange } from "../db/index";
import { useAppStore } from "../store/appStore";
import Utils from "../../../gas/src/Utils";
import { interruptTask } from "../utils/taskFlow";

export type SheetName =
  | "inbox"
  | "scheduled"
  | "task_pool"
  | "micro_tasks"
  | "resource";

interface UseUrlActionOptions {
  onNavigate: (sheet: SheetName | "selection_cache") => void;
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

    const clearActionUrl = () => {
      const currentPath = window.location.pathname;
      const sharePathPattern = /\/share-to-inbox\/?$/;

      if (sharePathPattern.test(currentPath)) {
        const basePath = currentPath.replace(sharePathPattern, "") || "/";
        const targetPath = basePath === "/" ? "/" : `${basePath.replace(/\/+$/, "")}/`;
        window.history.replaceState({}, document.title, targetPath);
        return;
      }

      window.history.replaceState({}, document.title, currentPath);
    };

    const rawQuery = window.location.search;
    const protocolPrefix = encodeURIComponent("web+nbl://");
    let queryString = rawQuery;
    const isShareToInboxPath = /\/share-to-inbox\/?$/.test(
      window.location.pathname,
    );
    if (rawQuery.includes(protocolPrefix)) {
      // 兼容 protocol handler 的 URL 格式：web+nbl://?sheet=inbox&action=add&title=Buy%20milk
      queryString = rawQuery
        .replace("?", "")
        .replace(protocolPrefix, "")
        .replace(/%3D/g, "=")
        .replace(/%26/g, "&");
      if (queryString.endsWith(encodeURIComponent("/"))) {
        queryString = queryString.slice(0, -encodeURIComponent("/").length);
      }
    }
    const params = new URLSearchParams(queryString);
    if (isShareToInboxPath && !params.has("action")) {
      params.set("action", "share-to-inbox");
    }
    const sheet = params.get("sheet") as SheetName | null;
    const action = params.get("action");

    if (action === "share-to-inbox") {
      // Web Share Target 僅支援 title/text/url，非 URL 欄位合併成 title。
      const shareTitle = (params.get("title") || "").trim();
      const shareText = (params.get("text") || "").trim();
      const shareUrl = (params.get("url") || "").trim();
      const mergedTitle = [shareTitle, shareText].filter(Boolean).join("\n");

      const patch: Record<string, unknown> = {
        title: mergedTitle || shareUrl || "Shared item",
        receivedAt: Date.now(),
      };

      if (shareUrl) {
        patch.url = shareUrl;
      }

      const recordId = generateRecordId("inbox", patch);
      isHandlingRef.current = true;

      applyChange({
        table: "inbox",
        recordId,
        op: "add",
        patch,
        clientId,
      })
        .then(() => {
          onNavigate("inbox");
          onSuccess?.(`✅ 已分享到 Inbox: ${patch.title || recordId}`);
        })
        .catch((err) => {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error("Failed to add from share target:", err);
          onError?.(`❌ 分享失敗：${errorMsg}`);
        })
        .finally(() => {
          clearActionUrl();
          isHandlingRef.current = false;
        });
      return;
    }

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
      clearActionUrl();
      return;
    }

    // 處理 task 搜尋動作：?action=search&query=xxx
    if (action === "search") {
      const searchQuery = params.get("query") || "";
      onNavigate("selection_cache");
      queueMicrotask(() => {
        useAppStore.setState({
          taskSearchInitQuery: searchQuery,
          showTaskSearchDialog: true,
        });
      });
      clearActionUrl();
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
    clearActionUrl();
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
          fixedValue = fixedValue.replace(
            /T(\d{2}:\d{2}:\d{2})\s+(\d{2}:\d{2})/,
            "T$1+$2",
          );
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
          resource: "Resource",
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
