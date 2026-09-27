import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  db,
  IcsExportConfigItem,
  ScheduledItem,
  TASK_PREFIX,
} from "../../db/schema";
import { TableCard } from "../TableCard";
import { BaseDialog } from "./BaseDialog";
import { EditDialog } from "../EditDialog";
import { useTWithMaps } from "../../i18n";
import { applyChange } from "../../db/changeLog";
import { PlusIcon } from "../svgIcons";
import Utils from "../../../../gas/src/Utils";
import _ from "lodash";
import { getAllSubProjectIds } from "../../utils/projectTreeUtils";
import ICAL from "ical.js";
import { useAppStore } from "../../store/appStore";

const CLIENT_ID = "ICS_Export_Config";

interface IcsExportConfigTableProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IcsExportConfigTable({
  isOpen,
  onClose,
}: IcsExportConfigTableProps) {
  const [exportConfigs, setExportConfigs] = useState<IcsExportConfigItem[]>([]);
  const [editingItem, setEditingItem] = useState<IcsExportConfigItem | null>(
    null,
  );
  const [createdItem, setCreatedItem] = useState<IcsExportConfigItem | null>(
    null,
  );
  const [scheduledItems, setScheduledItems] = useState<ScheduledItem[]>([]);
  const projects = useAppStore((state) => state.projects);

  useEffect(() => {
    const fetchScheduledItems = async () => {
      const items = await db.scheduled.toArray();
      setScheduledItems(items);
    };
    fetchScheduledItems();
  }, []);

  const exportICSFile = useMemo(() => {
    return {
      label: "Export ICS File",
      onClick: (config: IcsExportConfigItem) => {
        // 1. 根據 config 由 db.scheduled 取得滿足條件的排程項目
        // 1.1 根據 projectIds 過濾排程項目，也要考慮子專案們
        const allProjects = projects;
        const selectedProjectIds =
          (config.projectIds?.length ?? 0) > 0
            ? _.union(
                config.projectIds,
                config.includeSubProjects
                  ? config.projectIds!.flatMap((id) =>
                      getAllSubProjectIds(allProjects, id),
                    )
                  : [],
              )
            : [];
        // 1.2 只要 scheduledItems.projectIds 與 selectedProjectIds 有交集就保留
        const filteredScheduledItems = scheduledItems.filter((item) =>
          item.projectIds?.some((id) => selectedProjectIds.includes(id)),
        );
        // 2. 根據過濾後的排程項目生成 ICS 文件
        const icsFileContent = generateIcsRawData(
          filteredScheduledItems,
          config.exportPrivateNotes,
        );
        // 3. 可以在這裡進行後續操作，例如下載 ICS 文件或上傳到雲端
        console.log("Exporting ICS file for config:", config);
        console.log("ICS file content:", icsFileContent);
        // 4. 觸發下載 ICS 文件
        const blob = new Blob([icsFileContent], { type: "text/calendar" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = config.fileName ?? "export.ics";
        a.click();
        URL.revokeObjectURL(url);
      },
    };
  }, [projects, scheduledItems]);

  const tHere = useTWithMaps({
    "zh-TW": {
      name: "名稱",
      fileName: "檔案名稱",
      description: "描述",
      enabled: "是否啟用",
      projectIds: "專案 ID",
      includeSubProjects: "是否包含專案 ID",
      timeRangeDaysBefore: "時間範圍（天數前）",
      timeRangeDaysAfter: "時間範圍（天數後）",
      exportPrivateNotes: "是否匯出私人筆記",
      driveFileId: "檔案 ID",
      add: "新增",
      url: "公開存取 URL",
      lastGeneratedAt: "上次生成時間",
      updatedAt: "最後異動時間",
      編輯輸出組態: "編輯輸出ICS組態",
      HeaderLabel: "ICS 匯出設定",
    },
    en: {
      name: "Name",
      fileName: "File Name",
      description: "Description",
      enabled: "Enabled",
      projectIds: "Project IDs",
      includeSubProjects: "Include Sub-Projects?",
      timeRangeDaysBefore: "Time Range (Days Before)",
      timeRangeDaysAfter: "Time Range (Days After)",
      exportPrivateNotes: "Export Private Notes",
      driveFileId: "File ID",
      url: "Public URL",
      lastGeneratedAt: "Last Generated At",
      updatedAt: "Last Updated At",
      add: "Add",
      編輯輸出組態: "Edit Export ICS Configuration",
      HeaderLabel: "ICS Export Settings",
    },
    ja: {
      name: "名前",
      fileName: "ファイル名",
      description: "説明",
      enabled: "有効",
      projectIds: "プロジェクトID",
      includeSubProjects: "サブプロジェクトを含めるか",
      timeRangeDaysBefore: "期間（日數前）",
      timeRangeDaysAfter: "期間（日數後）",
      exportPrivateNotes: "プライベートノートをエクスポートするか",
      driveFileId: "ファイルID",
      url: "公開URL",
      lastGeneratedAt: "最終生成日時",
      updatedAt: "最終更新日時",
      add: "追加",
      編輯輸出組態: "エクスポートICS設定を編集",
      HeaderLabel: "ICSエクスポート設定",
    },
  });

  useEffect(() => {
    db.ics_export_configs.toArray().then(setExportConfigs);
  }, []);

  if (!isOpen) return null;
  function handleEdit(item: IcsExportConfigItem): void {
    setEditingItem(item);
  }

  async function handleDelete(item: IcsExportConfigItem): Promise<void> {
    // 更新本地狀態中的 ICS Export Configurations
    setExportConfigs((prev) => prev.filter((config) => config.id !== item.id));
    // 更新資料庫中的 ICS Export Configurations
    await applyChange({
      op: "delete",
      recordId: item.id,
      table: "ics_export_configs",
      patch: {},
      clientId: CLIENT_ID,
    });
    setEditingItem(null);
  }

  async function onEditDialogSave(data: Record<string, any>): Promise<void> {
    const updatedItem = { ...editingItem, ...data } as IcsExportConfigItem;
    // 更新本地狀態中的 ICS Export Configurations
    setExportConfigs((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
    );
    // 更新資料庫中的 ICS Export Configurations
    await applyChange({
      op: "update",
      recordId: updatedItem.id,
      table: "ics_export_configs",
      patch: { ...updatedItem },
      clientId: CLIENT_ID,
    });
  }

  /**
   * 不管如何，先造一個新的 ICS Export Configuration 項目
   */
  async function handleAddAnItem() {
    const newItem: IcsExportConfigItem = {
      id: Utils.generateId(TASK_PREFIX.ics_export_configs),
      name: tHere("name"),
      fileName: "base.ics",
      description: tHere("description"),
      enabled: true,
      updatedAt: Date.now(),
    };
    setExportConfigs((prev) => [...prev, newItem]);
    setEditingItem(newItem);
    setCreatedItem(newItem); // 利用這個狀態來追蹤剛剛創建的項目
    await applyChange({
      op: "add",
      recordId: newItem.id,
      table: "ics_export_configs",
      patch: { ...newItem },
      clientId: CLIENT_ID,
    });
  }

  /**
   * 記得，無論按保存還是取消，都會跑這裡
   * @param isSaved Indicates whether the changes were saved before closing the dialog.
   */
  async function handleEditDialogClose(
    isSaved?: boolean | undefined,
  ): Promise<void> {
    if (isSaved) {
      // 可以在這裡處理保存後的邏輯
    } else {
      // 可以在這裡處理取消後的邏輯
      if (createdItem && createdItem.id === editingItem?.id) {
        setExportConfigs((prev) =>
          prev.filter((config) => config.id !== createdItem.id),
        );
        // 刪除剛剛創建但未保存的項目
        await applyChange({
          op: "delete",
          recordId: createdItem.id,
          table: "ics_export_configs",
          patch: {},
          clientId: CLIENT_ID,
        });
      }
    }
    setCreatedItem(null);
    setEditingItem(null);
  }

  return (
    <>
      <BaseDialog
        isOpen={isOpen && editingItem === null}
        onClose={onClose}
        className="z-20"
      >
        <div className="space-y-2.5 p-2">
          {/* 標頭列 */}
          <div className="font-bold flex flex-row">
            <div>{tHere("HeaderLabel")}</div>
            <button
              className="ml-auto bg-blue-500 text-white px-4 py-2 rounded flex flex-row flex-wrap items-center"
              onClick={() => {
                handleAddAnItem();
              }}
            >
              <PlusIcon /> {tHere("add")}
            </button>
          </div>
          {/* 額外設定 */}
          {/* <div>TODO: Additional settings for ICS Export Configurations</div> */}
          {/* 編輯區塊 */}
          <div className="space-y-2.5">
            {exportConfigs.map((config) => (
              <TableCard
                key={config.id}
                item={config}
                fields={[
                  { label: tHere("name"), value: config.name },
                  { label: tHere("fileName"), value: config.fileName },
                  {
                    label: tHere("enabled"),
                    value: JSON.stringify(config.enabled),
                  },
                  ...(config.description
                    ? [
                        {
                          label: tHere("description"),
                          value: config.description,
                        },
                      ]
                    : []),
                  {
                    label: tHere("updatedAt"),
                    value: dayjs(config.updatedAt).format(
                      "YYYY-MM-DD HH:mm:ss",
                    ),
                  },
                ]}
                onEdit={handleEdit}
                onDelete={handleDelete}
                quickAction={exportICSFile}
              />
            ))}
          </div>
        </div>
      </BaseDialog>
      <EditDialog
        isOpen={editingItem !== null}
        onClose={handleEditDialogClose}
        title={tHere("編輯輸出組態")}
        item={editingItem}
        onSave={onEditDialogSave}
        fields={[
          {
            name: "name",
            type: "text",
            label: tHere("name"),
            value: editingItem?.name ?? "",
          },
          {
            name: "fileName",
            type: "text",
            label: tHere("fileName"),
            value: editingItem?.fileName ?? "",
          },
          {
            name: "enabled",
            type: "checkbox" as const,
            label: tHere("enabled"),
            value: editingItem?.enabled ?? false,
          },
          {
            name: "description",
            type: "text" as const,
            label: tHere("description"),
            value: editingItem?.description,
          },
          // 核心過濾條件
          {
            name: "projectIds",
            label: tHere("projectIds"),
            type: "projectIds" as const,
          },
          {
            name: "includeSubProjects",
            label: tHere("includeSubProjects"),
            type: "checkbox" as const,
            value: editingItem?.includeSubProjects ?? false,
          },
          // 匯出細節調整
          {
            name: "timeRangeDaysBefore",
            label: tHere("timeRangeDaysBefore"),
            type: "number" as const,
            value: editingItem?.timeRangeDaysBefore ?? 30,
          },
          {
            name: "timeRangeDaysAfter",
            label: tHere("timeRangeDaysAfter"),
            type: "number" as const,
            value: editingItem?.timeRangeDaysAfter ?? 90,
          },
          {
            name: "exportPrivateNotes",
            label: tHere("exportPrivateNotes"),
            type: "checkbox" as const,
            value: editingItem?.exportPrivateNotes ?? false,
          },
          // GAS / Supabase 自動發布資訊
          {
            name: "driveFileId",
            label: tHere("driveFileId"),
            type: "text" as const,
            value: editingItem?.driveFileId ?? "",
          },
          {
            name: "url",
            label: tHere("url"),
            type: "text" as const,
            value: editingItem?.url ?? "",
          },
          {
            name: "lastGeneratedAt",
            label: tHere("lastGeneratedAt"),
            type: "datetime" as const,
            value: editingItem?.lastGeneratedAt
              ? dayjs(editingItem.lastGeneratedAt).format("YYYY-MM-DD HH:mm:ss")
              : "",
            readOnly: true,
          },
          {
            name: "updatedAt",
            label: tHere("updatedAt"),
            type: "datetime" as const,
            value: editingItem?.updatedAt
              ? dayjs(editingItem.updatedAt).format("YYYY-MM-DD HH:mm:ss")
              : "",
            readOnly: true,
          },
        ]}
      />
    </>
  );
}

function generateIcsRawData(
  filteredScheduledItems: ScheduledItem[],
  exportNote = false,
) {
  // 1. 只取 title, note, nextRun (就是startAt)
  // 2. 生成 ICS 文件內容的字串
  let calendar = new ICAL.Component(["vcalendar", [], []]);
  // 2.1 加上 version 與 prodid
  let version = new ICAL.Property("version");
  version.setValue("2.0");
  calendar.addProperty(version);
  let prodid = new ICAL.Property("prodid");
  prodid.setValue("-//YesCirculation-Solutions//NONBLOCKINGLIFE//EN");
  calendar.addProperty(prodid);
  // 2.2 生成每個事件的子組件
  filteredScheduledItems
    .filter((item) => item.nextRun)
    .forEach(({ title, note, nextRun, focusTime }) => {
      let event = new ICAL.Component("vevent");
      let eventProps = new ICAL.Property("summary");
      eventProps.setValue(title);
      event.addProperty(eventProps);
      if (note && exportNote) {
        let description = new ICAL.Property("description");
        description.setValue(note);
        event.addProperty(description);
      }
      // 2.2.1 設定事件的開始時間
      let start = new ICAL.Property("dtstart");
      start.setValue(ICAL.Time.fromJSDate(new Date(nextRun!),true));
      event.addProperty(start);
      // 2.2.2 設定事件的結束時間 (假設事件持續 30 分鐘)
      let end = new ICAL.Property("dtend");
      let endTime = ICAL.Time.fromJSDate(new Date(nextRun!+60*1000*(focusTime??30)), true);
      end.setValue(endTime);
      event.addProperty(end);
      // 2.2.3 加入 UID
      let uid = new ICAL.Property("uid");
      uid.setValue(`${nextRun!}-${Math.random().toString(36).slice(2, 9)}@yescirculation-solutions.com`);
      event.addProperty(uid);

      calendar.addSubcomponent(event);
    });
  return calendar.toString();
}
