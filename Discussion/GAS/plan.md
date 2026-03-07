# NonBlockingLife 同步功能實現計劃

**最後更新**: 2026-03-06  
**版本**: 1.0  
**狀態**: 🟡 Phase 1 進行中 - GAS 已完成，準備進入 PWA 實作

---

## 🚀 當前進度

**第 1 步：GAS 端實現** ✅ 已完成

- 用戶已完成 Google Apps Script 部署與第一階段驗證
- 完整代碼與部署說明位於 [9th_discussion.md](./9th_discussion.md)

**第 2 步：PWA 端實現** 🟡 進行中

- 🟢 Part A：`syncUtils.ts` - SyncManager 核心類完成
- 🟢 Part B：增強 `SyncStatus.tsx` - UI 與同步邏輯完成
- ⚪ Part C：GAS URL 配置流程（已在 SyncStatus.tsx 中實現）
- ⚪ Part D：端到端測試與驗證
- ⚪ Part E：調整與優化

---

## 🎯 核心目標

實現 PWA 跨設備同步功能，使用用戶自己的 Google Sheets 作為數據中心，確保：

- ✅ 用戶完全掌控數據（存在自己的 Google Drive）
- ✅ 零成本（不消耗開發者配額）
- ✅ 支持離線操作
- ✅ 簡單易用的設置流程

---

## 📐 架構設計

### 整體架構

```js
設備 A (手機)          設備 B (電腦)          設備 C (平板)
     ↓                      ↓                      ↓
  PWA + IndexedDB      PWA + IndexedDB      PWA + IndexedDB
     ↓                      ↓                      ↓
      ←────────────────────┼────────────────────→
                           ↓
                    User's GAS (Web App)
                           ↓
                  User's Google Sheets
                 (中央數據源 + 備份)
```

### 關鍵設計決策

| 決策 | 方案 | 理由 |
|------|------|------|
| **GAS 部署方式** | 每個用戶自己部署 | 避免開發者配額問題，用戶掌控數據 |
| **安裝流程** | 手動 → 半自動 | MVP 先手動，後續優化為自動複製模板 |
| **衝突解決** | Last-Write-Wins | 簡單可靠，MVP 階段足夠 |
| **同步觸發** | 手動 + 定期輪詢 | MVP 先手動，Phase 2 加入自動 |
| **Sheets 結構** | 單表混合 | 簡化設計，後續可拆分 |

---

## 📋 Phase 1: MVP（基礎同步）

**目標**: 實現手動同步，用戶可以上傳/下載數據

### 1.1 GAS 端實現

#### 文件結構

```js
gas/src/
├── SyncAPI.js          # 主要 API（doGet, doPost）
├── SheetsService.js    # Google Sheets 操作封裝
├── Utils.js            # 工具函數
└── tests.js            # 單元測試（可選）
```

#### SyncAPI.js 核心功能

```javascript
/**
 * 處理 GET 請求：拉取更新
 * 參數：
 *   - action: 'sync-status' | 'pull'
 *   - lastSync: timestamp（上次同步時間）
 */
function doGet(e) {
  const action = e.parameter.action;
  const lastSync = parseInt(e.parameter.lastSync) || 0;
  
  switch (action) {
    case 'ping':
      return createResponse({ status: 'ok', timestamp: now() });
    
    case 'sync-status':
      return getSyncStatus();
    
    case 'pull':
      return pullChanges(lastSync);
    
    default:
      return createResponse({ error: 'Unknown action' }, 400);
  }
}

/**
 * 處理 POST 請求：推送更新
 * Body: {
 *   operations: [
 *     { type: 'create', entityType: 'task', data: {...} },
 *     { type: 'update', entityType: 'task', id: '...', data: {...} }
 *   ]
 * }
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const operations = payload.operations || [];
    
    const results = operations.map(op => processOperation(op));
    
    return createResponse({
      status: 'success',
      results: results,
      timestamp: now()
    });
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return createResponse({ error: error.toString() }, 500);
  }
}
```

#### 數據結構（Google Sheets）

**表名**: `Tasks`

