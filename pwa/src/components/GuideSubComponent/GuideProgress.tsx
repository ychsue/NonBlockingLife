import { useTWithMaps } from "../../i18n";

export function GuideProgress() {
    const tHere = useTWithMaps({
      "zh-TW": {
        "整合進度": "整合進度",
        "li1": "✅ 將Scheduled 項目以日曆與月曆形式呈現",
        "li2": "✅ 引進其他日曆系統 ics (唯讀) 並且加以呈現與加入 Schedule 管理中",
        "li3": "✅ 改以Supabase 作為後端儲存，速度較快也較易維護",
        "li4": "🚧 與 Android 原生系統整合大致完成，但仍卡在封閉測試",
        "li5": "🚧 設法與其他平台原生系統整合",
        "li6": "🚧 改進前端介面，提升使用者體驗",
        "li7": "🚧 Log 深度分析與身心健康整合尚未實作，現階段建議先使用 Supabase + AI 工具分析。",
      },
      en: {
        "整合進度": "Integration Progress",
        "li1": "✅ Present Scheduled items in calendar and monthly view",
        "li2": "✅ Introduce other calendar systems ics (read-only) and present them in Schedule management",
        "li3": "✅ Switch to Supabase as the backend storage, faster and easier to maintain",
        "li4": "🚧 Integration with Android native system mostly completed, but still stuck in closed testing",
        "li5": "🚧 Attempt to integrate with other platform native systems",
        "li6": "🚧 Improve front-end interface to enhance user experience",
        "li7": "🚧 Deep log analysis and integration with mental and physical health not yet implemented, currently recommended to use Supabase + AI tools for analysis",
      },
      ja: {
        "整合進度": "統合の進捗",
        "li1": "✅ スケジュールされた項目をカレンダーおよび月間ビューで表示",
        "li2": "✅ 他のカレンダーシステム ics (読み取り専用) を導入し、スケジュール管理で表示",
        "li3": "✅ バックエンドストレージとして Supabase に切り替え、より高速で保守が容易",
        "li4": "🚧 Android ネイティブシステムとの統合はほぼ完了しましたが、まだクローズドテストで停滞しています",
        "li5": "🚧 他のプラットフォームのネイティブシステムとの統合を試みる",
        "li6": "🚧 フロントエンドインターフェースを改善してユーザーエクスペリエンスを向上させる",
        "li7": "🚧 ログの深い分析と心身の健康との統合はまだ実装されておらず、現時点では Supabase + AI ツールを使用した分析を推奨します",
      },
    });
    return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">🧩 {tHere("整合進度")}</h3>
      <ul className="space-y-2 text-gray-700">
        <li>{tHere("li1")}</li>
        <li>{tHere("li2")}</li>
        <li>{tHere("li3")}</li>
        <li>{tHere("li4")}</li>
        <li>{tHere("li5")}</li>
        <li>{tHere("li6")}</li>
        <li>
          <i>
            {tHere("li7")}
          </i>
        </li>
      </ul>
    </div>
  );
}
