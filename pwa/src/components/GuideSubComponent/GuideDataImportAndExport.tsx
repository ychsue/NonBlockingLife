import { useAppStore } from "../../store/appStore";

export function GuideDataImportAndExport() {
  const locale = useAppStore((state) => state.locale);
  return locale === "zh-TW" ? (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        📦 資料匯出與匯入
      </h3>
      <p className="text-gray-700 text-sm mb-4">
        NBL 支援把本地資料匯出成 JSON 或 Markdown table
        備份，也可從備份檔案匯入資料。這對跨設備遷移、備份、AI 分析或 Excel
        檢視都很有幫助。
      </p>

      <div className="space-y-4">
        {/* 匯出說明 */}
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
          <h4 className="font-semibold text-blue-900 text-sm mb-2">
            📤 匯出備份
          </h4>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-blue-800">
            <li>
              點擊同步狀態列右方的 <strong>📤 按鈕</strong>
            </li>
            <li>
              可選擇輸出 JSON 或 Markdown table，會下載{" "}
              <code className="bg-white px-1 rounded">
                nbl-backup-YYYY-MM-DD.json
              </code>{" "}
              或{" "}
              <code className="bg-white px-1 rounded">
                nbl-backup-YYYY-MM-DD.md
              </code>
            </li>
            <li>
              兩種格式都包含 6 張表：Task Pool / Scheduled / Micro Tasks / Inbox
              / Resource / Log
            </li>
          </ol>
          <p className="text-xs text-blue-700 mt-2">
            💡 提示：JSON 適合程式處理與 Power Query；Markdown table
            可直接閱讀，且用{" "}
            <code className="bg-white px-1 rounded">## 📊 table_name</code>{" "}
            分段，適合 AI 與人工檢查
          </p>
        </div>

        {/* 匯入說明 */}
        <div className="rounded-md bg-green-50 border border-green-200 p-3">
          <h4 className="font-semibold text-green-900 text-sm mb-2">
            📥 匯入資料
          </h4>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-green-800">
            <li>
              點擊同步狀態列右方的 <strong>📥 按鈕</strong>
            </li>
            <li>選擇要匯入的 JSON 或 Markdown table 備份檔案</li>
            <li>確認 modal 提醒有無未同步的變更</li>
            <li>確認後開始匯入，相同 ID 的記錄會被覆蓋，其他本地資料保留</li>
            <li>結果 modal 會顯示各表匯入筆數與任何跳過的記錄</li>
          </ol>
          <p className="text-xs text-green-700 mt-2">
            ⚠️ 提醒：匯入會用 upsert（更新或插入）模式，相同 ID
            會被覆蓋，但不會刪除其他記錄
          </p>
        </div>

        {/* Excel 整合說明 */}
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
          <h4 className="font-semibold text-amber-900 text-sm mb-2">
            📊 在 Excel 檢視資料
          </h4>
          <p className="text-sm text-amber-800 mb-2">
            可先匯出 JSON 或 Markdown table；思考中：
          </p>
          {/* <ol className="list-decimal pl-5 space-y-1 text-sm text-amber-800">
              <li><strong>Power Query 方式</strong>（適合進階使用者）：
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  <li>Excel → <strong>資料</strong> → <strong>取得資料</strong> → <strong>自檔案</strong> → <strong>自 JSON</strong></li>
                  <li>選擇匯出的 JSON 檔案，Power Query 會自動解析 6 張表</li>
                  <li>但需手動為每張表設定查詢，首次建議使用提供的範例 Excel 檔</li>
                </ul>
              </li>
              <li><strong>Google Sheets 方式</strong>（推薦，最簡單）：
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  <li>用文字編輯器打開 JSON，複製其中一個表的陣列（如 <code className="bg-white px-0.5 rounded text-xs">"task_pool": [...]</code>）</li>
                  <li>開啟 <a href="https://sheets.google.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Google Sheets</a> → 新增試算表</li>
                  <li>在儲存格 A1 貼上陣列 JSON，Google Sheets 自動解析成表格</li>
                  <li>為其他表重複步驟（task_pool / scheduled / micro_tasks / inbox / resource / log）</li>
                  <li>可在 Google Sheets 中編輯後，再複製欄位值回成 JSON 格式以匯入 PWA</li>
                </ul>
              </li>
              <li><strong>Excel 複製貼上方式</strong>（替代方案）：
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  <li>複製 JSON 中一個表的陣列部分</li>
                  <li>貼到 Excel，選擇「從 JSON 轉換」或直接作為文字</li>
                  <li>手動調整格式（功能有限，不太推薦）</li>
                </ul>
              </li>
            </ol> */}
        </div>

        {/* 常見情境 */}
        <div className="rounded-md bg-purple-50 border border-purple-200 p-3">
          <h4 className="font-semibold text-purple-900 text-sm mb-2">
            🎯 常見使用情境
          </h4>
          <ul className="space-y-1 text-sm text-purple-800 list-disc pl-5">
            {/* <li><strong>在 Excel 中修改後匯入</strong>：export JSON → 在 Excel 中編輯 → 存回 JSON → 用 📥 匯入</li> */}
            <li>
              <strong>跨裝置遷移</strong>：新裝置先 export 空備份確認格式 →
              從舊裝置 export → 在新裝置 import
            </li>
            <li>
              <strong>AI 分析</strong>：export Markdown table → 貼給
              Gemini/Copilot/Claude 做分析或摘要（保留{" "}
              <code className="bg-white px-1 rounded">## 📊 table_name</code>{" "}
              區塊）
            </li>
            <li>
              <strong>完整備份</strong>：定期 export JSON 與 Markdown table
              各一份，兼顧系統還原與人工可讀
            </li>
          </ul>
        </div>
      </div>
    </div>
  ) : locale === "ja" ? (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        📦 データのエクスポートとインポート
      </h3>
      <p className="text-gray-700 text-sm mb-4">
        NBL はローカルデータを JSON または Markdown table にエクスポートして
        バックアップすることをサポートしており、バックアップファイルからデータをインポートすることもできます。これは、デバイス間の移行、バックアップ、AI
        分析、または Excel での閲覧に非常に役立ちます。
      </p>

      <div className="space-y-4">
        {/* 匯出說明 */}
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
          <h4 className="font-semibold text-blue-900 text-sm mb-2">
            📤 バックアップをエクスポート
          </h4>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-blue-800">
            <li>
              同期ステータスバーの右側にある <strong>📤 ボタン</strong>{" "}
              をクリック
            </li>
            <li>
              JSONテーブルかMarkdownテーブルを出力するか選べます。これらは{" "}
              をダウンロードします
              <code className="bg-white px-1 rounded">
                nbl-backup-YYYY-MM-DD.json
              </code>{" "}
              あるいは{" "}
              <code className="bg-white px-1 rounded">
                nbl-backup-YYYY-MM-DD.md
              </code>{" "}
            </li>
            <li>
              どちらの形式にも6枚の表が含まれています：Task Pool / Scheduled /
              Micro Tasks / Inbox / Resource / Log
            </li>
          </ol>
          <p className="text-xs text-blue-700 mt-2">
            💡 ヒント：JSON はプログラム処理や Power Query
            に適しており、Markdown table は直接読むことができ、{" "}
            <code className="bg-white px-1 rounded">## 📊 table_name</code>{" "}
            で区切られているため、AI や手動での確認に適しています。
          </p>
        </div>

        {/* 匯入說明 */}
        <div className="rounded-md bg-green-50 border border-green-200 p-3">
          <h4 className="font-semibold text-green-900 text-sm mb-2">
            📥 データをインポート
          </h4>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-green-800">
            <li>
              同期ステータスバーの右側にある <strong>📥 ボタン</strong>
            </li>
            <li>
              インポートする JSON または Markdown table
              のバックアップファイルを選択
            </li>
            <li>モーダルで未同期の変更があるか確認</li>
            <li>
              確認後にインポートを開始。同じ ID
              のレコードは上書きされ、他のローカルデータは保持されます
            </li>
            <li>
              結果のモーダルで各表のインポート件数とスキップされたレコードを表示
            </li>
          </ol>
          <p className="text-xs text-green-700 mt-2">
            ⚠️ 注意：インポートは upsert（更新または挿入）モードで行われ、同じ
            ID のレコードは上書きされますが、他のレコードは削除されません
          </p>
        </div>

        {/* Excel での表示方法 */}
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
          <h4 className="font-semibold text-amber-900 text-sm mb-2">
            📊 Excel でデータを表示
          </h4>
          <p className="text-sm text-amber-800 mb-2">
            まず JSON または Markdown table をエクスポートできます。考え中：
          </p>
        </div>

        {/* よくある使用シーン */}
        <div className="rounded-md bg-purple-50 border border-purple-200 p-3">
          <h4 className="font-semibold text-purple-900 text-sm mb-2">
            🎯 よくある使用シーン
          </h4>
          <ul className="space-y-1 text-sm text-purple-800 list-disc pl-5">
            {/* <li><strong>Excel で編集後にインポート</strong>：JSON をエクスポート → Excel で編集 → JSON に保存 → 📥 でインポート</li> */}
            <li>
              <strong>デバイス間の移行</strong>
              ：新しいデバイスで空のバックアップをエクスポートして形式を確認 →
              古いデバイスからエクスポート → 新しいデバイスでインポート
            </li>
            <li>
              <strong>AI 分析</strong>：Markdown table をエクスポート →
              Gemini/Copilot/Claude に貼り付けて分析や要約（{" "}
              <code className="bg-white px-1 rounded">## 📊 table_name</code>{" "}
              ブロックを保持）
            </li>
            <li>
              <strong>完全バックアップ</strong>：定期的に JSON と Markdown table
              を各 1
              つずつエクスポートし、システムの復元と人間による可読性の両方を確保
            </li>
          </ul>
        </div>
      </div>
    </div>
  ) : (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        📦 Data Import and Export
      </h3>
      <p className="text-gray-700 text-sm mb-4">
        NBL supports exporting local data as JSON or Markdown table backups, and importing data from backup files. This is useful for cross-device migration, backups, AI analysis, or Excel viewing.
      </p>

      <div className="space-y-4">
        {/* 匯出說明 */}
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
          <h4 className="font-semibold text-blue-900 text-sm mb-2">
            📤 Export Backup
          </h4>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-blue-800">
            <li>
              Click the <strong>📤 button</strong> on the right side of the sync status bar
            </li>
            <li>
              You can choose to export as JSON or Markdown table, and it will download{" "}
              <code className="bg-white px-1 rounded">
                nbl-backup-YYYY-MM-DD.json
              </code>{" "}
              or{" "}
              <code className="bg-white px-1 rounded">
                nbl-backup-YYYY-MM-DD.md
              </code>
            </li>
            <li>
              Both formats contain 6 tables: Task Pool / Scheduled / Micro Tasks / Inbox
              / Resource / Log
            </li>
          </ol>
          <p className="text-xs text-blue-700 mt-2">
            💡 Hint: JSON is suitable for programmatic processing and Power Query; Markdown table
            is directly readable, and using{" "}
            <code className="bg-white px-1 rounded">## 📊 table_name</code>{" "}
            sections makes it suitable for AI and human inspection
          </p>
        </div>

        {/* 匯入說明 */}
        <div className="rounded-md bg-green-50 border border-green-200 p-3">
          <h4 className="font-semibold text-green-900 text-sm mb-2">
            📥 Import Data
          </h4>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-green-800">
            <li>
              Click the <strong>📥 button</strong> on the right side of the sync status bar
            </li>
            <li>Select the JSON or Markdown table backup file to import</li>
            <li>Check the modal for any unsynced changes</li>
            <li>After confirmation, the import will start. Records with the same ID will be overwritten, while other local data will be retained</li>
            <li>The result modal will show the number of imported records for each table and any skipped records</li>
          </ol>
          <p className="text-xs text-green-700 mt-2">
            ⚠️ Note: Import uses the upsert (update or insert) mode. Records with the same ID will be overwritten, but other records will not be deleted
          </p>
        </div>

        {/* Excel 整合說明 */}
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
          <h4 className="font-semibold text-amber-900 text-sm mb-2">
            📊 View Data in Excel
          </h4>
          <p className="text-sm text-amber-800 mb-2">
            You can first export JSON or Markdown table; under consideration:
          </p>
        </div>

        {/* 常見情境 */}
        <div className="rounded-md bg-purple-50 border border-purple-200 p-3">
          <h4 className="font-semibold text-purple-900 text-sm mb-2">
            🎯 Common Use Cases
          </h4>
          <ul className="space-y-1 text-sm text-purple-800 list-disc pl-5">
            {/* <li><strong>在 Excel 中修改後匯入</strong>：export JSON → 在 Excel 中編輯 → 存回 JSON → 用 📥 匯入</li> */}
            <li>
              <strong>Cross-device Migration</strong>: On the new device, first export an empty backup to confirm the format →
              Export from the old device → Import on the new device
            </li>
            <li>
              <strong>AI Analysis</strong>: export Markdown table → paste to
              Gemini/Copilot/Claude for analysis or summary (retain the{" "}
              <code className="bg-white px-1 rounded">## 📊 table_name</code>{" "}
              sections)
            </li>
            <li>
              <strong>Full Backup</strong>: regularly export JSON and Markdown table
              each, ensuring both system restoration and human readability
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
