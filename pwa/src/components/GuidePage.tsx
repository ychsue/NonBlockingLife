import { useMemo, useState } from 'react'
import {
  getNblTimerInstallUrl,
  isValidICloudShortcutUrl,
  setNblTimerInstallUrl,
} from '../utils/shortcutUtils'

const SHORTCUTS = [
  {
    name: 'QueryOptions',
    url: 'https://www.icloud.com/shortcuts/ce9e7a05926244d2aca8eec11860a000',
    purpose: '由NBL取得候選任務清單',
  },
  {
    name: 'NBL_Timer',
    url: 'https://www.icloud.com/shortcuts/d6cf2c879d0f42f78d531ac540bb2d0a',
    purpose: 'iPhone 裡面接收來自NBL提出的顯示模式與計時器切換的要求。',
  },
  {
    name: 'NBL Interrupt',
    url: 'https://www.icloud.com/shortcuts/dc4620410baf4df6aec49dec77ebad5b',
    purpose: '遇到打岔時一鍵切換中斷流程',
  },
  {
    name: 'NBL Inbox',
    url: 'https://www.icloud.com/shortcuts/2ab3e7572f3048838ba079c0626f76b0',
    purpose: '快速把想法丟進 NBL Inbox',
  },
  {
    name: 'NBL Scheduled',
    url: 'https://www.icloud.com/shortcuts/d45e5661b79946ac98274caa14852e7a',
    purpose: '快速把想法丟進 NBL Scheduled',
  },
  {
    name: 'Apple Clock (時鐘)',
    url: 'https://apps.apple.com/tw/app/clock/id1584215688',
    purpose: 'iPhone 該內建的時鐘 App，提供計時器功能，配合 NBL_Timer Shortcut 切換工作/休息模式時會啟動對應的計時器。iPhone 有可能沒有預設安裝。',
  }
]

export function GuidePage() {
  const [timerUrlInput, setTimerUrlInput] = useState(getNblTimerInstallUrl())
  const [saved, setSaved] = useState(false)

  const canInstallNblTimer = useMemo(
    () => isValidICloudShortcutUrl(timerUrlInput),
    [timerUrlInput]
  )

  const handleSaveNblTimerUrl = () => {
    setNblTimerInstallUrl(timerUrlInput)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <section className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-xl font-bold text-gray-800 mb-2">📘 說明頁</h2>
        <p className="text-gray-700 leading-relaxed">
          Non-Blocking Life 的目的是把任務管理做成「不打斷主線」的日常系統，讓你在 iPhone
          與 PWA 之間可以快速開始、結束、打岔與回到任務。
          <br />
          v2.0 已升級為「PWA 本地優先 + GAS 雲端同步」架構，平常在本機快速操作，需要時再同步到 Google Sheets。
          這是
          <a
            href="https://ychsue.github.io/superconductorlike_society/"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            我之前寫的「超導體般社會」
          </a>
          裡面個人時間管理系統的實驗性版本。
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">🚀 怎麼用（最短流程）</h3>
        <ol className="list-decimal pl-5 space-y-2 text-gray-700">
          <li>先開啟本 PWA，確認可看到 Inbox / Task Pool / Scheduled 等頁籤。</li>
          <li>第一次使用請先設定同步 URL：點右上角「⚙️」貼上 GAS Web App URL。</li>
          <li>按一次「💾 同步」確認可成功 push / pull。</li>
          <li>在 iPhone 安裝下方 Shortcuts，並將除了 <b>NBL_Timer</b> 以外的 Shortcuts 加入 iPhone 下拉式控制項目。</li>
          <li>日常用法：用 <b>QueryOptions</b> 直接挑下一個建議任務執行，或者結束當前任務。</li>
          <li>若有任務想納入管理，請在 PWA 新增。特定時間執行請加到 <b>NBL Scheduled</b>，其他請加到 <b>Task Pool</b> 或 <b>Micro Task</b>。</li>
          <li>遇到突發狀況需要中斷時，請使用 <b>NBL Interrupt</b>。</li>
          <li>若有好想法，請使用 <b>NBL Inbox</b> 快速記錄。我是把它設為 iPhone 的 <b>輔助使用➡️觸控➡️背面輕點</b>，可快速紀錄。</li>
          <li>若有行事曆要記錄，請使用 <b>NBL Scheduled</b>，會先寫入 iPhone 行事曆，再同步到 NBL Scheduled。</li>
          <li>開始與結束任務都會在 <b>Log</b> 頁籤紀錄，完整 Log 會推送到 Google Sheets 供 AI/Excel 分析。</li>
        </ol>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">🔄 同步說明（v2.0）</h3>
        <ul className="space-y-2 text-gray-700 list-disc pl-5">
          <li>
            <b>資料主體在 PWA：</b>
            本機 Dexie/IndexedDB 為主資料庫，操作速度快且可離線。
          </li>
          <li>
            <b>GAS + Google Sheets 是雲端資料層：</b>
            用於跨設備同步與備份。
          </li>
          <li>
            <b>雙向同步表：</b>
            Task Pool / Scheduled / Micro Tasks / Inbox。
          </li>
          <li>
            <b>Log 表目前採單向推送：</b>
            PWA 會推送 Log 到 Google Sheets，但不自動拉回，避免重複與大量傳輸。
          </li>
          <li>
            <b>☁️ 還原功能：</b>
            可清空本地後從 Google Sheets 重新拉取。預設保留 Log，也可切換連 Log 一起清除。
          </li>
        </ul>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">📱 iOS Shortcuts 安裝</h3>
        <div className="space-y-3">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.name}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-gray-100 rounded-md p-3"
            >
              <div>
                <p className="font-medium text-gray-800">{shortcut.name}</p>
                <p className="text-sm text-gray-600">{shortcut.purpose}</p>
              </div>
              <a
                href={shortcut.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                安裝 Shortcut
              </a>
            </div>
          ))}
        </div>

      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">🧩 iPhone 整合進度</h3>
        <ul className="space-y-2 text-gray-700">
          <li>✅ Start 後切單色 + 30 分鐘計時（由 NBL_Timer 處理）</li>
          <li>✅ End 後恢復色彩 + 10 分鐘計時（由 NBL_Timer 處理）</li>
          <li>✅ Inbox 新增（iPhone 已完成）</li>
          <li>✅ Interrupt 啟動 start interrupt（iPhone 已完成）</li>
          <li>✅ Scheduled add：開啟行事曆後再寫入 Scheduled</li>
          <li>
            <i>
              🚧 Log 深度分析與身心健康整合尚未實作，現階段建議先使用 Google Sheets + AI 工具分析。
            </i>
          </li>
        </ul>
      </div>
    </section>
  )
}