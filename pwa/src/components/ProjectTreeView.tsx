import { useEffect, useRef, useState } from "react";
import { db, ProjectItem } from "../db/schema";
import {
  buildProjectTree,
  getAllParentProjectIds,
  getAllSubProjectIds,
  ProjectTreeNode,
} from "../utils/projectTreeUtils";
import { applyChange, ApplyChangeParams } from "../db/changeLog";
import { useDialogStore } from "../store/dialogStore";
import "drag-drop-touch";
import _ from "lodash";
import { useAppStore } from "../store/appStore";
import { EditIcon,PlusIcon, DeleteIcon, VerticalLargeDotsIcon, FolderIcon } from "./svgIcons";
const CLIENT_ID = "PROJECT_TREE_VIEW";

export interface ProjectTreeViewProps {
  iniSelectedIds: string[];
  allowEdit?: boolean;
  onCancel: () => void;
  onConfirm: ({
    items,
    selectedIds,
  }: {
    items: ProjectItem[];
    selectedIds: string[];
  }) => void;
}

export function ProjectTreeView({
  iniSelectedIds,
  allowEdit = true,
  onCancel,
  onConfirm,
}: ProjectTreeViewProps) {
  const openDialog = useDialogStore((state) => state.openDialog);
  const [treeData, setTreeData] = useState<ProjectTreeNode[]>([]);
  const [changeLogs, setChangeLogs] = useState<ApplyChangeParams[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(iniSelectedIds);
  const [currentProjects, setCurrentProjects] = useState<ProjectItem[]>([]);

  // 拖曳相關狀態
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<
    "inside" | "before" | "after" | null
  >(null);

  const [activeMenuNodeId, setActiveMenuNodeId] = useState<string | null>(null);
  const originalProjects = useRef<ProjectItem[]>([]);

  const projects = useAppStore((state) => state.projects);
  const setProjects = useAppStore((state) => state.setProjects);

  // 當外部的 iniSelectedIds 改變時，內部的 selectedIds 也會同步更新
  useEffect(() => {
    setSelectedIds(iniSelectedIds);
  }, [iniSelectedIds]);

  useEffect(() => {
    const getNodeMap = async () => {
      const projects = await db.projects.toArray();
      originalProjects.current = projects;
      setCurrentProjects(projects);
      const updatedSelectedIds = _.union(
        iniSelectedIds,
        iniSelectedIds.flatMap((id) => getAllSubProjectIds(projects, id)),
      );
      setSelectedIds(updatedSelectedIds);
    };
    getNodeMap();
  }, []);

  /**
   * 確保選中的項目包含所有子項目，避免不符合樹狀結構的邏輯
   */
  useEffect(() => {
    // 先簡化
    const simplifyIds = simplifySelectedIds(
      selectedIds,
      buildProjectTree(currentProjects, new Set(selectedIds ?? [])),
    );
    // 後補回
    const fullIdSet = new Set(selectedIds);
    simplifyIds.forEach((id) =>
      getAllSubProjectIds(currentProjects, id).forEach((subId) =>
        fullIdSet.add(subId),
      ),
    );

    const tree = buildProjectTree(currentProjects, fullIdSet);
    setTreeData(tree);
    setSelectedIds((prev) =>
      _.isEqual(prev, Array.from(fullIdSet)) ? prev : Array.from(fullIdSet),
    );
  }, [currentProjects, selectedIds]);

  //#region Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggedNodeId(nodeId);
    e.dataTransfer.setData("text/plain", nodeId);
  };

  const handleDragOver = (e: React.DragEvent, targetNodeId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedNodeId === targetNodeId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const height = rect.height;

    if (offsetY < height * 0.2) {
      setDropPosition("before");
    } else if (offsetY > height * 0.8) {
      setDropPosition("after");
    } else {
      setDropPosition("inside");
    }

    setDragOverNodeId(targetNodeId);
  };

  const handleDrop = async (
    e: React.DragEvent,
    targetNode: ProjectTreeNode,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedNodeId || draggedNodeId === targetNode.id) {
      resetDragState();
      return;
    }
    if (
      getAllSubProjectIds(currentProjects, draggedNodeId).includes(
        targetNode.id,
      )
    ) {
      // Prevent dropping a node into one of its own sub-projects
      resetDragState();
      return;
    }

    let newParentId: string | null = null;
    if (dropPosition === "inside") {
      newParentId = targetNode.id;
    } else {
      const targetProject = treeData.find((p) => p.id === targetNode.id);
      newParentId = targetProject?.parentId ?? null;
    }

    setCurrentProjects((prev) =>
      prev.map((project) =>
        project.id === draggedNodeId
          ? { ...project, parentId: newParentId }
          : project,
      ),
    );
    setChangeLogs((prev) => [
      ...prev,
      {
        table: "projects",
        recordId: draggedNodeId,
        op: "update",
        patch: { parentId: newParentId },
        clientId: CLIENT_ID,
      },
    ]);

    resetDragState();

    // 更新 selectedIds，以反映拖放操作後的樹狀結構
    const newCurrentProjects = currentProjects.map((project) =>
      project.id === draggedNodeId
        ? { ...project, parentId: newParentId }
        : project,
    );
    const newDataTree = buildProjectTree(
      newCurrentProjects,
      new Set(selectedIds),
    );
    const draggedNode = findNodeById(draggedNodeId, newDataTree);
    setSelectedIds((prev) => {
      return draggedNode?.checked
        ? getNewSelectedIdsWhenANewNodeIsSelected(
            prev,
            draggedNode.id,
            newCurrentProjects,
            newDataTree,
          )
        : getNewSelectedIdsWhenANodeIsDeselected(
            prev,
            draggedNode?.id!,
            newCurrentProjects,
            newDataTree,
          );
    });
  };

  const resetDragState = () => {
    setDraggedNodeId(null);
    setDragOverNodeId(null);
    setDropPosition(null);
  };
  //#endregion

  function addAProject(
    parentId: string | null,
    name: string = "New Project",
    color: string = "#3b82f6",
    sortOrder: number = 0,
  ) {
    const newProject = {
      id: crypto.randomUUID(),
      name,
      parentId,
      sortOrder,
      color,
      updatedAt: Date.now(),
    };
    setCurrentProjects((prev) => [...prev, newProject]);
    setChangeLogs((prev) => [
      ...prev,
      {
        table: "projects",
        recordId: newProject.id,
        op: "add",
        patch: newProject,
        clientId: CLIENT_ID,
      },
    ]);
  }

  function updateAProject(id: string, patch: Partial<Omit<ProjectItem, "id">>) {
    setChangeLogs((prev) => [
      ...prev,
      {
        table: "projects",
        recordId: id,
        op: "update",
        patch,
        clientId: CLIENT_ID,
      },
    ]);
    setCurrentProjects((prev) =>
      prev.map((project) =>
        project.id === id ? { ...project, ...patch } : project,
      ),
    );
  }

  function deleteAProject(id: string) {
    const subProjectIds = getAllSubProjectIds(currentProjects, id);
    setChangeLogs((prev) => [
      ...prev,
      ...subProjectIds.map((subId) => ({
        table: "projects",
        recordId: subId,
        op: "delete" as const,
        patch: {},
        clientId: CLIENT_ID,
      })),
      {
        table: "projects",
        recordId: id,
        op: "delete",
        patch: {},
        clientId: CLIENT_ID,
      },
    ]);
    setCurrentProjects((prev) =>
      prev.filter((p) => p.id !== id && !subProjectIds.includes(p.id)),
    );
  }

  function findNodeById(
    nodeId: string,
    treeData: ProjectTreeNode[],
  ): ProjectTreeNode | undefined {
    function search(nodes: ProjectTreeNode[]): ProjectTreeNode | undefined {
      for (const node of nodes) {
        if (node.id === nodeId) return node;
        const found = search(node.children ?? []);
        if (found) return found;
      }
      return undefined;
    }
    return search(treeData);
  }

  /**
   * 1. 先找到 nodeId 對應的Data節點，將他 check
   * 2. 找到他的parent，如果 parent 存在，且 parent.children 全部被選中，則將 parent 也選中，不然就停止
   * 3. 重複上述步驟，直到最頂層的父節點
   * 4. 這些新的選中節點ID，外加nodeId本身與他的所有子節點ID，將組成最終的更新後的選中節點ID列表
   * @param currentSelectedIds 當前已選中的節點ID列表
   * @param nodeId 新選中的節點ID
   * @returns 更新後的選中節點ID列表
   */
  function getNewSelectedIdsWhenANewNodeIsSelected(
    currentSelectedIds: string[],
    nodeId: string,
    currentProjects: ProjectItem[],
    treeData: ProjectTreeNode[],
  ): string[] {
    const newSelectedIds = new Set(currentSelectedIds);
    // 先將當前節點加入選中集合
    newSelectedIds.add(nodeId);
    // 將所有子節點加入選中集合
    for (const subId of getAllSubProjectIds(currentProjects, nodeId)) {
      newSelectedIds.add(subId);
    }
    // 將所有父節點加入選中集合（如果其所有子節點都已被選中）
    for (const parentId of getAllParentProjectIds(currentProjects, nodeId)) {
      const parentNode = findNodeById(parentId, treeData);
      if (
        parentNode &&
        parentNode.children?.every((child) => newSelectedIds.has(child.id))
      ) {
        newSelectedIds.add(parentId);
      } else {
        break;
      }
    }
    return Array.from(newSelectedIds);
  }

  function getNewSelectedIdsWhenANodeIsDeselected(
    currentSelectedIds: string[],
    nodeId: string,
    currentProjects: ProjectItem[],
    treeData: ProjectTreeNode[],
  ): string[] {
    const newSelectedIds = new Set(currentSelectedIds);
    // 先將當前節點移出選中集合
    newSelectedIds.delete(nodeId);
    // 將所有子節點移出選中集合
    for (const subId of getAllSubProjectIds(currentProjects, nodeId)) {
      newSelectedIds.delete(subId);
    }
    // 將所有父節點移出選中集合（如果其有任何子節點未被選中）
    for (const parentId of getAllParentProjectIds(currentProjects, nodeId)) {
      const parentNode = findNodeById(parentId, treeData);
      if (
        parentNode &&
        parentNode.children?.some((child) => !newSelectedIds.has(child.id))
      ) {
        newSelectedIds.delete(parentId);
      } else {
        break;
      }
    }
    return Array.from(newSelectedIds);
  }

  function renderTree(node: ProjectTreeNode) {
    const children = node.children ?? [];
    const isDragTarget = dragOverNodeId === node.id;
    const isSelected = selectedIds.includes(node.id);
    const isMenuOpen = activeMenuNodeId === node.id;

    return (
      <div key={node.id} className="relative flex flex-col space-y-1">
        {/* 節點主卡片 */}
        <div
          draggable={allowEdit}
          onDragStart={(e) => handleDragStart(e, node.id)}
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDrop={(e) => handleDrop(e, node)}
          style={{ paddingLeft: `${/*node.level * 18 +*/ 8}px` }}
          className={`group relative flex items-center justify-between rounded-lg border py-2 pr-3 transition-all ${
            // 💡 關鍵突破：當此選單開啟時，提升整張卡片的層級，避免被下方卡片覆蓋
            activeMenuNodeId === node.id ? "z-20 shadow-md" : "z-0"
          } ${
            isDragTarget
              ? dropPosition === "inside"
                ? "border-blue-500 bg-blue-50/80 ring-2 ring-blue-300"
                : "border-blue-400 bg-gray-50"
              : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/80"
          }`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={isSelected}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIds((prev) =>
                  prev.includes(node.id)
                    ? getNewSelectedIdsWhenANodeIsDeselected(
                        prev,
                        node.id,
                        currentProjects,
                        treeData,
                      )
                    : getNewSelectedIdsWhenANewNodeIsSelected(
                        prev,
                        node.id,
                        currentProjects,
                        treeData,
                      ),
                );
              }}
              onChange={() => {}}
              className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />

            {/* 色彩標籤指示器 */}
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: node.color || "#3b82f6" }}
            />

            {/* 專案名稱 */}
            <span className="truncate text-sm font-medium text-gray-800">
              {node.name}
            </span>
          </div>

          {/* 右側操作按鈕 / 選單 */}
          {allowEdit && (
            <div className="relative flex items-center gap-1 opacity-90 transition-opacity group-hover:opacity-100">
              {/* 1. 桌面端 (md 以上) */}
              <div className="hidden md:flex items-center gap-1">
                <button
                  type="button"
                  title="新增子專案"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddProject(node.id);
                  }}
                  className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-blue-600"
                >
                  <PlusIcon />
                </button>

                <button
                  type="button"
                  title="編輯專案"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditAProject(node);
                  }}
                  className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                >
                  <EditIcon />
                </button>

                <button
                  type="button"
                  title="刪除專案"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteAProject(node.id);
                  }}
                  className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
                >
                  <DeleteIcon />
                </button>
              </div>

              {/* 2. 行動端 (md 以下) */}
              <div className="md:hidden">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuNodeId(
                      activeMenuNodeId === node.id ? null : node.id,
                    );
                  }}
                  className="p-1 rounded text-gray-400 hover:bg-gray-100"
                >
                  <VerticalLargeDotsIcon />
                </button>

                {/* 點擊 ⋯ 彈出的輕量 Popover Menu */}
                {activeMenuNodeId === node.id && (
                  <div className="absolute right-0 top-8 z-30 w-28 rounded-lg bg-white p-1 shadow-lg ring-1 ring-black/10">
                    <button
                      type="button"
                      title="新增子專案"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddProject(node.id);
                        setActiveMenuNodeId(null);
                      }}
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                    >
                      <PlusIcon /> 新增子專案
                    </button>

                    <button
                      type="button"
                      title="編輯專案"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditAProject(node);
                        setActiveMenuNodeId(null);
                      }}
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                    >
                      <EditIcon /> 編輯專案
                    </button>

                    <button
                      type="button"
                      title="刪除專案"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAProject(node.id);
                        setActiveMenuNodeId(null);
                      }}
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-gray-700 hover:bg-red-100"
                    >
                      <DeleteIcon /> 刪除專案
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 子節點區域 */}
        {children.length > 0 && (
          <div className="relative pl-3 space-y-1">
            {/* 縮進導引細線 */}
            <div className="absolute left-4 top-0 bottom-2 w-px bg-gray-200" />
            {children.map((child) => renderTree(child))}
          </div>
        )}
      </div>
    );
  }

  async function handleAddProject(
    parentId: string | null = null,
  ): Promise<void> {
    const { actionId, formData } = await openDialog({
      title: "新增專案",
      message: "請輸入專案相關設定",
      inputs: [
        { name: "name", label: "專案名稱", type: "text" },
        {
          name: "color",
          label: "標籤顏色",
          type: "color",
          defaultValue: "#3b82f6",
        },
      ],
      selects: [
        {
          name: "parentId",
          label: "父級專案",
          defaultValue: parentId ?? "null",
          options: [
            { value: "null", label: "(無 / 根目錄)" },
            ...currentProjects.map((project) => ({
              value: project.id,
              label: project.name,
            })),
          ],
        },
      ],
      actions: [
        { id: "cancel", label: "取消" },
        { id: "confirm", label: "確認新增" },
      ],
    });

    if (actionId === "confirm" && formData) {
      addAProject(
        formData.parentId === "null" || !formData.parentId
          ? null
          : formData.parentId,
        formData.name || "新專案",
        formData.color || "#3b82f6",
        0,
      );
    }
  }

  async function handleEditAProject(node: ProjectTreeNode) {
    const allSubProjectIds = getAllSubProjectIds(currentProjects, node.id);
    const { actionId, formData } = await openDialog({
      title: "編輯專案",
      message: "修改專案屬性",
      inputs: [
        {
          name: "name",
          label: "專案名稱",
          type: "text",
          defaultValue: node.name,
        },
        {
          name: "color",
          label: "標籤顏色",
          type: "color",
          defaultValue: node.color || "#3b82f6",
        },
      ],
      selects: [
        {
          name: "parentId",
          label: "父級專案",
          defaultValue: node.parentId ?? "null",
          options: [
            { value: "null", label: "(無 / 根目錄)" },
            ...currentProjects
              .filter(
                (p) => p.id !== node.id && !allSubProjectIds.includes(p.id),
              )
              .map((p) => ({ value: p.id, label: p.name })),
          ],
        },
      ],
      actions: [
        { id: "cancel", label: "取消" },
        { id: "confirm", label: "更新" },
      ],
    });

    if (actionId === "confirm" && formData) {
      updateAProject(node.id, {
        name: formData.name,
        parentId:
          formData.parentId === "null" || !formData.parentId
            ? null
            : formData.parentId,
        color: formData.color || "#3b82f6",
        updatedAt: Date.now(),
      });
    }
  }

  async function handleConfirm(): Promise<void> {
    const groupedChangeLogs = _.groupBy(changeLogs, "recordId");
    const consolidatedChangeLogs = Object.values(groupedChangeLogs)
      .map((group) => {
        if (group[0].op === "add") {
          if (group[group.length - 1].op === "delete") return null;
          const consolidatedAdd = group.reduce((acc, log, index) => {
            if (index === 0) return { ...acc, ...log };
            if (log.op === "update") return { ...acc, ...log.patch };
            return acc;
          }, {} as ApplyChangeParams);
          consolidatedAdd.op = "add";
          return consolidatedAdd;
        } else if (group[0].op === "update") {
          if (group[group.length - 1].op === "delete")
            return group[group.length - 1];
          const consolidatedUpdate = group.reduce((acc, log, index) => {
            if (index === 0) return { ...acc, ...log };
            if (log.op === "update") return { ...acc, ...log.patch };
            return acc;
          }, {} as ApplyChangeParams);
          consolidatedUpdate.op = "update";
          return consolidatedUpdate;
        }
        return group[group.length - 1];
      })
      .filter((log): log is ApplyChangeParams => !!log);

    // 同步包含 db.projects 和 db.change_log
    await db.transaction("rw", [db.projects, db.change_log], async () => {
      for (const change of consolidatedChangeLogs) {
        await applyChange(change);
      }
      const prjs = await db.projects.toArray();
      if (!_.isEqual(projects, prjs)) {
        setProjects(prjs);
      }
    });

    onConfirm({
      items: currentProjects,
      selectedIds: simplifySelectedIds(selectedIds, treeData),
    });
  }

  /**
   * 除了只取最上層勾選的 ID 代表整顆子樹外，順便確保ids 有出現在所有節點中，因為有可能存有不存在的 ID
   * @param ids 選中的專案 ID 列表
   * @param nodes 專案樹的節點列表
   * @returns 簡化後的選中專案 ID 列表
   */
  const simplifySelectedIds = (
    ids: string[],
    nodes: ProjectTreeNode[],
  ): string[] => {
    const idSet = new Set(ids);
    // 收集所有節點的 ID
    const allNodeIds = new Set<string>();
    const collectNodeIds = (node: ProjectTreeNode) => {
      allNodeIds.add(node.id);
      if (node.children) {
        node.children.forEach(collectNodeIds);
      }
    };
    nodes.forEach(collectNodeIds);
    // 移除不存在於所有節點中的 ID
    for (const id of Array.from(idSet)) {
      if (!allNodeIds.has(id)) {
        idSet.delete(id);
      }
    }
    // 遍歷樹狀結構，確保只保留最上層勾選的 ID
    const traverse = (node: ProjectTreeNode): boolean => {
      if (!node.children || node.children.length === 0)
        return idSet.has(node.id);
      const allChildrenSelected = _.every(
        node.children.map((child) => traverse(child)),
      );
      if (allChildrenSelected) {
        node.children.forEach((child) => idSet.delete(child.id));
        idSet.add(node.id);
        return true;
      }
      return idSet.has(node.id);
    };
    nodes.forEach(traverse);
    return Array.from(idSet);
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-800">
      {/* 標頭 */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">專案架構管理</h2>
          <p className="text-xs text-gray-500">選擇關聯專案或進行階層管理</p>
        </div>
        {allowEdit && (
          <button
            type="button"
            onClick={() => handleAddProject()}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700"
          >
            <PlusIcon />
            新增頂層專案
          </button>
        )}
      </div>

      {/* 樹狀結構主要區域 */}
      <div className="flex-1 overflow-x-auto overflow-y-auto px-4 py-4 space-y-1 min-h-62 max-h-[50vh]">
        {treeData.length > 0 ? (
          <>{treeData.map((node) => renderTree(node))}</>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <FolderIcon className="h-10 w-10 mb-2 stroke-1" />
            <p className="text-sm">尚未建立任何專案</p>
          </div>
        )}
      </div>

      {/* 底欄動作列 */}
      <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/50 px-6 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700"
        >
          儲存變更
        </button>
      </div>
    </div>
  );
}
