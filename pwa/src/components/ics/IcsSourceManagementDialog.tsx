import React, { useState, useEffect, useRef } from "react";
import { applyChange, db } from "../../db/index";
import type { IcsSourceItem } from "../../db/schema";
import { parseIcsContent } from "../../utils/icsParser";
import { TableCard } from "../TableCard"; // 引入已修改好支援 accentColor/editLabel/isDisabled 的 TableCard
import Utils from "../../../../gas/src/Utils";
import { useTwaRpc } from "../../hooks/useTwaRpc";
import { getDeviceType } from "../../utils/shortcutUtils";
import { useProductTourContext } from "../tour/ProductTourContext";
import { useTWithMaps } from "../../i18n";
import { useAppStore } from "../../store/appStore";
import {
  getStoredSupabaseUrlKey,
  SupabaseSyncManager,
} from "../../utils/SupabaseSyncManager";

const DEV_CLIENT_ID = "ics_source_management_dialog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSynced?: (isSuccess: boolean) => void;
}

const PRESET_COLORS = [
  "#4285F4",
  "#0F9D58",
  "#F4B400",
  "#DB4437",
  "#9C27B0",
  "#00ACC1",
];

export function IcsSourceManagementDialog({
  isOpen,
  onClose,
  onSynced,
}: Props) {
  const [sources, setSources] = useState<IcsSourceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const syncType = useAppStore((state) => state.syncType);

  const { sendRequest } = useTwaRpc();
  const { nextStep, isRunning, activeStep } = useProductTourContext();

  // 新增/編輯 URL 來源的狀態
  const [editingSource, setEditingSource] = useState<IcsSourceItem | null>(
    null,
  );
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [showAddForm, setShowAddForm] = useState<IcsSourceItem["type"] | false>(
    false,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadSourceId, setUploadSourceId] = useState<string | null>(null);
  const tHere = useTWithMaps({
    "zh-TW": {
      Name: "名稱",
      URL: "網址",
      Color: "顏色",
      Save: "保存",
      Cancel: "取消",
      匯入的日曆: "匯入的日曆",
      成功解析n個日曆事件: "成功解析並更新 {n} 個日曆事件！",
      "匯入 ics 檔案失敗:": "匯入 ics 檔案失敗:",
      "匯入失敗，請確認檔案格式是否為標準 .ics":
        "匯入失敗，請確認檔案格式是否為標準 .ics",
      "外部日曆管理 (ICS Sources)": "外部日曆管理 (ICS Sources)",
      "匯入 .ics 檔案": "匯入 .ics 檔案",
      "新增 URL 訂閱": "新增 URL 訂閱",
      檔案: "檔案",
      編輯: "編輯",
      新增: "新增",
      取消: "取消",
      "標籤顏色：": "標籤顏色：",
      "日曆名稱 (如: Google 工作)": "日曆名稱 (如: Google 工作)",
      僅供參考: "僅供參考",
      儲存修改: "儲存修改",
      匯入檔案: "匯入檔案",
      "新增 URL": "新增 URL",
      目前無任何外部日曆來源: "目前無任何外部日曆來源",
      "已啟用 (點擊停用)": "已啟用 (點擊停用)",
      "已停用 (點擊啟用)": "已停用 (點擊啟用)",
      未同步: "未同步",
      覆蓋檔案: "覆蓋檔案",
      編輯設定: "編輯設定",
      上次更新: "上次更新",
      類型: "類型",
      檔案匯入: "檔案匯入",
      "URL 訂閱": "URL 訂閱",
      名稱: "名稱",
      關閉: "關閉",
    },
    en: {
      Name: "Name",
      URL: "URL",
      Color: "Color",
      Save: "Save",
      Cancel: "Cancel",
      成功解析n個日曆事件:
        "Successfully parsed and updated {n} calendar events!",
      匯入的日曆: "Imported Calendars",
      "匯入 ics 檔案失敗:": "Failed to import ics file:",
      "匯入失敗，請確認檔案格式是否為標準 .ics":
        "Import failed, please make sure the file format is standard .ics",
      "外部日曆管理 (ICS Sources)":
        "External Calendar Management (ICS Sources)",
      "匯入 .ics 檔案": "Import .ics File",
      "新增 URL 訂閱": "Add URL Subscription",
      檔案: "File",
      編輯: "Edit",
      新增: "Add",
      取消: "Cancel",
      "標籤顏色：": "Label Color:",
      "日曆名稱 (如: Google 工作)": "Calendar Name (e.g., Google Work)",
      僅供參考: "For reference only",
      儲存修改: "Save Changes",
      匯入檔案: "Import File",
      "新增 URL": "Add URL",
      目前無任何外部日曆來源: "No external calendar sources at the moment",
      "已啟用 (點擊停用)": "Enabled (click to disable)",
      "已停用 (點擊啟用)": "Disabled (click to enable)",
      未同步: "Not Synced",
      覆蓋檔案: "Overwrite File",
      編輯設定: "Edit Settings",
      上次更新: "Last Updated",
      類型: "Type",
      檔案匯入: "File Import",
      "URL 訂閱": "URL Subscription",
      名稱: "Name",
      關閉: "Close",
    },
    ja: {
      Name: "名前",
      URL: "URL",
      Color: "色",
      Save: "保存",
      Cancel: "キャンセル",
      匯入的日曆: "インポートされたカレンダー",
      成功解析n個日曆事件:
        "{n} 件のカレンダーイベントを正常に解析して更新しました！",
      "匯入 ics 檔案失敗:": "ics ファイルのインポートに失敗しました:",
      "匯入失敗，請確認檔案格式是否為標準 .ics":
        "インポートに失敗しました。ファイル形式が標準の .ics であることを確認してください。",
      "外部日曆管理 (ICS Sources)": "外部カレンダー管理 (ICS Sources)",
      "匯入 .ics 檔案": ".ics ファイルをインポート",
      "新增 URL 訂閱": "URL サブスクリプションを追加",
      檔案: "ファイル",
      編輯: "編集",
      新增: "追加",
      取消: "キャンセル",
      "標籤顏色：": "ラベルの色：",
      "日曆名稱 (如: Google 工作)": "カレンダー名 (例: Google Work)",
      僅供參考: "参考用のみ",
      儲存修改: "変更を保存",
      匯入檔案: "ファイルをインポート",
      "新增 URL": "URL を追加",
      目前無任何外部日曆來源: "現在外部カレンダーソースはありません",
      "已啟用 (點擊停用)": "有効 (クリックで無効化)",
      "已停用 (點擊啟用)": "無効 (クリックで有効化)",
      未同步: "未同期",
      覆蓋檔案: "ファイルを上書き",
      編輯設定: "設定を編集",
      上次更新: "最終更新",
      類型: "タイプ",
      檔案匯入: "ファイルインポート",
      "URL 訂閱": "URL サブスクリプション",
      名稱: "名前",
      關閉: "閉じる",
    },
  });

  const loadSources = async () => {
    try {
      const items = await db.ics_sources.toArray();
      setSources(items);
    } catch (err) {
      console.error("Failed to load ics sources:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSources();
      setShowAddForm(false);
      setEditingSource(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. 切換啟用 / 停用
  const toggleSourceEnabled = async (source: IcsSourceItem) => {
    await applyChange({
      table: "ics_sources",
      recordId: source.sourceId,
      op: "update",
      patch: {
        enabled: !source.enabled,
        updatedAt: Date.now(),
      } as unknown as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    });
    await loadSources();
    if (onSynced) onSynced(true);
  };

  // 2. 刪除 Source 及關聯的 ics_events
  const deleteSource = async (sourceId: string) => {
    await db.transaction(
      "rw",
      [db.ics_sources, db.ics_events, db.change_log],
      async () => {
        await applyChange({
          table: "ics_sources",
          recordId: sourceId,
          op: "delete",
          patch: {} as Record<string, unknown>,
          clientId: DEV_CLIENT_ID,
        });
        // 還是先一個一個刪好了
        const events = await db.ics_events
          .where("sourceId")
          .equals(sourceId)
          .toArray();
        for (const event of events) {
          await applyChange({
            table: "ics_events",
            recordId: event.eventId,
            op: "delete",
            patch: {} as Record<string, unknown>,
            clientId: DEV_CLIENT_ID,
          });
        }
        // await applyChange({
        //   table: "ics_events",
        //   recordId: sourceId,
        //   op: "bulkdelete",
        //   patch: {} as Record<string, unknown>,
        //   clientId: DEV_CLIENT_ID,
        //   option: { equal: ["sourceId", sourceId] },
        // });
      },
    );
    await loadSources();
    if (onSynced) onSynced(true);
  };

  /**
   * 記得，ics_sources 得先存在，才能更新對應的 ics_events與更新 ics_sources。
   * @param content The content of the .ics file to be parsed.
   * @param sourceId The ID of the source to update with the parsed events.
   */
  async function parseAndUpdateIcsTables(content: string, sourceId: string) {
    const parsedEvents = await parseIcsContent(content, sourceId);
    const originalEvents = await db.ics_events
      .where("sourceId")
      .equals(sourceId)
      .toArray();
    // 原則上 parsedEvents 全都要存進去(update or add)，但是，若 parsed & original 的 rawIcs 相同，則可以跳過，避免重複存儲
    // 然後，original 裡面若有不在 parsedEvents 中的事件，則可以刪除，保持同步
    const eventsToAddOrUpdate = parsedEvents.filter(
      (parsedEvent) =>
        !originalEvents.some(
          (originalEvent) => originalEvent.rawIcs === parsedEvent.rawIcs,
        ),
    );
    // 根據 eventId 將 eventsToAddOrUpdate 根據 eventId 分成add & update
    const eventsToActuallyAdd = eventsToAddOrUpdate.filter(
      (event) =>
        !originalEvents.some(
          (originalEvent) => originalEvent.eventId === event.eventId,
        ),
    );
    const eventsToActuallyUpdate = eventsToAddOrUpdate.filter((event) =>
      originalEvents.some(
        (originalEvent) => originalEvent.eventId === event.eventId,
      ),
    );

    const eventsToDelete = originalEvents.filter(
      (originalEvent) =>
        !parsedEvents.some(
          (parsedEvent) =>
            parsedEvent.rawIcs === originalEvent.rawIcs ||
            parsedEvent.eventId === originalEvent.eventId,
        ),
    );

    await db.transaction(
      "rw",
      [db.ics_events, db.ics_sources, db.change_log],
      async () => {
        // 先刪除不在 parsedEvents 中的事件，再新增或更新 parsedEvents 中的事件
        // 刪除 eventsToDelete
        for (const event of eventsToDelete) {
          await applyChange({
            table: "ics_events",
            recordId: event.eventId,
            op: "delete",
            patch: {} as Record<string, unknown>,
            clientId: DEV_CLIENT_ID,
          });
        }
        // 新增 eventsToActuallyAdd
        for (const event of eventsToActuallyAdd) {
          await applyChange({
            table: "ics_events",
            recordId: event.eventId,
            op: "add",
            patch: event as unknown as Record<string, unknown>,
            clientId: DEV_CLIENT_ID,
          });
        }
        // 更新 eventsToActuallyUpdate
        for (const event of eventsToActuallyUpdate) {
          await applyChange({
            table: "ics_events",
            recordId: event.eventId,
            op: "update",
            patch: event as unknown as Record<string, unknown>,
            clientId: DEV_CLIENT_ID,
          });
        }
        await applyChange({
          table: "ics_sources",
          recordId: sourceId,
          op: "update",
          patch: {
            lastSyncedAt: Date.now(),
            updatedAt: Date.now(),
          },
          clientId: DEV_CLIENT_ID,
        });
      },
    );

    return parsedEvents.length;
  }

  // 3. 處理 .ics 檔案上傳解析 (匯入/覆蓋)
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    sourceId?: string,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const content = await file.text();
      let targetSourceId = sourceId;

      if (targetSourceId) {
        // 如果已經有 targetSourceId，表示是更新現有的 Source，這裡可以做一些額外處理，例如清空表單或提示用戶
        await applyChange({
          table: "ics_sources",
          recordId: targetSourceId,
          op: "update",
          patch: {
            name: formName.trim(),
            url: formUrl.trim(),
            color: selectedColor,
            updatedAt: Date.now(),
          } as unknown as Record<string, unknown>,
          clientId: DEV_CLIENT_ID,
        });
      } else {
        targetSourceId = Utils.generateId("SRC_FILE_");
        const newSource: IcsSourceItem = {
          sourceId: targetSourceId,
          name:
            formName.trim() ||
            file.name.replace(/\.ics$/i, "") ||
            tHere("匯入的日曆"),
          url: formUrl.trim(),
          type: "file",
          color: selectedColor,
          enabled: true,
          lastSyncedAt: Date.now(),
          updatedAt: Date.now(),
        };
        await applyChange({
          table: "ics_sources",
          recordId: targetSourceId,
          op: "put",
          patch: newSource as unknown as Record<string, unknown>,
          clientId: DEV_CLIENT_ID,
        });
      }

      // 呼叫 ical.js 解析
      const eventsLength = await parseAndUpdateIcsTables(
        content,
        targetSourceId,
      );

      alert(`${tHere("成功解析n個日曆事件", { n: eventsLength })}`);
      await loadSources();

      setEditingSource(null);
      setShowAddForm(false);

      if (onSynced) onSynced(true);
    } catch (err) {
      console.error(tHere("匯入 ics 檔案失敗:"), err);
      alert(tHere("匯入失敗，請確認檔案格式是否為標準 .ics"));
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 4. 點擊編輯 TableCard 處理 (onEdit)
  const handleEditSource = (src: IcsSourceItem) => {
    if (src.type === "file") {
      // 檔案類型：直接開啟選檔視窗進行更新覆蓋
      setUploadSourceId(src.sourceId);
    }
    // URL 類型：打開編輯表單 Modal/Form
    setEditingSource(src);
    setFormName(src.name);
    setFormUrl(src.url || "");
    setSelectedColor(src.color || PRESET_COLORS[0]);

    setShowAddForm(src.type);
  };

  // 5. 儲存 URL 新增/編輯
  const handleSaveUrlSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    let editingSourceId = editingSource?.sourceId ?? "";
    if (editingSource) {
      // 編輯現有 Source
      await applyChange({
        table: "ics_sources",
        recordId: editingSourceId,
        op: "update",
        patch: {
          name: formName.trim(),
          url: formUrl.trim(),
          color: selectedColor,
          updatedAt: Date.now(),
        } as unknown as Record<string, unknown>,
        clientId: DEV_CLIENT_ID,
      });
    } else {
      // 新增 URL Source
      editingSourceId = Utils.generateId("SRC_URL_");
      const newSource: IcsSourceItem = {
        sourceId: editingSourceId,
        name: formName.trim(),
        type: "url",
        url: formUrl.trim(),
        color: selectedColor,
        enabled: true,
        updatedAt: Date.now(),
      };
      await applyChange({
        table: "ics_sources",
        recordId: editingSourceId,
        op: "put",
        patch: newSource as unknown as Record<string, unknown>,
        clientId: DEV_CLIENT_ID,
      });
    }

    setShowAddForm(false);
    setEditingSource(null);
    setFormName("");
    setFormUrl("");
    await loadSources();

    const dType = getDeviceType();
    let isSuccess = false;
    // 分為四階段取得 ics，1. Android WebView, 2. 直連, 3. Supabase fetch-ics Edge function, 4. 告知使用者改用手動匯入
    // 1. 直連
    if (["AndroidWebView"].includes(dType)) {
      try {
        const res = (await sendRequest("nbl:fetch-ics", {
          url: formUrl.trim(),
        })) as { icsContent: string };
        const eventsLength = await parseAndUpdateIcsTables(
          res.icsContent,
          editingSourceId,
        );
        isSuccess = true;
        alert(tHere("成功解析n個日曆事件", { n: eventsLength }));
      } catch (error) {
        isSuccess = false;
      }
    } else {
      // 2. 直連 ics URL
      try {
        const res = await (await fetch(formUrl.trim())).text();
        const eventsLength = await parseAndUpdateIcsTables(
          res,
          editingSourceId,
        );
        isSuccess = true;
        alert(tHere("成功解析n個日曆事件", { n: eventsLength }));
      } catch (error) {
        isSuccess = false;
      }
      // 3. Supabase fetch-ics Edge function
      if (
        !isSuccess &&
        syncType === "supabase" &&
        !!getStoredSupabaseUrlKey()
      ) {
        try {
          const syncSupabaseStr = getStoredSupabaseUrlKey();
          const manager = new SupabaseSyncManager(syncSupabaseStr);
          const data = await manager.fetchIcs(formUrl.trim());
          const eventsLength = await parseAndUpdateIcsTables(
            data.icsContent,
            editingSourceId,
          );
          isSuccess = true;
          alert(tHere("成功解析n個日曆事件", { n: eventsLength }));
        } catch (error) {
          isSuccess = false;
        }
      }
    }

    if (onSynced) onSynced(isSuccess);
  };

  return (
    <div
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 mb-3">
          <h2 className="text-base font-bold text-gray-800">
            {tHere("外部日曆管理 (ICS Sources)")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2"
          >
            ✕
          </button>
        </div>

        {/* 隱藏的 File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".ics,text/calendar"
          className="hidden"
          onChange={(e) => handleFileUpload(e, uploadSourceId || undefined)}
        />

        {/* 頂部操作列 */}
        {!showAddForm ? (
          <div className="flex gap-2 pb-2" data-tour="add-ics-source-buttons">
            <button
              type="button"
              disabled={
                loading || (isRunning && getDeviceType() === "AndroidWebView")
              }
              onClick={() => {
                setUploadSourceId(null);
                // fileInputRef.current?.click();
                setFormName("");
                setFormUrl("");
                setSelectedColor(PRESET_COLORS[0]);
                setShowAddForm("file");
                if (isRunning && activeStep?.id === "add-ics-source")
                  nextStep();
              }}
              className="flex-1 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              📁 {tHere("匯入 .ics 檔案")}
            </button>
            <button
              type="button"
              disabled={getDeviceType() !== "AndroidWebView"}
              onClick={() => {
                setEditingSource(null);
                setFormName("");
                setFormUrl("");
                setSelectedColor(PRESET_COLORS[0]);
                setShowAddForm("url");
                if (isRunning && activeStep?.id === "add-ics-source")
                  nextStep();
              }}
              className="flex-1 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              🔗 {tHere("新增 URL 訂閱")}
            </button>
          </div>
        ) : (
          /* 新增 / 編輯 URL 表單區塊 */
          <form
            onSubmit={(e) => {
              if (isRunning && activeStep?.id === "save-ics-source") {
                nextStep();
              }
              e.preventDefault();
              return showAddForm === "url"
                ? handleSaveUrlSource(e)
                : fileInputRef.current?.click();
            }}
            className="bg-gray-50 p-3.5 rounded-lg border space-y-3 mb-2"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-700">
                {editingSource ? tHere("編輯") : tHere("新增")}
                {showAddForm === "file" ? tHere("檔案") : tHere("URL")}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingSource(null);
                }}
                className="text-xs text-gray-500 hover:underline"
              >
                {tHere("取消")}
              </button>
            </div>

            {/* 顏色選擇 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {tHere("標籤顏色：")}
              </span>
              <div className="flex gap-1.5" data-tour="select-a-color">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    style={{ backgroundColor: c }}
                    className={`w-5 h-5 rounded-full border transition ${
                      selectedColor === c
                        ? "ring-2 ring-offset-1 ring-blue-500 scale-110"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedColor(c);
                      if (isRunning && activeStep?.id === "select-a-color") {
                        nextStep();
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            <input
              type="text"
              placeholder={tHere("日曆名稱 (如: Google 工作)")}
              value={formName}
              data-tour="input-src-name"
              required
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-2.5 py-1.5 border rounded text-xs focus:outline-none focus:border-blue-500 bg-white"
            />
            <input
              type="url"
              placeholder={`${showAddForm === "url" ? "https://calendar.google.com/.../basic.ics" : tHere("僅供參考")}`}
              value={formUrl}
              data-tour="input-src-url"
              onChange={(e) => setFormUrl(e.target.value)}
              className={`w-full px-2.5 py-1.5 border rounded text-xs focus:outline-none focus:border-blue-500 bg-white`}
            />

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="submit"
                data-tour="save-ics-source-button"
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
              >
                {editingSource
                  ? tHere("儲存修改")
                  : `${showAddForm === "file" ? tHere("匯入檔案") : tHere("新增 URL")}`}
              </button>
            </div>
          </form>
        )}

        <div
          className={`overflow-y-auto flex-1 pr-1 space-y-4 ${editingSource ? "hidden" : ""}`}
        >
          {/* 下方：使用 TableCard 呈現 sources 列表 */}
          <div className="space-y-2.5">
            {sources.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">
                {tHere("目前無任何外部日曆來源")}
              </p>
            ) : (
              sources.map((src) => (
                <TableCard
                  key={src.sourceId}
                  item={src}
                  editLabel={
                    src.type === "file" ? tHere("覆蓋檔案") : tHere("編輯設定")
                  }
                  accentColor={src.color || "#9E9E9E"}
                  isDisabled={!src.enabled} // 停用時半透明處理
                  fields={[
                    { label: tHere("名稱"), value: src.name },
                    {
                      label: tHere("類型"),
                      value:
                        src.type === "file"
                          ? `📁 ${tHere("檔案匯入")}`
                          : `🔗 ${tHere("URL 訂閱")}`,
                    },
                    {
                      label: tHere("上次更新"),
                      value: src.lastSyncedAt
                        ? new Date(src.lastSyncedAt).toLocaleString("zh-TW")
                        : tHere("未同步"),
                    },
                  ]}
                  onEdit={handleEditSource}
                  onDelete={(item) => deleteSource(item.sourceId)}
                  quickAction={{
                    label: src.enabled
                      ? tHere("已啟用 (點擊停用)")
                      : tHere("已停用 (點擊啟用)"),
                    onClick: (item) => toggleSourceEnabled(item),
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-3 mt-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 font-medium"
          >
            {tHere("關閉")}
          </button>
        </div>
      </div>
    </div>
  );
}
