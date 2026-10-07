import { useCallback, useEffect, useMemo, useState } from "react";
import { TutorialCarousel } from "./TutorialCarousel";
import { useAppStore, type StartupPreference } from "../store/appStore";
import {
  getDeviceType,
  getNblTimerInstallUrl,
  isValidICloudShortcutUrl,
  setNblTimerInstallUrl,
} from "../utils/shortcutUtils";
import { useTwaRpc } from "../hooks/useTwaRpc";
import { sleep } from "../utils/timeUtils";
import { SupportedLocale, useTWithMaps } from "../i18n";
import { GuidePageIntro } from "./GuideSubComponent/GuidePageIntro";
import { GuideNotification } from "./GuideSubComponent/GuideNotification";
import { GuideHowToUse } from "./GuideSubComponent/GuideHowToUse";
import { GuideDataImportAndExport } from "./GuideSubComponent/GuideDataImportAndExport";
import { GuideSyncExplanation } from "./GuideSubComponent/GuideSyncExplanation";
import { GuideProgress } from "./GuideSubComponent/GuideProgress";

const SHORTCUTS = (locale: SupportedLocale) => [
  {
    name: "QueryOptions",
    url: "https://www.icloud.com/shortcuts/ce9e7a05926244d2aca8eec11860a000",
    purpose:
      locale === "zh-TW"
        ? "由NBL取得候選任務清單"
        : locale === "ja"
          ? "NBLから候補タスクを取得する"
          : "Get candidate task list from NBL",
    api: "/NonBlockingLife?action=query",
  },
  {
    name: "NBL_Timer",
    url: "https://www.icloud.com/shortcuts/cec8d6853e6149f5aff82d8ff0235f36",
    purpose:
      locale === "zh-TW"
        ? "iPhone 裡面接收來自NBL提出的顯示模式與計時器切換的要求。"
        : locale === "ja"
          ? "iPhone で NBL からの表示モードとタイマー切り替えの要求を受け取る。"
          : "Receive display mode and timer switch requests from NBL on iPhone.",
  },
  {
    name: "SHOW_TIMER",
    url: "https://www.icloud.com/shortcuts/370f78a724654baf9a1909472c5bf4fc",
    purpose:
      locale === "zh-TW"
        ? "顯示計時器，只有一行程式碼"
        : locale === "ja"
          ? "タイマーを表示する、コードは一行だけ"
          : "Display the timer, only one line of code",
  },
  {
    name: "NBL Interrupt",
    url: "https://www.icloud.com/shortcuts/dc4620410baf4df6aec49dec77ebad5b",
    purpose:
      locale === "zh-TW"
        ? "遇到打岔時一鍵切換中斷流程"
        : locale === "ja"
          ? "中断が発生したときにワンクリックで中断プロセスに切り替える"
          : "Switch to the interrupt process with one click when an interruption occurs",
    api: "/NonBlockingLife?action=interrupt",
  },
  {
    name: "NBL Inbox",
    url: "https://www.icloud.com/shortcuts/49028b49cdf1441b9d938830948c02dc",
    purpose:
      locale === "zh-TW"
        ? "快速把想法丟進 NBL Inbox"
        : locale === "ja"
          ? "思いついたことを素早く NBL Inbox に入れる"
          : "Quickly put ideas into NBL Inbox",
    api: "/NonBlockingLife?action=add&sheet=inbox&title={title}&url={url}",
  },
  {
    name: "NBL Scheduled",
    url: "https://www.icloud.com/shortcuts/d45e5661b79946ac98274caa14852e7a",
    purpose:
      locale === "zh-TW"
        ? "快速把想法丟進 NBL Scheduled"
        : locale === "ja"
          ? "思いついたことを素早く NBL Scheduled に入れる"
          : "Quickly put ideas into NBL Scheduled",
    api: "/NonBlockingLife?action=add&sheet=scheduled&title={title}&note={note}&nextRun={nextRun}&url={url}",
  },
  {
    name: "Apple Clock (時鐘)",
    url: "https://apps.apple.com/tw/app/clock/id1584215688",
    purpose:
      locale === "zh-TW"
        ? "iPhone 該內建的時鐘 App，提供計時器功能，配合 NBL_Timer Shortcut 切換工作/休息模式時會啟動對應的計時器。iPhone 有可能沒有預設安裝。"
        : locale === "ja"
          ? "iPhone に標準搭載されている時計アプリで、タイマー機能を提供します。NBL_Timer ショートカットと連携して作業/休憩モードを切り替えると、対応するタイマーが起動します。iPhone にはデフォルトでインストールされていない場合があります。"
          : "The built-in clock app on iPhone provides a timer function. When switching work/rest mode with the NBL_Timer Shortcut, the corresponding timer will be activated. iPhone may not have it pre-installed.",
  },
  {
    name: "NBL Last Log Time",
    url: "https://www.icloud.com/shortcuts/a553937cb1fe49d3bb7c1ee926140115",
    purpose:
      locale === "zh-TW"
        ? "這個比較進階，您得先使用`備忘錄`寫個文字類似`2026-04-03`，然後存到iPhone檔案目錄一個檔叫`last_log_time`(.txt會自動補，別加)，然後，在Shortcuts裡面利用自動化執行APP開啟時，串接自動化，先呼叫這個Shortcut，如果傳回的值大於2，就執行Shortcut NBL Query，這樣，就能在打開您要開的APP後，自動呼叫NBL 來管理您的任務了！這是我個人用來在打開社交媒體時自動呼叫NBL，提醒自己先看看待辦清單再決定要不要打開的做法，您也可以發揮創意串接在其他情境！"
        : locale === "ja"
          ? "これは少し高度です。まず「メモ」を使って `2026-04-03` のようなテキストを書き、iPhone のファイルディレクトリに `last_log_time` というファイルとして保存します（.txt は自動的に追加されるので、追加しないでください）。その後、Shortcuts の自動化でアプリ起動時にこのショートカットを呼び出し、返された値が 2 より大きければ Shortcut NBL Query を実行します。こうすることで、開きたいアプリを開いた後に自動的に NBL を呼び出してタスクを管理できます。これは私がソーシャルメディアを開くときに自動的に NBL を呼び出し、まずやることリストを確認してから開くかどうかを決める方法で、他の状況でも創意的に応用できます。"
          : "This is a bit advanced. You first use the `Notes` app to write a text like `2026-04-03`, then save it to the iPhone file directory as a file called `last_log_time` (.txt will be added automatically, do not add it). Then, in Shortcuts automation, when the app is opened, call this shortcut first. If the returned value is greater than 2, execute the Shortcut NBL Query. This way, after opening the app you want to open, NBL will be automatically called to manage your tasks. This is my personal method to automatically call NBL when opening social media, reminding myself to check the to-do list before deciding whether to open it. You can also creatively apply it in other situations!",
  },
];

