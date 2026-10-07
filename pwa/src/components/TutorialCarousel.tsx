import { useEffect, useRef, useState } from "react";
import { PageFiveGoogleSheetsSync } from "./carousel/PageFiveGoogleSheetsSync";
import { PageOneMainlineInterrupt } from "./carousel/PageOneMainlineInterrupt";
import { PageFourFocusRhythm } from "./carousel/PageFourFocusRhythm";
import { PageSixFirstSetup } from "./carousel/PageSixFirstSetup";
import { PageThreeTaskControlCenter } from "./carousel/PageThreeTaskControlCenter";
import { PageTwoBackToMainline } from "./carousel/PageTwoBackToMainline";
import { useAppStore } from "../store/appStore";
import "./tutorial-carousel.css";
import { useTWithMaps } from "../i18n";

interface TutorialCarouselProps {
  onClose: () => void;
  onOpenTaskPool: () => void;
  onOpenScheduled: () => void;
}

interface TutorialSlide {
  eyebrow: string;
  title: string;
  description: string;
  helper?: string;
  visual: {
    label: string;
    accent: string;
    scene: string[];
  };
}

const SLIDES_zhTW: TutorialSlide[] = [
  {
    eyebrow: "頁 1",
    title: "忙了一整天，卻總覺得主線一直被打斷？",
    description:
      "很多時間不是沒做事，而是被電話、雜事、臨時念頭與娛樂切碎，最後回頭看，真正重要的事並沒有往前推進。",
    helper:
      "第一版先用 SVG 與 CSS 做出主線被電話打斷、一路分流到混亂終點的 MVP 動畫。",
    visual: {
      label: "主線被打斷",
      accent: "from-amber-100 via-white to-rose-100",
      scene: ["🟨━━━━━━🏁", "⏰  ☎️", "🧍 ↘ 📺 🍿 🎮 📦"],
    },
  },
  {
    eyebrow: "頁 2",
    title: "這是一個幫助你回到人生主線的 App",
    description:
      "Non-Blocking Life 把日常任務整理成可持續推進的主線，不靠一時衝刺，而是讓自律變成自然。",
    visual: {
      label: "回到主線",
      accent: "from-sky-100 via-white to-emerald-100",
      scene: ["🌱", "🛤️ ➜ 🎯", "一步一步回到主線"],
    },
  },
  {
    eyebrow: "頁 3",
    title: "這是一個幫你收集、推薦與分流的輕量任務中控中心",
    description:
      "系統先提出當下適合做的候選項，突發想法則先安全收進 inbox，之後再集中整理到 tasks、resources 或繼續留在 inbox。",
    helper: "第三頁先做 Query 推薦、Inbox 收集、每日分流三段式的控制台 MVP。",
    visual: {
      label: "中控中心",
      accent: "from-cyan-50 via-white to-amber-100",
      scene: ["Query", "Inbox", "Daily Route"],
    },
  },
  {
    eyebrow: "頁 4",
    title: "開始任務後進入專注，結束後自然切到休息",
    description:
      "你只要開始與結束，系統就能把 30 分鐘專注與 10 分鐘休息接起來，減少每次重新決定下一步的摩擦。",
    helper: "第四頁先做 Start、Focus 30、End、Rest 10 的節奏切換 MVP。",
    visual: {
      label: "專注節奏",
      accent: "from-amber-50 via-white to-orange-100",
      scene: ["▶ Start", "30 min Focus", "10 min Rest"],
    },
  },
  {
    eyebrow: "頁 5",
    title: "資料可以同步到你自己的 Google Sheets，更安心也更可攜",
    description:
      "資料不會被鎖在 App 裡。你可以同步到自己的 Google Sheets，方便備份、跨裝置延續，以及之後自行分析。",
    helper:
      "第五頁先做本地資料、同步橋接、自己的 Google Sheet 三段式安心感 MVP。",
    visual: {
      label: "同步與安心感",
      accent: "from-emerald-50 via-white to-lime-100",
      scene: ["Local Data", "Sync Bridge", "Your Google Sheet"],
    },
  },
  {
    eyebrow: "頁 6",
    title: "開始前，先在 Task Pool 與 Scheduled 各新增一筆資料",
    description:
      "完成這兩步後，這個首頁教學就不會再自動跳出。先建立你的主線任務與排程，再正式開始使用。",
    helper:
      "第六頁先做 Task Pool、Scheduled、Ready to Start 的收尾與引導 MVP。",
    visual: {
      label: "先放進主線",
      accent: "from-blue-100 via-white to-indigo-100",
      scene: ["1. 📋 新增 Task Pool", "2. 🗓️ 新增 Scheduled", "3. 開始使用"],
    },
  },
];
const SLIDES_en: typeof SLIDES_zhTW = [
  {
    eyebrow: "Page 1",
    title: "Do not let distractions break your main line",
    description:
      "Many times it's not that you haven't done anything, but that your main line of tasks gets fragmented by phone calls, miscellaneous matters, sudden thoughts, and entertainment. In the end, when you look back, the truly important things haven't progressed.",
    helper:
      "The first version uses SVG and CSS to create an MVP animation showing the main line being interrupted by phone calls and eventually diverging into a chaotic end.",
    visual: {
      label: "The Main Line was Interrupted",
      accent: "from-amber-100 via-white to-rose-100",
      scene: ["🟨━━━━━━🏁", "⏰  ☎️", "🧍 ↘ 📺 🍿 🎮 📦"],
    },
  },
  {
    eyebrow: "Page 2",
    title: "This is an App that helps you get back to the main line of life",
    description:
      "Non-Blocking Life organizes your daily tasks into a main line that can be continuously advanced, without relying on temporary sprints, making self-discipline natural.",
    visual: {
      label: "Back to the Main Line",
      accent: "from-sky-100 via-white to-emerald-100",
      scene: ["🌱", "🛤️ ➜ 🎯", "Step by step back to the main line"],
    },
  },
  {
    eyebrow: "Page 3",
    title:
      "This is a lightweight task control center that helps you collect, recommend, and route tasks",
    description:
      "The system first presents suitable candidates for the current moment, while sudden ideas are safely collected in the inbox, and later organized into tasks, resources, or remain in the inbox.",
    helper:
      "The third page first implements the three-stage control panel MVP: Query recommendation, Inbox collection, and Daily routing.",
    visual: {
      label: "Control Center",
      accent: "from-cyan-50 via-white to-amber-100",
      scene: ["Query", "Inbox", "Daily Route"],
    },
  },
  {
    eyebrow: "Page 4",
    title:
      "Enter focus after starting a task, and naturally switch to rest after finishing",
    description:
      "As long as you start and finish, the system can connect 30 minutes of focus with 10 minutes of rest, reducing the friction of deciding the next step each time.",
    helper:
      "The fourth page first implements the rhythm switching MVP: Start, Focus 30, End, Rest 10.",
    visual: {
      label: "Focus Rhythm",
      accent: "from-amber-50 via-white to-orange-100",
      scene: ["▶ Start", "30 min Focus", "10 min Rest"],
    },
  },
  {
    eyebrow: "Page 5",
    title:
      "Data can be synchronized to your own Google Sheets, making it more secure and portable",
    description:
      "Data will not be locked in the App. You can synchronize it to your own Google Sheets for easy backup, cross-device continuation, and later self-analysis.",
    helper:
      "The fifth page first implements the three-stage security MVP: Local Data, Sync Bridge, and Your Google Sheet.",
    visual: {
      label: "Synchronization and Security",
      accent: "from-emerald-50 via-white to-lime-100",
      scene: ["Local Data", "Sync Bridge", "Your Google Sheet"],
    },
  },
  {
    eyebrow: "Page 6",
    title: "Before starting, add an entry to both the Task Pool and Scheduled",
    description:
      "After completing these two steps, this homepage tutorial will no longer pop up automatically. First, establish your main line tasks and schedule, then officially start using the app.",
    helper:
      "The sixth page first implements the closing and guidance MVP for Task Pool, Scheduled, and Ready to Start.",
    visual: {
      label: "Add to Main Line First",
      accent: "from-blue-100 via-white to-indigo-100",
      scene: ["1. 📋 Add Task Pool", "2. 🗓️ Add Scheduled", "3. Start Using"],
    },
  },
];
const SLIDES_ja: typeof SLIDES_zhTW = [
  {
    eyebrow: "ページ1",
    title: "気を散らすものに主線を壊させない",
    description:
      "多くの場合、何もしていないわけではなく、電話、雑事、突然の思いつき、娯楽によってタスクの主線が断片化されてしまうのです。結局、振り返ってみると、本当に重要なことは進んでいません。",
    helper:
      "最初のバージョンでは、SVGとCSSを使用して、電話によって主線が中断され、最終的に混沌とした結末に分岐するMVPアニメーションを作成しています。",
    visual: {
      label: "主線が中断されました",
      accent: "from-amber-100 via-white to-rose-100",
      scene: ["🟨━━━━━━🏁", "⏰  ☎️", "🧍 ↘ 📺 🍿 🎮 📦"],
    },
  },
  {
    eyebrow: "ページ2",
    title: "生活の主線に戻るのを助けるアプリです",
    description:
      "Non-Blocking Lifeは、日々のタスクを一時的なスプリントに頼らずに進められるメインラインに整理してくれるから、自然と自分を律することができる",
    visual: {
      label: "Back to the Main Line",
      accent: "from-sky-100 via-white to-emerald-100",
      scene: ["🌱", "🛤️ ➜ 🎯", "少しずつ本線に戻ろう"],
    },
  },
  {
    eyebrow: "ページ3",
    title:
      "タスクを収集、推薦、ルーティングするのを助ける軽量タスク管理センターです",
    description:
      "システムはまず、現在の瞬間に適した候補を提示し、突然の思いつきは安全に受信箱に収集され、後でタスク、リソースに整理されるか、受信箱に残ります。",
    helper:
      "三番目のページでは、まず三段階のコントロールパネルMVPを実装します：クエリ推薦、受信箱収集、日次ルーティング。",
    visual: {
      label: "コントロールセンター",
      accent: "from-cyan-50 via-white to-amber-100",
      scene: ["クエリ", "受信箱", "日次ルート"],
    },
  },
  {
    eyebrow: "ページ4",
    title: "タスク開始後に集中し、終了後に自然に休憩に切り替える",
    description:
      "一度開始して終了すれば、システムは30分の集中と10分の休憩をつなげることができ、次のステップを決める際の摩擦を減らします。",
    helper:
      "四番目のページでは、まずリズム切り替えMVPを実装します：開始、集中30、終了、休憩10。",
    visual: {
      label: "集中リズム",
      accent: "from-amber-50 via-white to-orange-100",
      scene: ["▶ 開始", "集中30分", "休憩10分"],
    },
  },
  {
    eyebrow: "ページ5",
    title:
      "データは自分のGoogleスプレッドシートに同期でき、より安全で持ち運び可能です",
    description:
      "データはアプリにロックされることはありません。自分のGoogleスプレッドシートに同期することで、簡単にバックアップでき、デバイス間での継続利用や後での自己分析が可能です。",
    helper:
      "五番目のページでは、まず三段階のセキュリティMVPを実装します：ローカルデータ、同期ブリッジ、あなたのGoogleスプレッドシート。",
    visual: {
      label: "同期とセキュリティ",
      accent: "from-emerald-50 via-white to-lime-100",
      scene: [
        "ローカルデータ",
        "同期ブリッジ",
        "あなたのGoogleスプレッドシート",
      ],
    },
  },
  {
    eyebrow: "ページ6",
    title: "開始前に、タスクプールと予定の両方にエントリを追加してください",
    description:
      "この2つのステップを完了すると、このホームページのチュートリアルは自動的に表示されなくなります。まず、主線のタスクと予定を確立し、その後正式にアプリを使用開始します。",
    helper:
      "六番目のページでは、まずタスクプール、予定、開始準備済みのクロージングとガイダンスMVPを実装します。",
    visual: {
      label: "まず主線に追加",
      accent: "from-blue-100 via-white to-indigo-100",
      scene: ["1. 📋 タスクプールに追加", "2. 🗓️ 予定に追加", "3. 使用開始"],
    },
  },
];

