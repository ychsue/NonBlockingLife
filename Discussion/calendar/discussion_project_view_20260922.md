# 將Scheduled輸出成 ics

## [2026-09-22] ychsue 現在要生成 ics 文件，就要考慮到隱私，所以，引進 project 的分類。

## [2026-09-22] Gemini 的回答

這是一個非常前瞻且極具實用性的架構規劃！

將分類/專案（`project` / `tag`）引入系統，不僅能解決 **「私密/過濾匯出 ics (隱私隔離)」** 的問題，還能一次提升全系統（`task_pool`, `scheduled`, `inbox` 等）的搜尋、分類與管理維度。

以下為您針對 **資料庫模型設計**、**樹狀/子專案遞迴刪除機制**、**UI 互動體驗** 以及 **ICS 範圍過濾** 進行深度分析與具體實作建議：

---

### 一、 專案資料表 (Schema) 與 階層式/樹狀結構設計

您提出的 `id, name, parent_project_id, updatedAt` 非常符合標準的 **Adjacency List (鄰接表)** 模型，非常適合用在前端輕量資料庫 (Dexie/IndexedDB) 中。

#### 1. Schema 建議與 Dexie 定義

在 `pwa/src/db/schema.ts` 中：

```typescript
export interface ProjectItem {
  id: string; // 主鍵 e.g. 'proj_health_01' 或 UUID
  name: string; // 專案/分類名稱 e.g. '運動健康'
  parentId?: string | null; // 父專案 ID (根目錄則為 null 或 undefined)
  color?: string; // 可選：用於 UI 標籤顏色/圖示
  sortOrder?: number; // 可選：同階層排序
  updatedAt: number; // 異動時間戳 (利於同步)
}
```

**Dexie Stores 註冊：**

```typescript
projects: "id, parentId, name, updatedAt";
```

---

### 二、 關於刪除子專案 (Cascade Delete / Recursion) 的處理

當刪除一個父專案時，常見處理策略有三種：

1. **連同刪除 (Cascade Delete)**：遞迴尋找所有 `parentId === targetId` 的子專案與孫專案並一併刪除。
2. **移至根目錄 / 斷開父子關係 (Orphan Release)**：將子專案的 `parentId` 設為 `null`（升格為頂層專案）。
3. **提示與阻擋 (Block)**：若尚有子專案或任務使用該 project，不允許刪除，要求先清空。

#### 建議的做法：預設為「遞迴連同刪除（或彈窗讓使用者選擇）」

**遞迴取得所有子專案 ID 的 Helper 函數：**

```typescript
/**
 * 遞迴尋找指定 parentId 下的所有子孫專案 ID
 */
export async function getAllSubProjectIds(parentId: string): Promise<string[]> {
  const allProjects = await db.projects.toArray();
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

/**
 * 刪除專案及其所有子專案，並處理受影響任務
 */
export async function deleteProjectCascade(targetProjectId: string) {
  const subIds = await getAllSubProjectIds(targetProjectId);
  const allIdsToDelete = [targetProjectId, ...subIds];

  await db.transaction(
    "rw",
    [db.projects, db.scheduled, db.task_pool],
    async () => {
      // 1. 刪除專案本身與所有子孫專案
      await db.projects.bulkDelete(allIdsToDelete);

      // 2. 清理或重置關聯任務中的 project 欄位 (例如將匹配到的清除)
      // 註：若 project 欄位改為陣列 (projects: string[])，則剔除這些 id
    },
  );
}
```

---

### 三、 ScheduledItem 與 EditDialog 欄位設計 (多選 vs 單選)

#### 1. ScheduledItem 欄位型態

由於一個任務可能屬於多個維度（例如：既是 `運動` 又是 `個人生活`），將欄位設計為 **陣列 (Array of project IDs)** 會比單一字串更有彈性：

```typescript
export interface ScheduledItem {
  // ... 原有欄位
  projectIds?: string[]; // 存放 Project ID 陣列 (e.g. ['proj_exercise', 'proj_personal'])
}
```

#### 2. EditDialog 下拉選單 UI 體驗

在 `EditDialog` 裡面：

- **多選 Select / Combobox**：支援顯示已選取的 Project Tags（含顏色/小圖示）。
- **快速新增 (Create on the fly)**：輸入搜尋時，若找不到吻合的專案，選單底部出現 `+ 新增 "xxx"` 按鈕。
- **父專案掛載選單**：點擊新增時，跳出微型 Dialog 或Popover，可順便選擇「父專案 (Parent Project)」。

---

### 四、 UI 呈現：實驗室 / 設定頁中的「樹狀拖拉管理 UI」