const VIDEO_RESOURCES = (locale: SupportedLocale) => [
  {
    title:
      "NonBlockingLife: A Practical Way to Recover Focus After Interruptions",
    language: "English",
    type: "Concept Intro",
    url: "https://youtu.be/UTtDZrytIbc",
    description:
      locale === "zh-TW"
        ? "介紹 Non-Blocking Life 的核心思路，示範面對中斷時，如何快速回到主線任務。"
        : locale === "ja"
          ? "Non-Blocking Life の核心的な考え方を紹介し、中断に直面したときにどのように迅速に主線のタスクに戻るかを示します。"
          : "Introduces the core idea of Non-Blocking Life and demonstrates how to quickly return to the mainline task when faced with interruptions.",
  },
  {
    title: "NonBlockingLife｜別讓清單管理成為負擔：把大腦當單執行緒",
    language: "中文",
    type: "概念介紹",
    url: "https://youtu.be/NueGZACV7zw",
    description:
      locale === "zh-TW"
        ? "用中文說明為什麼「任務管理不應該打斷生活」，以及如何建立可持續的日常流程。"
        : locale === "ja"
          ? "なぜ「タスク管理は生活を中断すべきではない」のか、そして持続可能な日常の流れをどのように構築するかを中国語で説明します。"
          : "Explains in Chinese why 'task management should not interrupt life' and how to establish a sustainable daily routine.",
  },
  {
    title:
      locale === "zh-TW"
        ? "Android 版的展示(請幫忙封測)"
        : locale === "ja"
          ? "Android 版のデモ（ベータテストにご協力ください）"
          : "Android Version Demo (Please Help Beta Test)",
    type:
      locale === "zh-TW"
        ? "實際操作"
        : locale === "ja"
          ? "実際の操作"
          : "Hands-on",
    url: "https://youtube.com/shorts/2UUsPNVpdkE",
    description:
      locale === "zh-TW"
        ? "展示 Android 版的操作流程，請幫忙封測，提供回饋，這樣才能夠在Play商店被公開安裝。"
        : locale === "ja"
          ? "Android 版の操作手順を示し、ベータテストへの協力とフィードバックを求めます。これにより、Play ストアで公開インストールが可能になります。"
          : "Demonstrates the operation process of the Android version, asks for help with beta testing and feedback, so that it can be publicly installed on the Play Store.",
  },
];

