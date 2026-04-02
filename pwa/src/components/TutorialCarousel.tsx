import { useRef, useState } from "react";

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
    helper: "之後這一頁會補上主線被打岔的 SVG 敘事動畫。",
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
    title: "搭配 iPhone 捷徑與番茄鐘，讓專注有節奏",
    description:
      "開始任務時計時 30 分鐘，結束後切到 10 分鐘休息。你只要開始與結束，節奏交給系統處理。",
    visual: {
      label: "專注節奏",
      accent: "from-amber-50 via-white to-orange-100",
      scene: ["📱 + ⏱️", "30 min Focus", "10 min Rest"],
    },
  },
  {
    eyebrow: "頁 4",
    title: "想法、任務、微任務、排程與中斷都集中在這裡",
    description:
      "你不需要在多個 App 之間來回切換，收集、安排、開始、被打斷、重新回到主線，都在同一套流程。",
    visual: {
      label: "集中管理",
      accent: "from-fuchsia-100 via-white to-blue-100",
      scene: ["📥 Inbox", "📋 Task Pool  ·  🗓️ Scheduled", "⚡ Interrupt  ·  ✅ Micro Tasks"],
    },
  },
  {
    eyebrow: "頁 5",
    title: "多看任務清單，就更容易回到當下該做的事",
    description:
      "一頁條列你現在該處理的事，減少猶豫與分心，看到清單就能重新對齊今天的主線。",
    visual: {
      label: "當下清單",
      accent: "from-emerald-100 via-white to-cyan-100",
      scene: ["☑️ 先做什麼", "☑️ 接著做什麼", "☑️ 現在不要做什麼"],
    },
  },
  {
    eyebrow: "頁 6",
    title: "每個動作都會寫進 Log，方便日後回顧",
    description:
      "開始、結束、中斷與切換都能留下紀錄，未來不只是查詢，也能拿來分析自己的節奏與盲點。",
    visual: {
      label: "可追蹤紀錄",
      accent: "from-slate-100 via-white to-zinc-100",
      scene: ["🧾 Start", "🧾 End", "🧾 Interrupt · Review"],
    },
  },
  {
    eyebrow: "頁 7",
    title: "你可以同步到自己的 Google Sheets",
    description:
      "資料可備份、跨裝置同步，也能直接用 Sheets、AI 或其他工具分析自己的 Log 與工作節奏。",
    visual: {
      label: "同步與備份",
      accent: "from-green-100 via-white to-lime-100",
      scene: ["💻 Local-first", "☁️ Sync to Sheets", "📊 Analyze your logs"],
    },
  },
  {
    eyebrow: "頁 8",
    title: "開始前，先在 Task Pool 與 Scheduled 各新增一筆資料",
    description:
      "只要兩個表都不是空的，這個首頁教學就不會再自動跳出。先建立你近期要推進的主線與排程。",
    helper: "這一版先提供快速跳轉，之後可以再加上更明確的引導動畫。",
    visual: {
      label: "先放進主線",
      accent: "from-blue-100 via-white to-indigo-100",
      scene: ["1. 📋 新增 Task Pool", "2. 🗓️ 新增 Scheduled", "3. 開始使用"],
    },
  },
  {
    eyebrow: "頁 9",
    title: "這是 open source 專案，歡迎一起參與開發",
    description:
      "如果這套方法對你有幫助，你也可以一起改進流程、文件、同步、UI 與分析功能。",
    visual: {
      label: "開放協作",
      accent: "from-orange-100 via-white to-pink-100",
      scene: ["🛠️ Improve", "🧠 Discuss", "🌍 Share"],
    },
  },
];

export function TutorialCarousel({
  onClose,
  onOpenTaskPool,
  onOpenScheduled,
}: TutorialCarouselProps) {
  const [index, setIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const slide = SLIDES[index];
  const isLastSlide = index === SLIDES.length - 1;
  const isSetupSlide = index === 7;

  const goToPrevious = () => {
    setIndex((current) => Math.max(0, current - 1));
  };

  const goToNext = () => {
    if (isLastSlide) {
      onClose();
      return;
    }

    setIndex((current) => Math.min(SLIDES.length - 1, current + 1));
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
              <div className={`relative aspect-square overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br ${slide.visual.accent} p-6 shadow-inner sm:p-8`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.92),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.7),transparent_34%)]" />
                <div className="relative flex h-full flex-col justify-between rounded-[22px] border border-white/70 bg-white/70 p-5 text-slate-800 shadow-lg backdrop-blur-sm sm:p-6">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {slide.visual.label}
                    </p>
                  </div>
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
                  <p className="text-center text-xs text-slate-500 sm:text-sm">
                    這一格會在下一階段逐頁補上 SVG 與 CSS 動畫。
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <p className="text-sm font-semibold text-sky-700">{slide.eyebrow}</p>
                <h3 className="mt-2 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
                  {slide.title}
                </h3>
                <p className="mt-4 text-base leading-8 text-slate-700 sm:text-lg">
                  {slide.description}
                </p>
                {slide.helper && (
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
                    onClick={() => setIndex(slideIndex)}
                    className={`h-2.5 rounded-full transition ${
                      slideIndex === index ? "w-8 bg-slate-900" : "w-2.5 bg-slate-300 hover:bg-slate-400"
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