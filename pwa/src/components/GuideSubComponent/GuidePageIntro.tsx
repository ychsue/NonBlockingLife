import { SupportedLocale } from "../../i18n";

export function GuidePageIntro({ locale }: { locale: SupportedLocale }) {
  return locale === "zh-TW" ? (
    <p className="text-gray-700 leading-relaxed">
      Non-Blocking Life 的目的是把任務管理做成「不打斷主線」的日常系統，讓你在
      iPhone 與 PWA 之間可以快速開始、結束、打岔與回到任務。 在{" "}
      <a
        href="https://vocus.cc/article/6a3e2565fd89780001a92977"
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 hover:underline"
      >
        vocus.cc 上的文章
      </a>
      有較詳細的解說。
      <br />
      v2.0 已升級為「PWA 本地優先 + GAS
      雲端同步」架構，平常在本機快速操作，需要時再同步到 Google Sheets。 這是
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
  ) : locale === "ja" ? (
    <p className="text-gray-700 leading-relaxed">
      Non-Blocking Life の目的は、タスク管理を「メインラインを中断しない」日常システムとして構築し、iPhone と PWA の間で迅速に開始、終了、中断、タスクへの復帰を可能にすることです。{" "}
      <a
        href="https://vocus.cc/article/6a3e2565fd89780001a92977"
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 hover:underline"
      >
        vocus.cc 上の記事
      </a>
      で詳細な説明があります。
      <br />
      v2.0 は「PWA ローカル優先 + GAS クラウド同期」アーキテクチャにアップグレードされ、普段はローカルで迅速に操作し、必要に応じて Google Sheets に同期します。これは
      <a
        href="https://ychsue.github.io/superconductorlike_society/"
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 hover:underline"
      >
        以前書いた「超伝導体のような社会」
      </a>
      の個人時間管理システムの実験的バージョンです。
    </p>
  ) : (
    <p className="text-gray-700 leading-relaxed">
      The purpose of Non-Blocking Life is to create a daily system for task management that "does not interrupt the main line," allowing you to quickly start, end, interrupt, and return to tasks between iPhone and PWA. More detailed explanations can be found in the{" "}
      <a
        href="https://vocus.cc/article/6a3e2565fd89780001a92977"
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 hover:underline"
      >
        article on vocus.cc
      </a>
      .
      <br />
      v2.0 has been upgraded to a "PWA local-first + GAS cloud sync" architecture, allowing for quick local operations and syncing to Google Sheets when needed. This is an experimental version of the personal time management system in{" "}
      <a
        href="https://ychsue.github.io/superconductorlike_society/"
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 hover:underline"
      >
        the "Superconductor-like Society" I wrote before
      </a>
      .
    </p>
  );
}