將專案樹狀結構管理放在 `Experiments`（實驗室功能）或獨立的 `Project Management Dialog` 非常合適：

1. **樹状圖/資料夾視圖 (Tree View / Folder View)**：

- 支援縮排、展開/收合（Expand/Collapse）。
- **拖拉排序/移階 (Drag & Drop)**：拖曳某專案節點放到另一個專案上時，自動更新其 `parentId`；拖放到頂層則設為 `null`。

2. **直觀增刪**：

- 懸停/點擊出現 `+ 新增子專案`、`✏️ 改名`、`🗑️ 刪除` 按鈕。

---

### 五、 生成有限範圍的 ICS (Scoped ICS Export)

這完全打中了匯出 ics 的核心痛點！在生成 ics 的設定視窗中，讓使用者勾選過濾條件：

```
[ 生成 ICS 檔案 / 訂閱連結 ]
├─ 匯出範圍 (Scope)：
│   ( ) 全部事件
│   (•) 指定專案 (Projects)
│        ☑ 工作 (含所有子專案)
│        ☐ 個人健康 (定時體操, 健身...)
│        ☑ 開源專案 (NBL)
│
└─ 是否包含已完成/隱藏事件：[ ]

```

**ICS 生成邏輯（包含子專案繼承）：**
當使用者選擇了專案 $P$ 時，系統會自動包含 $P$ 以及 $P$ 的所有子專案 $P_{sub1}, P_{sub2}...$ 下的任務，完美過濾掉「定時體操」等私密或不相干的 Scheduled 項目！

---

### 總結建議與開發步驟

1. **階段一 (Schema & 基礎 API)**：

- 在 Dexie 升級版本並新增 `projects` table。
- 在 `ScheduledItem` 擴充 `projectIds?: string[]` 欄位。
- 實作樹狀結構解析工具函數（如 `getProjectTree()`, `getAllSubProjectIds()`）。

2. **階段二 (EditDialog 整合)**：

- 在 `EditDialog.tsx` 加入 Project 多選 Tag 元件與即時新建功能。

3. **階段三 (管理介面)**：

- 在 Experiments / 設定中加入 `ProjectTreeManager` 樹狀拖拉與增刪介面。

4. **階段四 (ICS 匯出過濾)**：

- 在生成 `.ics` 檔案的邏輯中，加入 Project Filter 選擇器，實現精準分享！

---

## [2026-09-22] ychsue 我在想，projectTreeView 的 data，設計成

```typescript
export interface ProjectTreeNode {
  id: string;
  name: string;
  color?: string;
  sortOrder?: number;
  updatedAt: number;
  checked?: boolean; // 是否被選中
  children?: ProjectTreeNode[];
}
```

然後再將 `ProjectItem` 的資料轉換成這個樹狀結構，方便在 UI 中呈現與操作。
您覺得呢？

## [2026-09-22] Gemini 根據上述問題的回答

這個 `ProjectTreeNode` 的資料結構設計非常優雅且符合 React/Vue 等前端框架的現代 Component 思考邏輯！

把扁平的 `ProjectItem[]`（資料庫層）轉換成樹狀的 `ProjectTreeNode[]`（UI ViewModel 層），是將 **「資料庫正規化 (Normalization)」** 與 **「UI 渲染邏輯 (UI State)」** 乾淨解耦（Decoupling）的最佳實踐。

以下為您分析這個設計的亮點，以及具體的轉化 logic 與效能/狀態同步建議：

---

### 一、 架構設計亮點

1. **職責分離 (Separation of Concerns)**：

- **`ProjectItem` (Database Level)**：只有 `id`, `name`, `parentId`, `updatedAt` 等核心資料，輕量且極易同步至 Supabase 或做 IndexedDB 檢索。

- **`ProjectTreeNode` (UI Component Level)**：加入了 `checked`（勾選狀態）、`children`（子節點陣列）、甚至未來可擴充的 `isExpanded`（折疊狀態），專門給 TreeView / Checkbox 元件做狀態繪製。

2. **樹狀遞迴渲染極其方便**：
   在 UI 元件（例如 React/Vue 的 `ProjectTreeView.tsx`）中，可以直接使用標準的 **遞迴元件 (Recursive Component)** 來做展折與階層縮排呈現。

---

### 二、 如何優雅地將 `ProjectItem[]` 轉換為 `ProjectTreeNode[]`

這裡分享一個高效能、只要 **一次性 $O(N)$ 時間複雜度** 的 Tree 建構演算法（利用 Hash Map/Dictionary 關聯，避免多次 `filter`）：

