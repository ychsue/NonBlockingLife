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
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">🚀 怎麼用（最短流程）</h3>
        <ol className="list-decimal pl-5 space-y-2 text-gray-700">
          <li>先開啟本 PWA，確認可看到 Inbox / Task Pool / Scheduled 等頁籤。</li>
          <li>在 iPhone 安裝下方 Shortcuts，第一次匯入時填入你的 API 網址。</li>
          <li>日常用法：開始 Task → 中斷（需要時）→ 結束 Task → 隨手丟 Inbox。</li>
          <li>需要系統建議時，用 QueryOptions 直接挑下一個建議任務。</li>
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
          <li>🚧 Scheduled add：開啟行事曆後再寫入 Scheduled（尚未完成）</li>
        </ul>
      </div>
    </section>
  )
}