import { useCallback, useEffect, useMemo, useState } from 'react'
import { TutorialCarousel } from './TutorialCarousel'
import { useAppStore, type StartupPreference } from '../store/appStore'
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
    api: '/NonBlockingLife?action=query',
  },
  {
    name: 'NBL_Timer',
    url: 'https://www.icloud.com/shortcuts/7388ed6d7ab547158bd16f399014abfc',
    purpose: 'iPhone 裡面接收來自NBL提出的顯示模式與計時器切換的要求。',
  },
  {
    name: 'NBL Interrupt',
    url: 'https://www.icloud.com/shortcuts/dc4620410baf4df6aec49dec77ebad5b',
    purpose: '遇到打岔時一鍵切換中斷流程',
    api: '/NonBlockingLife?action=interrupt',
  },
  {
    name: 'NBL Inbox',
    url: 'https://www.icloud.com/shortcuts/49028b49cdf1441b9d938830948c02dc',
    purpose: '快速把想法丟進 NBL Inbox',
    api: '/NonBlockingLife?action=add&sheet=inbox&title={title}&url={url}',
  },
  {
    name: 'NBL Scheduled',
    url: 'https://www.icloud.com/shortcuts/d45e5661b79946ac98274caa14852e7a',
    purpose: '快速把想法丟進 NBL Scheduled',
    api: '/NonBlockingLife?action=add&sheet=scheduled&title={title}&note={note}&nextRun={nextRun}&url={url}',
  },
  {
    name: 'Apple Clock (時鐘)',
    url: 'https://apps.apple.com/tw/app/clock/id1584215688',
    purpose: 'iPhone 該內建的時鐘 App，提供計時器功能，配合 NBL_Timer Shortcut 切換工作/休息模式時會啟動對應的計時器。iPhone 有可能沒有預設安裝。',
  },
  {
    name: 'NBL Last Log Time',
    url: 'https://www.icloud.com/shortcuts/a553937cb1fe49d3bb7c1ee926140115',
    purpose: '這個比較進階，您得先使用`備忘錄`寫個文字類似`2026-04-03`，然後存到iPhone檔案目錄一個檔叫`last_log_time`(.txt會自動補，別加)，然後，在Shortcuts裡面利用自動化執行APP開啟時，串接自動化，先呼叫這個Shortcut，如果傳回的值大於2，就執行Shortcut NBL Query，這樣，就能在打開您要開的APP後，自動呼叫NBL 來管理您的任務了！這是我個人用來在打開社交媒體時自動呼叫NBL，提醒自己先看看待辦清單再決定要不要打開的做法，您也可以發揮創意串接在其他情境！',
  }
]

const VIDEO_RESOURCES = [
  {
    title: 'NonBlockingLife: A Practical Way to Recover Focus After Interruptions',
    language: 'English',
    type: 'Concept Intro',
    url: 'https://youtu.be/UTtDZrytIbc',
    description:
      '介紹 Non-Blocking Life 的核心思路，示範面對中斷時，如何快速回到主線任務。',
  },
  {
    title: 'NonBlockingLife｜別讓清單管理成為負擔：把大腦當單執行緒',
    language: '中文',
    type: '概念介紹',
    url: 'https://youtu.be/NueGZACV7zw',
    description:
      '用中文說明為什麼「任務管理不應該打斷生活」，以及如何建立可持續的日常流程。',
  },
]