export function GuidePage() {
  const setCurrentSheet = useAppStore((state) => state.setCurrentSheet);
  const locale = useAppStore((state) => state.locale);
  const startupPreference = useAppStore((state) => state.startupPreference);
  const setStartupPreference = useAppStore(
    (state) => state.setStartupPreference,
  );
  const [timerUrlInput, setTimerUrlInput] = useState(getNblTimerInstallUrl());
  const [saved, setSaved] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isIOS] = useState(getDeviceType() === "Shortcuts");

  const deviceType = useMemo(() => getDeviceType(), []);
  const { sendRequest } = useTwaRpc();
  const [androidWebViewVersion, setAndroidWebViewVersion] = useState<
    string | null
  >(null);
  const [refreshAndroidWebViewInfo, setRefreshAndroidWebViewInfo] =
    useState(false);

  const tHere = useTWithMaps({
    "zh-TW": {
      "說明頁": "說明頁",
      "查看首次教學輪播": "查看首次教學輪播",
      "可隨時重新打開首頁的新手教學，之後逐頁補上動畫時也會從這裡進入。": "可隨時重新打開首頁的新手教學，之後逐頁補上動畫時也會從這裡進入。",
      介紹影片與使用案例: "介紹影片與使用案例",
      "先看概念影片快速上手，後續會在這裡持續增加各種情境的實戰案例。": "先看概念影片快速上手，後續會在這裡持續增加各種情境的實戰案例。",
      "前往 YouTube 頻道": "前往 YouTube 頻道",
      "觀看影片": "觀看影片",
      "安裝 Shortcut": "安裝 Shortcut",
      "API 範例": "API 範例",
      "iOS Shortcuts 安裝": "iOS Shortcuts 安裝",
    },
    en: {
      "說明頁": "Guide Page",
      "查看首次教學輪播": "View the first tutorial carousel",
      "可隨時重新打開首頁的新手教學，之後逐頁補上動畫時也會從這裡進入。": "You can reopen the homepage tutorial at any time, and when adding animations page by page later, you will also enter from here.",
      "介紹影片與使用案例": "Introduction Videos and Use Cases",
      "先看概念影片快速上手，後續會在這裡持續增加各種情境的實戰案例。": "First watch the concept video to get started quickly, and various practical cases will continue to be added here later.",
      "前往 YouTube 頻道": "Go to YouTube Channel",
      "觀看影片": "Watch Video",
      "安裝 Shortcut": "Install Shortcut",
      "API 範例": "API Examples",
      "iOS Shortcuts 安裝": "iOS Shortcuts Installation",
    },
    ja: {
      "說明頁": "ガイドページ",
      "查看首次教學輪播": "最初のチュートリアルカルーセルを見る",
      "可隨時重新打開首頁的新手教學，之後逐頁補上動畫時也會從這裡進入。": "ホームページのチュートリアルはいつでも再度開くことができ、後でページごとにアニメーションを追加する際にもここから入ります。",
      "介紹影片與使用案例": "紹介動画と使用例",
      "先看概念影片快速上手，後續會在這裡持續增加各種情境的實戰案例。": "まず概念動画を見て素早く始め、その後さまざまな実践例がここに追加され続けます。",
      "前往 YouTube 頻道": "YouTube チャンネルへ",
      "觀看影片": "動画を見る",
      "安裝 Shortcut": "ショートカットをインストール",
      "API 範例": "API の例",
      "iOS Shortcuts 安裝": "iOS ショートカットのインストール",
    }
  });

  useEffect(() => {
    if (!import.meta.env.DEV && !["TWA", "AndroidWebView"].includes(deviceType))
      return;

    sleep(20)
      .then(() => sendRequest("nbl:version", {}))
      .then((response: any) => {
        if (response?.type === "nbl:version-response") {
          console.log("Android WebView version response:", response);
          setAndroidWebViewVersion(response.version ?? null);
        }
      });
    setRefreshAndroidWebViewInfo(false);
  }, [deviceType, sendRequest, refreshAndroidWebViewInfo]);


  const canInstallNblTimer = useMemo(
    () => isValidICloudShortcutUrl(timerUrlInput),
    [timerUrlInput],
  );

  const handleSaveNblTimerUrl = () => {
    setNblTimerInstallUrl(timerUrlInput);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  const handleOpenTutorialSheet = useCallback(
    (sheet: "task_pool" | "scheduled") => {
      setCurrentSheet(sheet);
      setShowTutorial(false);
    },
    [setCurrentSheet],
  );


  function isVideoForCurrentLocale(
    video: (Record<string, any> & { language?: string })[number],
  ) {
    if (!!!video.language) return true; // If no language specified, show for all locales
    if (locale === "zh-TW") {
      return video.language === "中文";
    } else {
      return video.language === "English";
    }
  }

  function getStartupOptionLabel(option: StartupPreference) {
    if (locale === "ja") {
      if (option === "guide") return "ガイドページ";
      if (option === "selection_cache") return "🎯 Candidates";
      return "前回のページ";
    }

    if (locale === "en") {
      if (option === "guide") return "Guide Page";
      if (option === "selection_cache") return "🎯 Candidates";
      return "Last Visited Page";
    }

    if (option === "guide") return "說明頁";
    if (option === "selection_cache") return "🎯 Candidates 任務控制中心";
    return "上次停留頁面";
  }

  const startupDescription =
    locale === "ja"
      ? "URL で開いた場合は URL の遷移が優先されます。"
      : locale === "en"
        ? "If opened from a URL action, URL navigation still takes priority."
        : "若由 iPhone Shortcut 或 URL action 開啟，仍會優先執行該導頁。";

  return (
    <>
      <section className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-xl font-bold text-gray-800 mb-2">📘 {tHere("說明頁")}</h2>
          <div>version: {import.meta.env.__APP_VERSION__}</div>
          {(import.meta.env.DEV || ["AndroidWebView"].includes(deviceType)) && (
            <div className="text-gray-700 leading-relaxed">
              [Android WebView] version: {androidWebViewVersion}
            </div>
          )}
          <GuidePageIntro locale={locale} />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setShowTutorial(true)}
              className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              {tHere("查看首次教學輪播")}
            </button>
            <p className="text-sm text-gray-500">
              {tHere("可隨時重新打開首頁的新手教學，之後逐頁補上動畫時也會從這裡進入。")}
            </p>
          </div>
        </div>

        <GuideNotification />

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {locale === "ja"
              ? "🏁 起動時の表示ページ"
              : locale === "en"
                ? "🏁 Startup Default Page"
                : "🏁 啟動預設頁面"}
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            {locale === "ja"
              ? "アプリを開いたとき、または更新後に最初に表示するページを選択します。"
              : locale === "en"
                ? "Choose which page opens first when you launch or refresh the app."
                : "設定每次打開 App 或重新整理後，最先顯示的頁面。"}
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {(
              [
                "guide",
                "selection_cache",
                "last_visited",
              ] as StartupPreference[]
            ).map((option) => {
              const active = startupPreference === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStartupPreference(option)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "border-sky-600 bg-sky-50 text-sky-700"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  aria-pressed={active}
                >
                  {getStartupOptionLabel(option)}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-gray-500">{startupDescription}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                🎬 {tHere("介紹影片與使用案例")}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {tHere("先看概念影片快速上手，後續會在這裡持續增加各種情境的實戰案例。")}
              </p>
            </div>
            <a
              href="https://www.youtube.com/@young-chunghsue4363"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-sm font-medium text-red-600 hover:underline"
            >
              {tHere("前往 YouTube 頻道")}
            </a>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {VIDEO_RESOURCES(locale).filter((video) =>
              isVideoForCurrentLocale(video),
            ).map((video) => (
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
                <h4 className="text-base font-semibold text-gray-900 leading-snug">
                  {video.title}
                </h4>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed flex-1">
                  {video.description}
                </p>
                <a
                  href={video.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  {tHere("觀看影片")}
                </a>
              </article>
            ))}
          </div>

          {/* <div className="mt-4 rounded-md border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-700">
            <p className="font-medium text-gray-800">
              接下來預計補上的案例方向
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>實際操作如何設定自己的Google Sheets 同步</li>
              <li>如何透過Task Pool 戒除不想要的習慣</li>
              <li>如何透過 Scheduled 提醒自己定時做某件事，比如早晚的養生操</li>
            </ul>
          </div> */}
        </div>

        <GuideHowToUse />

        <GuideDataImportAndExport />

        <GuideSyncExplanation />

        {(isIOS || import.meta.env.DEV) && (
          <div
            className="bg-white border border-gray-200 rounded-lg p-5"
            data-tour="iphone-shortcuts"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              📱 {tHere("iOS Shortcuts 安裝")}
            </h3>
            <div className="space-y-3">
              {SHORTCUTS(locale).map((shortcut) => (
                <div
                  key={shortcut.name}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-gray-100 rounded-md p-3"
                >
                  <div>
                    <p className="font-medium text-gray-800">{shortcut.name}</p>
                    <p className="text-sm text-gray-600">{shortcut.purpose}</p>
                    {shortcut.api && (
                      <a
                        href={"/" + shortcut.api}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {tHere("API 範例")}
                      </a>
                    )}
                  </div>
                  <a
                    href={shortcut.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                  >
                    {tHere("安裝 Shortcut")}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        <GuideProgress />

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            {locale === "ja"
              ? "⚖️ 法律 & プライバシー"
              : locale === "en"
                ? "⚖️ Legal & Privacy"
                : "⚖️ 法律 & 隱私"}
          </h3>
          <p className="text-sm text-gray-700 mb-4">
            {locale === "ja"
              ? "NonBlockingLife のプライバシーポリシーと利用規約をご確認ください。"
              : locale === "en"
                ? "Review our privacy policy and terms of service."
                : "查看我們的隱私權政策和使用條款。"}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={
                locale === "zh-TW"
                  ? "/NonBlockingLife/privacy-policy-zh-TW.html"
                  : "/NonBlockingLife/privacy-policy-en.html"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-700 text-white text-sm font-medium hover:bg-gray-800"
            >
              {locale === "ja"
                ? "プライバシーポリシー"
                : locale === "en"
                  ? "Privacy Policy"
                  : "隱私權政策"}
            </a>
            <a
              href={
                locale === "zh-TW"
                  ? "/NonBlockingLife/terms-zh-TW.html"
                  : "/NonBlockingLife/terms-en.html"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-800"
            >
              {locale === "ja"
                ? "利用規約"
                : locale === "en"
                  ? "Terms of Service"
                  : "使用條款"}
            </a>
            <a
              href="https://ychsue.github.io/superconductorlike_society/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
            >
              {locale === "ja"
                ? "超電導のような社会"
                : locale === "en"
                  ? "Superconductor-like Society"
                  : "Superconductor-like Society"}
            </a>
          </div>
        </div>
      </section>

      {showTutorial && (
        <TutorialCarousel
          onClose={handleCloseTutorial}
          onOpenTaskPool={() => handleOpenTutorialSheet("task_pool")}
          onOpenScheduled={() => handleOpenTutorialSheet("scheduled")}
        />
      )}
    </>
  );
}