```typescript
import type { ProjectItem } from "../db/schema";

export interface ProjectTreeNode {
  id: string;
  name: string;
  color?: string;
  sortOrder?: number;
  updatedAt: number;
  checked?: boolean; // 是否被選中
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
      children: [],
    });
  });

  // 2. 建立父子關聯 (Tree Structure)
  items.forEach((item) => {
    const currentNode = nodeMap.get(item.id)!;
    if (item.parentId && nodeMap.has(item.parentId)) {
      // 屬於某個父專案，加入父專案的 children 中
      const parentNode = nodeMap.get(item.parentId)!;
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
```

---

### 三、 UI Checkbox 的「父子連動 (Cascade Select)」體驗建議

在 TreeView 中使用 Checkbox 時，常見且體驗極佳的兩種行為模式：

#### 模式 A：向下連動，自動勾選所有子孫 (Cascade Down)

- **行為**：當使用者勾選「工作」父專案時，其底下所有子專案（例如：「專案 A」、「專案 B」）自動變成 `checked: true`。
- **邏輯**：UI 的 `onCheckChange(nodeId, isChecked)` 觸發時，遞迴更新 `checkedSet`。

```typescript
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
```

#### 模式 B：獨立勾選 (Independent Select)

- **行為**：勾選父專案僅代表勾選該父專案本身的直接任務，子專案需手動勾選（或配合前述的 `getExpandedProjectIds` 演算法在篩選時自動繼承）。

> **建議**：採用 **模式 A (向下連動)** 最符合傳統檔案總管/分類過濾的心理模型！

---

### 總結

您的 `ProjectTreeNode` 設計非常棒，可以直接採用！

- **資料庫 (`IndexedDB` / `Supabase`)** 保留扁平的 `ProjectItem`（`id`, `name`, `parentId`）。

- **元件繪製 (`ProjectTreeView`)** 時，透過 `buildProjectTree()` 即時轉成 `ProjectTreeNode` 進行呈現與 Checkbox 勾選操作。這樣既保證了資料同步的效能，又給予了 UI 極大的靈活性。

---

## [2026-09-22] ychsue 感覺這個ProjectTreeView 根本就可以直接做成CRUD外加check，

所以， input 就變成顯示固定長度的 names，點下去，就打開 ProjectTreeView，可搬來搬去，新增、刪除、改名等等，最後按完成，透過onEvent 回傳給父元件做進一步的UI顯示。
搬移的話，感覺上好像要有個state，存目前拖曳誰，等拖曳到定點放手就訂在那個新的state，這樣嗎？
您覺得這樣的作法好嗎？

## [2026-09-22] Gemini 考慮這CRUD + check + DnD 的整合

這個構想**非常棒，完全符合現代 Web/PWA App 的模組化與 UX 設計標準**！

將 `ProjectTreeView` 包裝成一個兼具 **「展示/選取」** 與 **「即時 CRUD/拖拉排序」** 的獨立 Selector/Manager 元件，可以大幅簡化外部（如 `EditDialog`、`ScheduledTable` 或 ics 匯出設定）呼叫它的複雜度。

以下為您分析這個設計的亮點、拖拉狀態管理的實作細節，以及推薦的 Component 介面規範：

---

### 一、 UI / UX 互動流程設計

1. **觸發與顯示 (Input Trim Display)**：

- 在 `EditDialog` 或表單中，呈現一個類似 Tag 輸入框的按鈕/Input。
- **固定長度顯示**：只顯示前 1~2 個專案名稱，超過則顯示 `+N`（例如：`[ 運動 ] [ 工作 ] +2`）。

2. **展開 Popover / Modal**：

- 點擊輸入框，彈出 `ProjectTreeViewPopover` 或 Dialog。

3. **樹狀編輯與勾選 (CRUD + Check + DnD)**：

- **選取 (Check)**：節點左側有 Checkbox，供使用者勾選。
- **直觀操作 (CRUD)**：滑鼠 hover 或觸控點擊節點右側出現 `+` (新增子項目)、`✏️` (改名)、`🗑️` (刪除)。
- **拖拉排序/階層變更 (Drag & Drop)**：長按或拖曳節點可更換順序或改變 `parentId`。

4. **確認套用 (Save/Confirm)**：

- 下方提供「完成 (Done)」按鈕，一次將勾選結果 (`selectedIds`) 以及在 TreeView 內發生的 CRUD 變更寫入資料庫/透過 `onEvent` 告知父元件。

---

### 二、 拖拉 (Drag & Drop) 狀態管理與邏輯實作

您提到的觀念完全正確！要實現 HTML5 / Touch 的樹狀拖拉，需要維護「正在拖曳的節點 (`draggedNodeId`)」**與**「目標懸放節點 (`dragOverNodeId`)」的 State。

