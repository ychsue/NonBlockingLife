import { useRef, useState } from "react";
import { PageFiveGoogleSheetsSync } from "./carousel/PageFiveGoogleSheetsSync";
import { PageOneMainlineInterrupt } from "./carousel/PageOneMainlineInterrupt";
import { PageFourFocusRhythm } from "./carousel/PageFourFocusRhythm";
import { PageSixFirstSetup } from "./carousel/PageSixFirstSetup";
import { PageThreeTaskControlCenter } from "./carousel/PageThreeTaskControlCenter";
import { PageTwoBackToMainline } from "./carousel/PageTwoBackToMainline";
import "./tutorial-carousel.css";

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

const SLIDES: TutorialSlide[] = [
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

export function TutorialCarousel({
  onClose,
  onOpenTaskPool,
  onOpenScheduled,
}: TutorialCarouselProps) {
  const [index, setIndex] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<
    "forward" | "backward"
  >("forward");
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
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
                Non-Blocking Life 入門
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
                首次使用教學
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              收起
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-center">
              <div
                className={`relative aspect-square overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br ${slide.visual.accent} p-6 shadow-inner sm:p-8`}
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
                        ? "第一頁已先做成 SVG + CSS MVP，後面頁面再依序補上動畫。"
                        : index === 1
                          ? "第二頁先做成兩次打岔再回到主線的 MVP，後續可以再加到三次循環。"
                          : index === 2
                            ? "第三頁先做成 Query 推薦、Inbox 收集、每日分流的中控中心 MVP。"
                            : index === 3
                              ? "第四頁先做成開始、專注、結束、休息的節奏切換 MVP。"
                              : index === 4
                                ? "第五頁先做成本地資料、同步橋接、自己的 Google Sheet 的安心感 MVP。"
                                : index === 5
                                  ? "第六頁先做成 Task Pool、Scheduled、Ready to Start 的收尾與引導 MVP。"
                                  : "這一格會在下一階段逐頁補上 SVG 與 CSS 動畫。"}
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
                      前往 Task Pool
                    </button>
                    <button
                      type="button"
                      onClick={onOpenScheduled}
                      className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      前往 Scheduled
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
                  上一頁
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
                >
                  {isLastSlide ? "開始使用" : "下一頁"}
                </button>
              </div>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
