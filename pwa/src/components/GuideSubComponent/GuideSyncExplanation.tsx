import { useAppStore } from "../../store/appStore";

export function GuideSyncExplanation() {
  const locale = useAppStore((state) => state.locale);
  return locale === "zh-TW" ? (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        🔄 同步說明（v3.1）
      </h3>
      <ul className="space-y-2 text-gray-700 list-disc pl-5">
        <li>
          <b>資料主體在 PWA：</b>
          本機 Dexie/IndexedDB 為主資料庫，操作速度快且可離線。
        </li>
        <li>
          <b>Supabase (或 GAS + Google Sheets) 是雲端資料層：</b>
          用於跨設備同步與備份。
        </li>
        <li>
          <b>雙向同步表：</b>
          Task Pool / Scheduled / Micro Tasks / Inbox / Resources。
        </li>
        <li>
          <b>Log 表目前採單向推送：</b>
          PWA 會推送 Log 到 Supabase / Google
          Sheets，但不自動拉回，避免重複與大量傳輸。
        </li>
        <li>
          <b>☁️ 還原功能：</b>
          可清空本地後從 Supabase / Google Sheets 重新拉取。預設保留
          Log，也可切換連 Log 一起清除。
        </li>
        <li>
          <b>定時生成 ics 檔案：</b>在 Supabase / Google Sheets
          上面設定定時處理生成ics的指令後，會定期將日程資料生成 ics
          檔案，方便匯入其他日曆應用。若沒設定，就無此功能。
        </li>
        <li>
          <b>同步頻率：</b>
          PWA
          會在同步資料區塊可視時，並且pending數達到一定閾值時，將本地資料同步到
          Supabase / Google Sheets，建議保持網路連線以確保資料一致性。
        </li>
        <li>
          <b>注意事項：</b>
          雲端資料可能存在延遲，請以本地資料為準，避免在多設備同時操作時產生衝突。
        </li>
        <li>
          <b>資料安全性：</b>
          本地資料優先，雲端僅作同步與備份，請妥善管理您的 Supabase / Google
          Sheets 帳號安全。
        </li>
      </ul>
    </div>
  ) : locale === "ja" ? (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        🔄 Supabase / Google Sheets 同期化（v3.1）
      </h3>
      <ul className="space-y-2 text-gray-700 list-disc pl-5">
        <li>
          <b>主なデータはPWAにある：</b>
          本機の Dexie/IndexedDB が主なデータベースで、操作速度が速く、オフラインでも使用可能。
        </li>
        <li>
          <b>Supabase (または GAS + Google Sheets) はクラウドデータ層である：</b>
          複数デバイス間の同期とバックアップに使用される。
        </li>
        <li>
          <b>双方向同期テーブル：</b>
          Task Pool / Scheduled / Micro Tasks / Inbox / Resources。
        </li>
        <li>
          <b>ログテーブルは現在一方向プッシュを採用：</b>
          PWA はログを Supabase / Google
          Sheets にプッシュするが、自動的に引き戻すことはなく、重複や大量のデータ転送を避ける。
        </li>
        <li>
          <b>☁️ 復元機能：</b>
          ローカルデータをクリアした後、Supabase / Google Sheets から再取得できる。デフォルトではログが保持されるが、ログと一緒にクリアすることも可能。
        </li>
        <li>
          <b>定期的に ics ファイルを生成：</b>Supabase / Google Sheets 上で定期処理の生成指示を設定すると、スケジュールデータから定期的に ics ファイルが生成され、他のカレンダーアプリにインポートしやすくなる。設定していない場合、この機能は利用できない。
        </li>
        <li>
          <b>同期頻度：</b>
          PWA は同期データブロックが表示され、かつ保留数が一定の閾値に達したときに、ローカルデータを Supabase / Google Sheets に同期する。データの一貫性を確保するために、ネットワーク接続を維持することを推奨。
        </li>
        <li>
          <b>注意事項：</b>
          クラウドデータは遅延する可能性があるため、ローカルデータを基準とし、複数デバイスで同時に操作する際の競合を避ける。
        </li>
        <li>
          <b>データの安全性：</b>
          ローカルデータを優先し、クラウドは同期とバックアップのみに使用する。Supabase / Google
          Sheets アカウントのセキュリティを適切に管理すること。
        </li>
      </ul>
    </div>
  ) : (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        🔄  Supabase / Google Sheets Synchronization（v3.1）
      </h3>
      <ul className="space-y-2 text-gray-700 list-disc pl-5">
        <li>
          <b>The main data resides in the PWA:</b>
          The main data is stored locally in Dexie/IndexedDB, which is fast and can be used offline.
        </li>
        <li>
          <b>Supabase (or GAS + Google Sheets) is the cloud data layer:</b>
          It is used for cross-device synchronization and backup.
        </li>
        <li>
          <b>Bidirectional sync tables:</b>
          Task Pool / Scheduled / Micro Tasks / Inbox / Resources.
        </li>
        <li>
          <b>The Log table currently uses one-way push:</b>
          The PWA pushes logs to Supabase / Google
          Sheets, but does not automatically pull them back to avoid duplication and large data transfers.
        </li>
        <li>
          <b>☁️ Restore function:</b>
          You can clear the local data and then pull it again from Supabase / Google Sheets. By default, logs are retained, but you can also choose to clear them along with the logs.
        </li>
        <li>
          <b>Scheduled generation of ics files:</b> After setting up scheduled processing commands in Supabase / Google Sheets,
          After setting up scheduled processing commands, it will periodically generate ics files from the schedule data, making it easy to import into other calendar applications. If not set, this feature will not be available.
        </li>
        <li>
          <b>Sync frequency:</b>
          PWA
          It will synchronize local data to Supabase / Google Sheets when the sync data block is visible and the number of pending items reaches a certain threshold. It is recommended to maintain a network connection to ensure data consistency.
        </li>
        <li>
          <b>Notes:</b>
          Cloud data may be delayed, please refer to local data to avoid conflicts when operating on multiple devices simultaneously.
        </li>
        <li>
          <b>Data security:</b>
          Local data takes precedence, and the cloud is only used for synchronization and backup. Please properly manage the security of your Supabase / Google
          Sheets account.
        </li>
      </ul>
    </div>
  );
}