export function TutorialCarousel({
  onClose,
  onOpenTaskPool,
  onOpenScheduled,
}: TutorialCarouselProps) {
  const locale = useAppStore((state) => state.locale);
  const [SLIDES, setSLIDES] = useState(
    locale === "zh-TW" ? SLIDES_zhTW : locale === "ja" ? SLIDES_ja : SLIDES_en,
  );
  const [index, setIndex] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<
    "forward" | "backward"
  >("forward");
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const tHere = useTWithMaps({
    "zh-TW": {
      "Non-Blocking Life 入門": "Non-Blocking Life 入門",
      "首次使用教學": "首次使用教學",
      "收起": "收起",
      "第一頁已先做成 SVG + CSS MVP，後面頁面再依序補上動畫。": "第一頁已先做成 SVG + CSS MVP，後面頁面再依序補上動畫。",
      "第二頁先做成兩次打岔再回到主線的 MVP，後續可以再加到三次循環。": "第二頁先做成兩次打岔再回到主線的 MVP，後續可以再加到三次循環。",
      "第三頁先做成 Query 推薦、Inbox 收集、每日分流的中控中心 MVP。": "第三頁先做成 Query 推薦、Inbox 收集、每日分流的中控中心 MVP。",
      "第四頁先做成開始、專注、結束、休息的節奏切換 MVP。": "第四頁先做成開始、專注、結束、休息的節奏切換 MVP。",
      "第五頁先做成本地資料、同步橋接、自己的 Google Sheet 的安心感 MVP。": "第五頁先做成本地資料、同步橋接、自己的 Google Sheet 的安心感 MVP。",
      "第六頁先做成 Task Pool、Scheduled、Ready to Start 的收尾與引導 MVP。": "第六頁先做成 Task Pool、Scheduled、Ready to Start 的收尾與引導 MVP。",
      "這一格會在下一階段逐頁補上 SVG 與 CSS 動畫。": "這一格會在下一階段逐頁補上 SVG 與 CSS 動畫。",
      "前往 Task Pool": "前往 Task Pool",
      "前往 Scheduled": "前往 Scheduled",
      "上一頁": "上一頁",
      "下一頁": "下一頁",
      "開始使用": "開始使用",
    },
    ja: {
      "Non-Blocking Life 入門": "Non-Blocking Life 入門",
      "首次使用教學": "初回使用チュートリアル",
      "收起": "閉じる",
      "第一頁已先做成 SVG + CSS MVP，後面頁面再依序補上動畫。": "第一ページはまず SVG + CSS MVP を作成し、後のページで順次アニメーションを追加します。",
      "第二頁先做成兩次打岔再回到主線的 MVP，後續可以再加到三次循環。": "第二ページはまず二回の中断を経て主線に戻る MVP を作成し、後で三回のサイクルに拡張できます。",
      "第三頁先做成 Query 推薦、Inbox 收集、每日分流的中控中心 MVP。": "第三ページはまずクエリ推薦、Inbox 収集、毎日の分流の中枢 MVP を作成します。",
      "第四頁先做成開始、專注、結束、休息的節奏切換 MVP。": "第四ページはまず開始、集中、終了、休憩のリズム切り替え MVP を作成します。",
      "第五頁先做成本地資料、同步橋接、自己的 Google Sheet 的安心感 MVP。": "第五ページはまずローカルデータ、同期ブリッジ、自己の Google スプレッドシートの安心感 MVP を作成します。",
      "第六頁先做成 Task Pool、Scheduled、Ready to Start 的收尾與引導 MVP。": "第六ページはまずタスクプール、予定、開始準備済みのクロージングとガイダンス MVP を作成します。",
      "這一格會在下一階段逐頁補上 SVG 與 CSS 動畫。": "このページは次の段階で順次 SVG と CSS アニメーションを追加します。",
      "前往 Task Pool": "タスクプールへ",
      "前往 Scheduled": "予定へ",
      "上一頁": "前のページ",
      "下一頁": "次のページ",
      "開始使用": "使用開始",
    },
    en: {
      "Non-Blocking Life 入門": "Non-Blocking Life Introduction",
      "首次使用教學": "First Use Tutorial",
      "收起": "Close",
      "第一頁已先做成 SVG + CSS MVP，後面頁面再依序補上動畫。": "The first page is initially created as an SVG + CSS MVP, and animations will be added to subsequent pages in order.",
      "第二頁先做成兩次打岔再回到主線的 MVP，後續可以再加到三次循環。": "The second page is initially created as an MVP with two interruptions before returning to the mainline, and can later be extended to three cycles.",
      "第三頁先做成 Query 推薦、Inbox 收集、每日分流的中控中心 MVP。": "The third page is initially created as a central control MVP for query recommendations, inbox collection, and daily distribution.",
      "第四頁先做成開始、專注、結束、休息的節奏切換 MVP。": "The fourth page is initially created as an MVP for rhythm switching between start, focus, end, and rest.",
      "第五頁先做成本地資料、同步橋接、自己的 Google Sheet 的安心感 MVP。": "The fifth page is initially created as an MVP for local data, synchronization bridge, and the peace of mind of using one's own Google Sheet.",
      "第六頁先做成 Task Pool、Scheduled、Ready to Start 的收尾與引導 MVP。": "The sixth page is initially created as an MVP for closing and guiding Task Pool, Scheduled, and Ready to Start.",
      "這一格會在下一階段逐頁補上 SVG 與 CSS 動畫。": "This section will have SVG and CSS animations added page by page in the next stage.",
      "前往 Task Pool": "Go to Task Pool",
      "前往 Scheduled": "Go to Scheduled",
      "上一頁": "Previous Page",
      "下一頁": "Next Page",
      "開始使用": "Get Started",
    },
  });

  useEffect(() => {
    if (locale === "zh-TW") {
      setSLIDES(SLIDES_zhTW);
    } else if (locale === "ja") {
      setSLIDES(SLIDES_ja);
    } else {
      setSLIDES(SLIDES_en);
    }
  }, [locale]);

  const slide = SLIDES[index];
  const isLastSlide = index === SLIDES.length - 1;
  const isSetupSlide = index === 5;

  const goToSlide = (nextIndex: number) => {
    if (nextIndex === index) {
      return;
    }

    setTransitionDirection(nextIndex > index ? "forward" : "backward");
    setIndex(nextIndex);
  };

  const goToPrevious = () => {
    goToSlide(Math.max(0, index - 1));
  };

  const goToNext = () => {
    if (isLastSlide) {
      onClose();
      return;
    }

    goToSlide(Math.min(SLIDES.length - 1, index + 1));
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.changedTouches[0];
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (startX == null || startY == null) {
      return;
    }

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < 48 || absX <= absY * 1.2) {
      return;
    }

    if (deltaX < 0) {
      goToNext();
      return;
    }

    goToPrevious();
  };

  const renderVisual = () => {
    if (index === 0) {
      return <PageOneMainlineInterrupt />;
    }

    if (index === 1) {
      return <PageTwoBackToMainline />;
    }

    if (index === 2) {
      return <PageThreeTaskControlCenter />;
    }

    if (index === 3) {
      return <PageFourFocusRhythm />;
    }

    if (index === 4) {
      return <PageFiveGoogleSheetsSync />;
    }

    if (index === 5) {
      return <PageSixFirstSetup />;
    }

    return (
      <div className="space-y-4 text-center">
        {slide.visual.scene.map((line) => (
          <div
            key={line}
            className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-lg font-semibold shadow-sm sm:text-2xl"
          >
            {line}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
        <section
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex max-h-[96vh] w-full max-w-6xl touch-pan-y flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                {tHere("Non-Blocking Life 入門")}
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
                {tHere("首次使用教學")}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              {tHere("收起")}
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-center">
              <div
                className={`relative aspect-square overflow-hidden rounded-[28px] border border-slate-200 bg-linear-to-br ${slide.visual.accent} p-6 shadow-inner sm:p-8`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.92),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.7),transparent_34%)]" />
                <div
                  key={`visual-${index}`}
                  className={`tutorial-carousel-enter tutorial-carousel-enter-${transitionDirection} relative flex h-full flex-col justify-between rounded-[22px] border border-white/70 bg-white/70 p-5 text-slate-800 shadow-lg backdrop-blur-sm sm:p-6`}
                >
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {slide.visual.label}
                    </p>
                  </div>
                  {renderVisual()}
                  {import.meta.env.DEV && (
                    <p className="text-center text-xs text-slate-500 sm:text-sm">
                      {index === 0
                        ? (tHere("第一頁已先做成 SVG + CSS MVP，後面頁面再依序補上動畫。"))
                        : index === 1
                          ? tHere("第二頁先做成兩次打岔再回到主線的 MVP，後續可以再加到三次循環。")
                          : index === 2
                            ? tHere("第三頁先做成 Query 推薦、Inbox 收集、每日分流的中控中心 MVP。")
                            : index === 3
                              ? tHere("第四頁先做成開始、專注、結束、休息的節奏切換 MVP。")
                              : index === 4
                                ? tHere("第五頁先做成本地資料、同步橋接、自己的 Google Sheet 的安心感 MVP。")
                                : index === 5
                                  ? tHere("第六頁先做成 Task Pool、Scheduled、Ready to Start 的收尾與引導 MVP。")
                                  : tHere("這一格會在下一階段逐頁補上 SVG 與 CSS 動畫。")}
                    </p>
                  )}
                </div>
              </div>

              <div
                key={`text-${index}`}
                className={`tutorial-carousel-enter tutorial-carousel-text-enter tutorial-carousel-enter-${transitionDirection} flex flex-col justify-center`}
              >
                <p className="text-sm font-semibold text-sky-700">
                  {slide.eyebrow}
                </p>
                <h3 className="mt-2 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
                  {slide.title}
                </h3>
                <p className="mt-4 text-base leading-8 text-slate-700 sm:text-lg">
                  {slide.description}
                </p>
                {slide.helper && import.meta.env.DEV && (
                  <p className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-7 text-sky-900">
                    {slide.helper}
                  </p>
                )}

                {isSetupSlide && (
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={onOpenTaskPool}
                      className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      {tHere("前往 Task Pool")}
                    </button>
                    <button
                      type="button"
                      onClick={onOpenScheduled}
                      className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      {tHere("前往 Scheduled")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <footer className="border-t border-slate-200 px-5 py-4 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {SLIDES.map((item, slideIndex) => (
                  <button
                    key={item.title}
                    type="button"
                    aria-label={`前往${item.eyebrow}`}
                    onClick={() => goToSlide(slideIndex)}
                    className={`h-2.5 rounded-full transition ${
                      slideIndex === index
                        ? "w-8 bg-slate-900"
                        : "w-2.5 bg-slate-300 hover:bg-slate-400"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={goToPrevious}
                  disabled={index === 0}
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {tHere("上一頁")}
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
                >
                  {isLastSlide ? tHere("開始使用") : tHere("下一頁")}
                </button>
              </div>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
