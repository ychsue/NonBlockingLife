import { useMemo, useState } from 'react'
import {
  getNblTimerInstallUrl,
  isValidICloudShortcutUrl,
  setNblTimerInstallUrl,
} from '../utils/shortcutUtils'

const SHORTCUTS = [
  {
    name: 'QueryOptions',
    url: 'https://www.icloud.com/shortcuts/f05b8313418a419590881039c0034b70',
    purpose: '由NBL取得候選任務清單',
  },
  {
    name: 'NBL_Timer',
    url: 'https://www.icloud.com/shortcuts/ef7902c94d3a4a8298695502a7c5fdf5',
    purpose: 'iPhone 裡面接收來自NBL提出的顯示模式與計時器切換的要求。',
  },
  {
    name: 'NBL Interrupt',
    url: 'https://www.icloud.com/shortcuts/b53586e2d0d148b79bb571c2cf172c5f',
    purpose: '遇到打岔時一鍵切換中斷流程',
  },
  {
    name: 'NBL Inbox',
    url: 'https://www.icloud.com/shortcuts/c9737680739048d3b994336b7dffef9d',
    purpose: '快速把想法丟進 NBL Inbox',
  },
  {
    name: 'NBL Scheduled',
    url: 'https://www.icloud.com/shortcuts/5ebbb7afb98b44fc9515e824ec0a6a11',
    purpose: '快速把想法丟進 NBL Scheduled',
  },
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
          這是<a href="https://ychsue.github.io/superconductorlike_society/" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">我之前寫的「超導體般社會」</a>裡面個人「時間管理系統」的實驗性版本，目前功能還在開發中，先放上來給有興趣的人參考。
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">🚀 怎麼用（最短流程）</h3>
        <ol className="list-decimal pl-5 space-y-2 text-gray-700">
          <li>先開啟本 PWA，確認可看到 Inbox / Task Pool / Scheduled 等頁籤。</li>
          <li>在 iPhone 安裝下方 Shortcuts，然後將除了 <b>NBL_Timer</b> 以外的 Shortcuts 加入 iPhone 的下拉式控制項目裡面。</li>
          <li>日常用法：用 <b>QueryOptions</b> 直接挑下一個建議任務執行，或者結束當前任務。</li>
          <li>而當您有任務想要加入做時間管理時，請到本PWA網頁。若是有要在特定時間(群)執行，請Add到<b>NBL Scheduled</b>裡面，否則，請Add到<b>Task Pool</b>或者<b>Micro Task</b>裡面。</li>
          <li>當遇到突發狀況需要中斷當前任務時，請使用 <b>NBL Interrupt</b>。</li>
          <li>若有好想法，請使用 <b>NBL Inbox</b> 快速記錄。我是把它設為iPhone的<b>輔助使用➡️觸控➡️背面輕點</b>，這樣就能快速紀錄。</li>
          <li>若有行事曆要記錄，請使用 <b>NBL Scheduled</b>，他會先在iPhone 自己的行事曆紀錄一份，然後再同步到 NBL Scheduled。</li>
          <li>原則上開始與結束任務，都會在<b>Log</b>頁籤紀錄。未來再來想辦法統計。</li>
        </ol>
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
         <li><i>🚧 尚未寫分析Log的功能，應該可以交由AI分析才對。此外，關於身心健康的部分，也尚未實作</i></li>

        </ul>
      </div>
    </section>
  )
}