| 列 | 類型 | 說明 |
|----|------|------|
| taskId | string | UUID |
| title | string | 任務標題 |
| status | string | todo/doing/done |
| priority | number | 優先級 |
| timestamp | number | 最後修改時間（毫秒） |
| deviceId | string | 來源設備 |
| operationId | string | 操作 ID（去重用） |
| deleted | boolean | 軟刪除標記 |

**後續可能增加的表**:

- `Inbox` - 收集箱
- `Log` - 操作日誌
- `SyncMetadata` - 同步元數據

### 1.2 PWA 端實現

#### 新增文件

```js
pwa/src/
├── utils/
│   ├── syncUtils.ts          # 同步核心邏輯
│   └── gasSetup.ts           # GAS 設置嚮導
├── components/
│   ├── SyncStatus.tsx        # 同步狀態顯示
│   ├── SetupWizard.tsx       # 首次設置嚮導
│   └── SyncButton.tsx        # 同步按鈕
└── db/
    └── syncQueue.ts          # 離線隊列（Phase 2）
```

#### IndexedDB Schema 擴展

```typescript
// pwa/src/db/schema.ts

// 新增表：syncQueue
export interface SyncQueueItem {
  id: string;                    // 自增 ID
  operationId: string;           // UUID（去重）
  type: 'create' | 'update' | 'delete';
  entityType: 'task' | 'inbox' | 'log';
  entityId: string;
  data: any;
  timestamp: number;
  deviceId: string;
  status: 'pending' | 'syncing' | 'failed' | 'success';
  retryCount: number;
  lastAttempt?: number;
  error?: string;
}

// 擴展現有表：tasks
export interface Task {
  id: string;
  title: string;
  status: string;
  priority: number;
  // 新增同步相關欄位
  timestamp: number;             // 最後修改時間
  deviceId: string;              // 來源設備
  synced: boolean;               // 是否已同步到 GS
  syncedAt?: number;             // 同步時間
}
```

#### 核心同步邏輯

```typescript
// pwa/src/utils/syncUtils.ts

export class SyncManager {
  private gasUrl: string;
  private deviceId: string;
  
  constructor() {
    this.gasUrl = localStorage.getItem('gasWebAppUrl') || '';
    this.deviceId = getOrCreateDeviceId();
  }
  
  /**
   * 上傳本地變更到 Google Sheets
   */
  async push(): Promise<SyncResult> {
    // 1. 取得所有未同步項目
    const items = await this.getUnsyncedItems();
    
    // 2. 組裝操作
    const operations = items.map(item => ({
      type: item.type,
      entityType: item.entityType,
      entityId: item.id,
      data: item.data,
      timestamp: item.timestamp,
      deviceId: this.deviceId,
      operationId: generateUUID()
    }));
    
    // 3. 發送到 GAS
    const response = await fetch(this.gasUrl, {
      method: 'POST',
      body: JSON.stringify({ operations })
    });
    
    const result = await response.json();
    
    // 4. 標記已同步
    await this.markAsSynced(items);
    
    return result;
  }
  
  /**
   * 從 Google Sheets 拉取更新
   */
  async pull(): Promise<SyncResult> {
    const lastSync = localStorage.getItem('lastSyncTimestamp') || '0';
    
    const response = await fetch(
      `${this.gasUrl}?action=pull&lastSync=${lastSync}`
    );
    
    const result = await response.json();
    
    // 合併到本地
    await this.mergeChanges(result.changes);
    
    // 更新最後同步時間
    localStorage.setItem('lastSyncTimestamp', result.timestamp);
    
    return result;
  }
  
  /**
   * 雙向同步
   */
  async sync(): Promise<SyncResult> {
    // 1. 先推送
    const pushResult = await this.push();
    
    // 2. 再拉取
    const pullResult = await this.pull();
    
    return {
      pushed: pushResult.results.length,
      pulled: pullResult.changes.length,
      conflicts: []  // Phase 1 暫不處理
    };
  }
}
```

#### UI 組件

```typescript
// pwa/src/components/SyncButton.tsx

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  
  const handleSync = async () => {
    setSyncing(true);
    try {
      const manager = new SyncManager();
      const result = await manager.sync();
      setResult(result);
      toast.success(`✅ 同步完成: ↑${result.pushed} ↓${result.pulled}`);
    } catch (error) {
      toast.error('❌ 同步失敗: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };
  
  return (
    <button onClick={handleSync} disabled={syncing}>
      {syncing ? '🔄 同步中...' : '💾 同步'}
    </button>
  );
}
```

