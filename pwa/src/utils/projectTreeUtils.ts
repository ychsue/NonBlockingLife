import { db, type ProjectItem } from "../db/schema";

export interface ProjectTreeNode extends ProjectItem {
  updatedAt: number;
  checked?: boolean; // 是否被選中
  level: number; // 樹狀層級，根節點為 0
  children?: ProjectTreeNode[];
}

/**
 * 將扁平的 ProjectItem[] 轉換成 ProjectTreeNode[] 樹狀結構
 * @param items 資料庫中的所有 ProjectItems
 * @param checkedSet 當前被勾選的 Project ID 集合 (Set<string>)
 */
export function buildProjectTree(
  items: ProjectItem[],
  checkedSet: Set<string> = new Set(),
): ProjectTreeNode[] {
  const nodeMap = new Map<string, ProjectTreeNode>();
  const rootNodes: ProjectTreeNode[] = [];

  // 1. 先建立所有節點的 Map，並補上 UI state (如 checked)
  items.forEach((item) => {
    nodeMap.set(item.id, {
      ...item,
      checked: checkedSet.has(item.id),
      level: 0,
      children: [],
    });
  });

  // 2. 建立父子關聯 (Tree Structure)
  items.forEach((item) => {
    const currentNode = nodeMap.get(item.id)!;
    if (item.parentId && nodeMap.has(item.parentId)) {
      // 屬於某個父專案，加入父專案的 children 中
      const parentNode = nodeMap.get(item.parentId)!;
      currentNode.level = parentNode.level + 1;
      parentNode.children!.push(currentNode);
    } else {
      // 沒有 parentId 或找不到 parent，視為根節點
      rootNodes.push(currentNode);
    }
  });

  // 3. 可選：根據 sortOrder 或 name 進行排序
  const sortNodes = (nodes: ProjectTreeNode[]) => {
    nodes.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        sortNodes(node.children);
      }
    });
  };

  sortNodes(rootNodes);
  return rootNodes;
}

/**
 * 切換指定節點的勾選狀態，並遞迴影響其所有子節點
 * @param targetId 目標節點 ID
 * @param isChecked 是否勾選
 * @param nodeMap 節點 Map (id -> ProjectTreeNode)
 * @param currentCheckedSet 當前已勾選的節點 ID 集合
 * @returns 更新後的已勾選節點 ID 集合
 */
export function toggleNodeCheck(
  targetId: string,
  isChecked: boolean,
  nodeMap: Map<string, ProjectTreeNode>,
  currentCheckedSet: Set<string>,
): Set<string> {
  const nextCheckedSet = new Set(currentCheckedSet);

  function toggleRecursive(id: string) {
    if (isChecked) {
      nextCheckedSet.add(id);
    } else {
      nextCheckedSet.delete(id);
    }
    const node = nodeMap.get(id);
    if (node && node.children) {
      node.children.forEach((child) => toggleRecursive(child.id));
    }
  }

  toggleRecursive(targetId);
  return nextCheckedSet;
}

/**
 * 遞迴尋找指定 parentId 下的所有子孫專案 ID
 */
export function getAllSubProjectIds(allProjects: ProjectItem[], parentId: string): string[] {
  const result: string[] = [];

  function collect(pid: string) {
    const children = allProjects.filter((p) => p.parentId === pid);
    for (const child of children) {
      result.push(child.id);
      collect(child.id); // 遞迴搜尋下一層
    }
  }

  collect(parentId);
  return result;
}

export function getAllParentProjectIds(allProjects: ProjectItem[], childId: string): string[] {
  const result: string[] = [];

  function collect(cid: string) {
    const child = allProjects.find((p) => p.id === cid);
    if (child && child.parentId) {
      result.push(child.parentId);
      collect(child.parentId); // 遞迴搜尋上一層
    }
  }

  collect(childId);
  return result;
}