export function GuidePage() {
  const setCurrentSheet = useAppStore((state) => state.setCurrentSheet)
  const locale = useAppStore((state) => state.locale)
  const startupPreference = useAppStore((state) => state.startupPreference)
  const setStartupPreference = useAppStore((state) => state.setStartupPreference)
  const [timerUrlInput, setTimerUrlInput] = useState(getNblTimerInstallUrl())
  const [saved, setSaved] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    'unsupported'
  )
  const [requestingPermission, setRequestingPermission] = useState(false)

  useEffect(() => {
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported')
      return
    }
    setNotificationPermission(Notification.permission)
  }, [])

  const canInstallNblTimer = useMemo(
    () => isValidICloudShortcutUrl(timerUrlInput),
    [timerUrlInput]
  )

  const handleSaveNblTimerUrl = () => {
    setNblTimerInstallUrl(timerUrlInput)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false)
  }, [])

  const handleOpenTutorialSheet = useCallback(
    (sheet: 'task_pool' | 'scheduled') => {
      setCurrentSheet(sheet)
      setShowTutorial(false)
    },
    [setCurrentSheet]
  )

  const handleRequestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported')
      return
    }

    setRequestingPermission(true)
    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    } finally {
      setRequestingPermission(false)
    }
  }

  function isVideoForCurrentLocale(video: typeof VIDEO_RESOURCES[number]) {
    if (locale === 'zh-TW') {
      return video.language === '中文'
    } else {
      return video.language === 'English'
    }
  }

  function getStartupOptionLabel(option: StartupPreference) {
    if (locale === 'ja') {
      if (option === 'guide') return 'ガイドページ'
      if (option === 'selection_cache') return '🎯 Candidates'
      return '前回のページ'
    }

    if (locale === 'en') {
      if (option === 'guide') return 'Guide Page'
      if (option === 'selection_cache') return '🎯 Candidates'
      return 'Last Visited Page'
    }

    if (option === 'guide') return '說明頁'
    if (option === 'selection_cache') return '🎯 Candidates 任務控制中心'
    return '上次停留頁面'
  }

  const startupDescription =
    locale === 'ja'
      ? 'URL で開いた場合は URL の遷移が優先されます。'
      : locale === 'en'
        ? 'If opened from a URL action, URL navigation still takes priority.'
        : '若由 iPhone Shortcut 或 URL action 開啟，仍會優先執行該導頁。'

  return (
    <>
      <section className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {locale !== 'zh-TW' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {locale === 'ja'
            ? 'このページは主に中国語です。Safari / Chrome のページ翻訳をご利用ください。'
            : 'This page is primarily written in Chinese. Please use your browser built-in translation (Safari/Chrome Translate).'}
        </div>
      )}
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
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setShowTutorial(true)}
            className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            查看首次教學輪播
          </button>
          <p className="text-sm text-gray-500">
            可隨時重新打開首頁的新手教學，之後逐頁補上動畫時也會從這裡進入。
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">🔔 背景提醒（可選）</h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          啟用後，當你切到其他視窗時，NBL 可在「開始工作 / 結束工作」時顯示系統通知。
        </p>

        <div className="mt-3">
          {notificationPermission === 'unsupported' && (
            <p className="text-sm text-amber-700">此瀏覽器目前不支援 Web Notification。</p>
          )}

          {notificationPermission === 'granted' && (
            <p className="text-sm text-green-700">已啟用通知權限。背景時可收到工作狀態提醒。</p>
          )}

          {notificationPermission === 'denied' && (
            <p className="text-sm text-amber-700">
              已封鎖通知。請到瀏覽器網站權限設定將 Notifications 改為 Allow。
            </p>
          )}

          {notificationPermission === 'default' && (
            <button
              type="button"
              onClick={handleRequestNotificationPermission}
              disabled={requestingPermission}
              className="inline-flex items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {requestingPermission ? '請稍候...' : '啟用背景通知'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {locale === 'ja' ? '🏁 起動時の表示ページ' : locale === 'en' ? '🏁 Startup Default Page' : '🏁 啟動預設頁面'}
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          {locale === 'ja'
            ? 'アプリを開いたとき、または更新後に最初に表示するページを選択します。'
            : locale === 'en'
              ? 'Choose which page opens first when you launch or refresh the app.'
              : '設定每次打開 App 或重新整理後，最先顯示的頁面。'}
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {(['guide', 'selection_cache', 'last_visited'] as StartupPreference[]).map((option) => {
            const active = startupPreference === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => setStartupPreference(option)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'border-sky-600 bg-sky-50 text-sky-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                aria-pressed={active}
              >
                {getStartupOptionLabel(option)}
              </button>
            )
          })}
        </div>

        <p className="mt-3 text-xs text-gray-500">{startupDescription}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">🎬 介紹影片與使用案例</h3>
            <p className="text-sm text-gray-600 mt-1">
              先看概念影片快速上手，後續會在這裡持續增加各種情境的實戰案例。
            </p>
          </div>
          <a
            href="https://www.youtube.com/@young-chunghsue4363"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-sm font-medium text-red-600 hover:underline"
          >
            前往 YouTube 頻道
          </a>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {VIDEO_RESOURCES.filter((video) => isVideoForCurrentLocale(video)).map((video) => (
            <article
              key={video.url}
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex h-full flex-col"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-700">
                  {video.language}
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-1 font-medium text-emerald-700">
                  {video.type}
                </span>
              </div>
              <h4 className="text-base font-semibold text-gray-900 leading-snug">{video.title}</h4>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed flex-1">{video.description}</p>
              <a
                href={video.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                觀看影片
              </a>
            </article>
          ))}
        </div>

        <div className="mt-4 rounded-md border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-700">
          <p className="font-medium text-gray-800">接下來預計補上的案例方向</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>實際操作如何設定自己的Google Sheets 同步</li>
            <li>如何透過Task Pool 戒除不想要的習慣</li>
            <li>如何透過 Scheduled 提醒自己定時做某件事，比如早晚的養生操</li>
          </ul>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">🚀 怎麼用（最短流程）</h3>
        <ol className="list-decimal pl-5 space-y-2 text-gray-700">
          <li>先開啟本 PWA，確認可看到 Inbox / Task Pool / Scheduled 等頁籤。</li>
          <li>iPhone的使用者，請確認不是在 `私密瀏覽模式` 下使用，若是的話，請切換到一般模式，不然會無法紀錄。</li>
          <li>[可選] 第一次使用請先設定同步 URL：點右上角「⚙️」貼上 GAS Web App URL。</li>
          <li>[可選] 按一次「💾 同步」確認可成功 push / pull。</li>
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
        <h3 className="text-lg font-semibold text-gray-800 mb-3">📦 資料匯出與匯入</h3>
        <p className="text-gray-700 text-sm mb-4">
          NBL 支援把本地資料匯出成 JSON 或 Markdown table 備份，也可從備份檔案匯入資料。這對跨設備遷移、備份、AI 分析或 Excel 檢視都很有幫助。
        </p>

        <div className="space-y-4">
          {/* 匯出說明 */}
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
            <h4 className="font-semibold text-blue-900 text-sm mb-2">📤 匯出備份</h4>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-blue-800">
              <li>點擊同步狀態列右方的 <strong>📤 按鈕</strong></li>
              <li>可選擇輸出 JSON 或 Markdown table，會下載 <code className="bg-white px-1 rounded">nbl-backup-YYYY-MM-DD.json</code> 或 <code className="bg-white px-1 rounded">nbl-backup-YYYY-MM-DD.md</code></li>
              <li>兩種格式都包含 6 張表：Task Pool / Scheduled / Micro Tasks / Inbox / Resource / Log</li>
            </ol>
            <p className="text-xs text-blue-700 mt-2">
              💡 提示：JSON 適合程式處理與 Power Query；Markdown table 可直接閱讀，且用 <code className="bg-white px-1 rounded">## 📊 table_name</code> 分段，適合 AI 與人工檢查
            </p>
          </div>

          {/* 匯入說明 */}
          <div className="rounded-md bg-green-50 border border-green-200 p-3">
            <h4 className="font-semibold text-green-900 text-sm mb-2">📥 匯入資料</h4>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-green-800">
              <li>點擊同步狀態列右方的 <strong>📥 按鈕</strong></li>
              <li>選擇要匯入的 JSON 或 Markdown table 備份檔案</li>
              <li>確認 modal 提醒有無未同步的變更</li>
              <li>確認後開始匯入，相同 ID 的記錄會被覆蓋，其他本地資料保留</li>
              <li>結果 modal 會顯示各表匯入筆數與任何跳過的記錄</li>
            </ol>
            <p className="text-xs text-green-700 mt-2">
              ⚠️ 提醒：匯入會用 upsert（更新或插入）模式，相同 ID 會被覆蓋，但不會刪除其他記錄
            </p>
          </div>

          {/* Excel 整合說明 */}
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
            <h4 className="font-semibold text-amber-900 text-sm mb-2">📊 在 Excel 檢視資料</h4>
            <p className="text-sm text-amber-800 mb-2">可先匯出 JSON 或 Markdown table；思考中：</p>
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
            <h4 className="font-semibold text-purple-900 text-sm mb-2">🎯 常見使用情境</h4>
            <ul className="space-y-1 text-sm text-purple-800 list-disc pl-5">
              {/* <li><strong>在 Excel 中修改後匯入</strong>：export JSON → 在 Excel 中編輯 → 存回 JSON → 用 📥 匯入</li> */}
              <li><strong>跨裝置遷移</strong>：新裝置先 export 空備份確認格式 → 從舊裝置 export → 在新裝置 import</li>
              <li><strong>AI 分析</strong>：export Markdown table → 貼給 Gemini/Copilot/Claude 做分析或摘要（保留 <code className="bg-white px-1 rounded">## 📊 table_name</code> 區塊）</li>
              <li><strong>完整備份</strong>：定期 export JSON 與 Markdown table 各一份，兼顧系統還原與人工可讀</li>
            </ul>
          </div>
        </div>
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
                {shortcut.api && (<a href={'/' + shortcut.api} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">API 範例</a>)}
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

      {showTutorial && (
        <TutorialCarousel
          onClose={handleCloseTutorial}
          onOpenTaskPool={() => handleOpenTutorialSheet('task_pool')}
          onOpenScheduled={() => handleOpenTutorialSheet('scheduled')}
        />
      )}
    </>
  )
}