### 1.3 首次設置流程

#### 方案選擇

**MVP 階段**: 手動複製（方案 1）

#### SetupWizard 實現

```typescript
// pwa/src/components/SetupWizard.tsx

const GAS_CODE = `
// NonBlockingLife Sync API
// 運行在您的 Google 帳戶下，只有您可以訪問

function doGet(e) {
  // ... [完整代碼] ...
}

function doPost(e) {
  // ... [完整代碼] ...
}
`;

export function SetupWizard() {
  const [step, setStep] = useState(1);
  const [gasUrl, setGasUrl] = useState('');
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      {step === 1 && (
        <div>
          <h1>🚀 首次同步設置</h1>
          <p>4 步完成設置，您的數據將存儲在您自己的 Google Drive</p>
          
          <div className="card">
            <h2>步驟 1: 建立 Google Sheet</h2>
            <ol>
              <li>打開 <a href="https://sheets.google.com" target="_blank">Google Sheets</a></li>
              <li>建立新試算表，命名為 <strong>NonBlockingLife Data</strong></li>
              <li>可選：放入您自己的資料夾（例如 NBL）</li>
            </ol>
          </div>

          <div className="card mt-4">
            <h2>步驟 2: 從 Sheet 開啟 Apps Script（綁定模式）</h2>
            <ol>
              <li>在剛建立的 Sheet 中點選「擴充功能」→「Apps Script」</li>
              <li>這會建立 bound script，可直接使用 <code>getActiveSpreadsheet()</code></li>
              <li>不需要手動填 SPREADSHEET_ID</li>
            </ol>
          </div>

          <div className="card mt-4">
            <h2>步驟 3: 貼上同步程式碼</h2>
            <button onClick={() => {
              navigator.clipboard.writeText(GAS_CODE);
              toast.success('✅ 已複製到剪貼板');
            }}>
              📋 複製 Apps Script 代碼
            </button>
            <ol>
              <li>貼上剛才複製的代碼</li>
              <li>儲存（Ctrl+S）</li>
            </ol>
          </div>
          
          <div className="card mt-4">
            <h2>步驟 4: 部署</h2>
            <ol>
              <li>點擊「部署」→「新部署」</li>
              <li>選擇「Web 應用程式」</li>
              <li>執行身份：<strong>「我」</strong></li>
              <li>誰可以訪問：<strong>「任何人」</strong></li>
              <li>點擊「部署」</li>
              <li>複製「Web 應用程式 URL」（結尾通常是 <code>/userweb</code>）</li>
            </ol>
            <button onClick={() => setStep(2)}>
              下一步：輸入 URL →
            </button>
          </div>
        </div>
      )}
      
      {step === 2 && (
        <div>
          <h2>🔗 輸入 Web App URL</h2>
          <input
            type="text"
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../userweb"
            className="w-full p-2 border rounded"
          />
          <button onClick={() => testAndSave(gasUrl)}>
            ✅ 測試連接並保存
          </button>
        </div>
      )}
      
      {step === 3 && (
        <div>
          <h2>✅ 設置完成！</h2>
          <p>您現在可以開始使用同步功能</p>
          <button onClick={() => router.push('/tasks')}>
            開始使用 →
          </button>
        </div>
      )}
    </div>
  );
}
```

### 1.4 測試計劃

#### 單元測試

```typescript
// pwa/src/utils/__tests__/syncUtils.test.ts

describe('SyncManager', () => {
  test('should generate unique device ID', () => {
    const id1 = getOrCreateDeviceId();
    const id2 = getOrCreateDeviceId();
    expect(id1).toBe(id2); // 同一設備
  });
  
  test('should push changes to GAS', async () => {
    const manager = new SyncManager();
    const result = await manager.push();
    expect(result.status).toBe('success');
  });
  
  test('should pull changes from GAS', async () => {
    const manager = new SyncManager();
    const result = await manager.pull();
    expect(result.changes).toBeDefined();
  });
});
```

#### 多用戶驗證