#### 1. State 設計

```typescript
const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
const [dropPosition, setDropPosition] = useState<
  "inside" | "before" | "after" | null
>(null);
```

#### 2. 拖拉事件處理邏輯 (HTML5 Drag & Drop API)

```typescript
// 1. 開始拖曳
const handleDragStart = (e: React.DragEvent, nodeId: string) => {
  e.stopPropagation();
  setDraggedNodeId(nodeId);
  e.dataTransfer.setData("text/plain", nodeId);
};

// 2. 拖曳經過目標節點 (計算法: 是要當作「子節點(inside)」，還是「同階層上下(before/after)」)
const handleDragOver = (e: React.DragEvent, targetNodeId: string) => {
  e.preventDefault();
  e.stopPropagation();

  if (draggedNodeId === targetNodeId) return; // 不能拖到自己身上

  const rect = e.currentTarget.getBoundingClientRect();
  const offsetY = e.clientY - rect.top;
  const height = rect.height;

  // 判斷鼠標在目標節點的上 25%、中間 50%、下 25%
  if (offsetY < height * 0.25) {
    setDropPosition("before");
  } else if (offsetY > height * 0.75) {
    setDropPosition("after");
  } else {
    setDropPosition("inside"); // 放進裡面，變成子專案
  }

  setDragOverNodeId(targetNodeId);
};

// 3. 放開拖曳 (Drop) - 觸發 parentId 或 sortOrder 的更新
const handleDrop = async (e: React.DragEvent, targetNode: ProjectTreeNode) => {
  e.preventDefault();
  e.stopPropagation();

  if (!draggedNodeId || draggedNodeId === targetNode.id) {
    resetDragState();
    return;
  }

  let newParentId: string | null = null;

  if (dropPosition === "inside") {
    // 變成 targetNode 的子專案
    newParentId = targetNode.id;
  } else {
    // 與 targetNode 平級 (使用 targetNode 的 parentId)
    // 可進一步根據 before/after 調整 sortOrder
    const targetProject = allProjects.find((p) => p.id === targetNode.id);
    newParentId = targetProject?.parentId ?? null;
  }

  // 更新 DB 中的 parentId
  await db.projects.update(draggedNodeId, {
    parentId: newParentId,
    updatedAt: Date.now(),
  });

  resetDragState();
};

const resetDragState = () => {
  setDraggedNodeId(null);
  setDragOverNodeId(null);
  setDropPosition(null);
};
```

---

### 三、 元件 Props API 介面建議

封裝後的 `ProjectTreeSelector`（包含可自訂外觀的 Input 觸發鈕與 Popover/Modal）建議介面如下：

```typescript
export interface ProjectTreeSelectorProps {
  /** 目前選中的 Project IDs (支援多選) */
  selectedIds: string[];

  /** 當選取變更時觸發 (回傳目前勾選的所有 Project IDs) */
  onChange: (selectedIds: string[]) => void;

  /** 是否允許 CRUD (新增/刪除/改名/拖拉)，預設為 true */
  allowEdit?: boolean;

  /** 顯示用的佔位字串 */
  placeholder?: string;

  /** 最大外顯 Tag 數量，超出顯示 +N */
  maxDisplayTags?: number;
}
```

#### 在 `EditDialog`

中的呼叫範例：

```tsx
<EditDialog
  isOpen={!!editingItem}
  title={text.editTitle}
  item={editingItem}
  fields={[
    { name: "title", label: t("table.scheduled.field.title"), type: "text" },
    // 🆕 專案選擇/管理元件 (整合為單一欄位)
    {
      name: "projectIds",
      label: "專案分類",
      type: "custom",
      render: (value, onChange) => (
        <ProjectTreeSelector
          selectedIds={value || []}
          onChange={(newIds) => onChange(newIds)}
          maxDisplayTags={2}
        />
      ),
    },
    // ... 其餘欄位
  ]}
  onSave={handleEditSave}
  onClose={handleCloseEditDialog}
/>
```

---

### 四、 總結評估

| 評估維度       | 評語與優勢                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| **UX 體驗**    | **極佳**。使用者可以在編輯任務時「順手」新增或調整專案結構，不需要特地切換到設定頁面。                    |
| **程式碼維護** | **乾淨解耦**。將 CRUD、拖拉 DnD、TreeView 遞迴渲染與勾選狀態完全收攏在 `ProjectTreeSelector` 一個元件內。 |
| **擴充性**     | **高**。不只 `EditDialog`，未來的「搜尋過濾器」、「ICS 匯出過濾器」都可以直接複用這個元件！               |

這個做法方向完全正確，也非常符合現代 React 元件封裝的精神，值得直接動工實作！
