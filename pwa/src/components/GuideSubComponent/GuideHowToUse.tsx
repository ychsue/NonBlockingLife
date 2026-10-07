import { useAppStore } from "../../store/appStore";

export function GuideHowToUse() {
  const locale = useAppStore((state) => state.locale);

  return locale === "zh-TW" ? (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        🚀 怎麼用（最短流程）
      </h3>
      <ol className="list-decimal pl-5 space-y-2 text-gray-700">
        <li>先開啟本 PWA，確認可看到 Inbox / Task Pool / Scheduled 等頁籤。</li>
        <li>
          iPhone的使用者，請確認不是在 `私密瀏覽模式`
          下使用，若是的話，請切換到一般模式，不然會無法紀錄。
        </li>
        <li>
          [可選] 第一次使用請先設定同步 URL：點右上角「⚙️」貼上 Supabase
          URL 與 Key。
        </li>
        <li>[可選] 按一次「💾 同步」確認可成功 push / pull。</li>
        <li>
          在 iPhone 安裝下方 Shortcuts，並將除了 <b>NBL_Timer</b> 以外的
          Shortcuts 加入 iPhone 下拉式控制項目。
        </li>
        <li>
          日常用法：用 <b>QueryOptions</b>{" "}
          直接挑下一個建議任務執行，或者結束當前任務。
        </li>
        <li>
          若有任務想納入管理，請在 PWA 新增。特定時間執行請加到{" "}
          <b>NBL Scheduled</b>，其他請加到 <b>Task Pool</b> 或 <b>Micro Task</b>
          。
        </li>
        <li>
          遇到突發狀況需要中斷時，請使用 <b>NBL Interrupt</b>。
        </li>
        <li>
          若有好想法，請使用 <b>NBL Inbox</b> 快速記錄。我是把它設為 iPhone 的{" "}
          <b>輔助使用➡️觸控➡️背面輕點</b>，可快速紀錄。
        </li>
        <li>
          若有行事曆要記錄，請使用 <b>NBL Scheduled</b>，會先寫入 iPhone
          行事曆，再同步到 NBL Scheduled。
        </li>
        <li>
          開始與結束任務都會在 <b>Log</b> 頁籤紀錄，完整 Log 會推送到 Google
          Sheets 供 AI/Excel 分析。
        </li>
      </ol>
    </div>
  ) : locale === "ja" ? (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        🚀 どう使う（最短のやり方）
      </h3>
      <ol className="list-decimal pl-5 space-y-2 text-gray-700">
        <li>まずこの PWA を開いて、Inbox や Task Pool、Scheduled などのタブが見えるか確認してね。</li>
        <li>
          iPhone を使っている場合は、`プライベートブラウズモード` ではなく、通常モードで使用してね。そうしないと記録ができないよ。
        </li>
        <li>
          [任意] 初めて使うときは、まず同期 URL を設定してね：右上の「⚙️」をクリックして Supabase の URL と Key を貼り付ける。
        </li>
        <li>[任意] 「💾 同期」を一度押して、push / pull が成功するか確認してね。</li>
        <li>
          iPhone では下の Shortcuts をインストールして、<b>NBL_Timer</b> 以外の
          Shortcuts を iPhone の下拉式コントロールに追加してね。
        </li>
        <li>
          日常的な使い方：<b>QueryOptions</b>{" "}
          で次の推奨タスクを直接選んで実行するか、現在のタスクを終了してね。
        </li>
        <li>
          管理したいタスクがある場合は、PWA で追加してね。特定の時間に実行する場合は{" "}
          <b>NBL Scheduled</b> に追加して、その他は <b>Task Pool</b> や <b>Micro Task</b>
          に追加してね。
        </li>
        <li>
          突発的な状況で中断が必要な場合は、<b>NBL Interrupt</b> を使ってね。
        </li>
        <li>
          良いアイデアがあれば、<b>NBL Inbox</b> で素早く記録してね。私はこれを iPhone の{" "}
          <b>アクセシビリティ➡️タッチ➡️背面タップ</b> に設定して、素早く記録できるようにしているよ。
        </li>
        <li>
          カレンダーに記録したい場合は、<b>NBL Scheduled</b> を使ってね。まず iPhone の
          カレンダーに書き込まれ、その後 NBL Scheduled に同期されるよ。
        </li>
        <li>
          タスクの開始と終了はすべて <b>Log</b> タブに記録され、完全なログは Google
          Sheets に送信され、AI や Excel で分析できるよ。
        </li>
      </ol>
    </div>
  ) : (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        🚀 How to Use (Quickest Way)
      </h3>
      <ol className="list-decimal pl-5 space-y-2 text-gray-700">
        <li>Open this PWA first and make sure you can see the Inbox / Task Pool / Scheduled tabs.</li>
        <li>
          If you are using an iPhone, make sure you are not in `Private Browsing Mode`. If you are, switch to the normal mode, otherwise recording will not work.
        </li>
        <li>
          [Optional] The first time you use it, set the sync URL: click the "⚙️" in the top right and paste the Supabase URL and Key.
        </li>
        <li>[Optional] Press "💾 Sync" once to confirm that push / pull is successful.</li>
        <li>
          Install the Shortcuts below on your iPhone, and add all Shortcuts except <b>NBL_Timer</b> to the iPhone's pull-down control items.
        </li>
        <li>
          Daily use: Use <b>QueryOptions</b>{" "}
          to directly select the next recommended task to execute, or end the current task.
        </li>
        <li>
          If there are tasks you want to manage, add them in the PWA. For tasks to be executed at a specific time, add them to{" "}
          <b>NBL Scheduled</b>, and for others, add them to <b>Task Pool</b> or <b>Micro Task</b>.
        </li>
        <li>
          In case of unexpected situations that require interruption, use <b>NBL Interrupt</b>.
        </li>
        <li>
          If you have a good idea, use <b>NBL Inbox</b> to quickly record it. I set it as iPhone's{" "}
          <b>Accessibility➡️Touch➡️Back Tap</b> for quick recording.
        </li>
        <li>
          If you want to record in the calendar, use <b>NBL Scheduled</b>. It will first write to the iPhone
          calendar, and then sync to NBL Scheduled.
        </li>
        <li>
          The start and end of tasks will be recorded in the <b>Log</b> tab, and the complete log will be pushed to Google
          Sheets for AI/Excel analysis.
        </li>
      </ol>
    </div>
  );
}
