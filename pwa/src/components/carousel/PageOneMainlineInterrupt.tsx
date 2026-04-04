import "./page-one-mainline-interrupt.css";

const DISTRACTIONS = [
  { emoji: "💬", left: "62%", top: "73%", delay: "4.15s" },
  { emoji: "📺", left: "68%", top: "76%", delay: "4.4s" },
  { emoji: "🍿", left: "74%", top: "72%", delay: "4.65s" },
  { emoji: "📦", left: "80%", top: "76%", delay: "4.9s" },
];

export function PageOneMainlineInterrupt() {
  return (
    <div className="carousel-page-one-stage relative flex-1 overflow-hidden rounded-2xl border border-white/75 bg-white/55 px-3 py-4 shadow-inner sm:px-4 sm:py-5">
      <svg
        viewBox="0 0 1000 1000"
        className="carousel-page-one-svg absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="carousel-page-one-arrow-clip">
            <polygon points="110,300 800,300 800,255 870,330 800,405 800,370 110,370" />
          </clipPath>
        </defs>

        <g className="carousel-page-one-mainline">
          <polygon
            points="110,300 800,300 800,255 870,335 800,415 800,370 110,370"
            fill="none"
            stroke="#6b7280"
            strokeWidth="12"
            strokeLinejoin="miter"
          />
        </g>

        <g clipPath="url(#carousel-page-one-arrow-clip)">
          <rect
            x="110"
            y="300"
            width="382"
            height="205"
            fill="#facc15"
            className="carousel-page-one-progress"
          />
        </g>

        <g className="carousel-page-one-clock-base">
          <circle cx="325" cy="170" r="78" fill="#fff7ed" stroke="#cbd5e1" strokeWidth="12" />
          <circle cx="325" cy="170" r="56" fill="#ffffff" opacity="0.95" />
          <circle
            cx="325"
            cy="170"
            r="58"
            fill="none"
            stroke="#facc15"
            strokeWidth="28"
            pathLength="100"
            className="carousel-page-one-clock-yellow"
          />
          <circle
            cx="325"
            cy="170"
            r="58"
            fill="none"
            stroke="#f97316"
            strokeWidth="28"
            pathLength="100"
            className="carousel-page-one-clock-red"
          />
          <circle cx="325" cy="170" r="6" fill="#475569" />
          <line x1="325" y1="170" x2="325" y2="122" stroke="#475569" strokeWidth="8" />
          <line x1="325" y1="170" x2="362" y2="194" stroke="#475569" strokeWidth="8" />
        </g>

        <g className="carousel-page-one-flag">
          <line x1="918" y1="210" x2="918" y2="316" stroke="#6b7280" strokeWidth="10" />
          <path d="M918 216L980 238L918 262Z" fill="#94a3b8" />
        </g>

        <path
          d="M480 370V652"
          fill="none"
          stroke="#f5bf31"
          strokeWidth="22"
          pathLength="1"
          className="carousel-page-one-branch-down"
        />

        <path
          d="M470 652C610 660 715 700 884 742"
          fill="none"
          stroke="#f5bf31"
          strokeWidth="22"
          pathLength="1"
          className="carousel-page-one-branch-chaos"
        />

        <g transform="translate(878 680) scale(2)">
          <g className="carousel-page-one-chaos-mark">
            <path
              d="M8 22C10 8 28 4 38 14C48 24 42 38 28 40C15 42 10 30 18 22C28 12 46 16 50 30C54 46 40 58 24 56C8 54 4 38 12 28C22 14 44 10 58 20C70 30 68 50 54 60C40 70 18 68 10 52C2 36 12 18 30 14C46 10 62 18 66 34C70 50 60 66 42 70C24 74 10 66 8 50C6 34 20 22 34 24C48 26 58 38 56 50C54 62 42 68 30 64C18 60 18 46 28 42C38 38 48 44 50 54"
              fill="none"
              stroke="#7c2d12"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>
      </svg>

      <div className="carousel-page-one-phone absolute z-20 text-5xl sm:text-5xl" style={{ left: "49.2%", top: "35%" }}>
        📞
      </div>

      <div className="carousel-page-one-person absolute z-20 text-4xl sm:text-5xl" style={{ left: "49.2%", top: "72.2%" }}>
        🙋
      </div>

      {DISTRACTIONS.map((item) => (
        <div
          key={item.emoji + item.left}
          className="carousel-page-one-distraction absolute z-20 text-3xl sm:text-4xl"
          style={{ left: item.left, top: item.top, animationDelay: item.delay }}
        >
          {item.emoji}
        </div>
      ))}
    </div>
  );
}