| 測試用例 | 操作 | 預期結果 |
|---------|------|---------|
| 1. 隔離性 | User A 上傳任務1，User B 上傳任務2 | A 只看到任務1，B 只看到任務2 |
| 2. 同步 | User A 在設備1新增任務，設備2 同步 | 設備2 顯示新任務 |
| 3. 離線 | 離線時修改，上線後同步 | 變更成功上傳 |
| 4. 衝突 | 兩設備同時修改同一任務 | 保留最新時間戳的版本 |

---

## 📋 Phase 2: 離線支持

**目標**: 實現離線隊列和自動同步

### 功能清單

- [ ] IndexedDB `syncQueue` 表
- [ ] Service Worker Background Sync
- [ ] 失敗重試機制（指數退避）
- [ ] 批量同步
- [ ] UI 狀態指示器（在線/離線/同步中）

---

## 📋 Phase 3: 衝突解決

**目標**: 處理複雜的同步衝突

### 功能清單2

- [ ] Last-Write-Wins 策略
- [ ] 衝突檢測邏輯
- [ ] 用戶手動選擇（本地/遠端/合併）
- [ ] 變更日誌（audit log）
- [ ] 回滾功能

---

## 📋 Phase 4: 優化體驗（可選）

### 4.1 自動複製模板（方案 2）

- [ ] Google Cloud 專案設置
- [ ] OAuth 2.0 客戶端申請
- [ ] Drive API 整合
- [ ] 自動複製流程實現

### 4.2 進階功能

- [ ] 實時同步（WebSocket / Server-Sent Events）
- [ ] 版本歷史
- [ ] 多人協作（如有需求）

---

## 🗓 時間規劃

| 階段 | 預估時間 | 開始日期 | 狀態 |
|------|---------|---------|------|
| Phase 1: MVP | 4-5 天 | 2026-03-06 | 🟡 進行中（GAS 已完成，PWA 即將開始） |
| Phase 2: 離線 | 3-4 天 | TBD | ⚪ 待定 |
| Phase 3: 衝突 | 2-3 天 | TBD | ⚪ 待定 |
| Phase 4: 優化 | 根據需求 | TBD | ⚪ 待定 |

---

## ✅ MVP 完成標準

- [x] ✅ GAS 可成功接收和響應請求（已完成）
- [ ] PWA 可上傳數據到 Google Sheets
- [ ] PWA 可從 Google Sheets 拉取數據
- [ ] 多用戶測試通過（至少 3 個帳戶）
- [ ] 設置流程用戶可在 5 分鐘內完成
- [ ] 基本錯誤處理完善

---

## 📝 待決定的問題

| 問題 | 選項 | 決定 | 備註 |
|------|------|------|------|
| Google Sheets 是否分表？ | A: 單表混合<br/>B: 多表分離 | A | MVP 先單表，後續優化 |
| 輪詢間隔？ | 5分鐘/10分鐘/用戶自訂 | 10分鐘 | 避免配額問題 |
| 軟刪除 vs 硬刪除？ | 軟刪除 | ✅ 軟刪除 | 便於同步 |
| 是否需要變更日誌？ | Phase 3 再決定 | - | MVP 暫不需要 |

---

## 🔧 開發環境設置

### Google Apps Script

```bash
# 安裝 clasp（可選）
npm install -g @google/clasp

# 登入
clasp login

# 克隆專案（如果已存在）
clasp clone YOUR_SCRIPT_ID
```

### PWA 端

```bash
# 安裝依賴
cd pwa
npm install

# 開發
npm run dev

# 測試
npm run test
```

---

## 📚 相關文件

- [Google Apps Script 文檔](https://developers.google.com/apps-script)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Service Worker Sync](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

---

## 🐛 已知問題 & 限制

| 問題 | 影響 | 解決方案 |
|------|------|---------|
| GAS 執行時間限制（30秒） | 大批量同步可能超時 | 分批處理，每次最多 100 條 |
| Google API 配額 | 頻繁同步可能超限 | 限制輪詢頻率，使用批量操作 |
| 瀏覽器 CORS 限制 | GAS Web App 可能被阻擋 | GAS 自動處理 CORS |
| IndexedDB 存儲限制 | 不同瀏覽器限制不同 | 監控使用量，提示用戶清理 |

---

**此計劃為動態文件，隨開發進度調整**
