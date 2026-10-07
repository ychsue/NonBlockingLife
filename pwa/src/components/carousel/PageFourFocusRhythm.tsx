import { useTWithMaps } from "../../i18n";
import "./page-four-focus-rhythm.css";

export function PageFourFocusRhythm() {
  const tHere = useTWithMaps({
    "zh-TW": {
      "START": "開始",
      "FOCUS": "專注",
      "END": "結束",
      "REST": "休息",
      "現在任務": "現在任務",
      "按下開始": "按下開始",
      RHYTHM: "節奏",
      "FOCUS MIN": "專注分鐘",
      "REST MIN": "休息分鐘",
      "放鬆 10 分鐘": "放鬆 10 分鐘",
      "快啟": "快啟"
    },
    "en": {
      "START": "START",
      "FOCUS": "FOCUS",
      "END": "END",
      "REST": "REST",
      "現在任務": "CURRENT TASK",
      "按下開始": "PRESS START",
      RHYTHM: "RHYTHM",
      "FOCUS MIN": "FOCUS MIN",
      "REST MIN": "REST MIN",
      "放鬆 10 分鐘": "RELAX 10 MIN",
      "快啟": "QUICK START"
    },
    "ja": {
      "START": "開始",
      "FOCUS": "集中",
      "END": "終了",
      "REST": "休憩",
      "現在任務": "現在のタスク",
      "按下開始": "開始を押す",
      RHYTHM: "リズム",
      "FOCUS MIN": "集中分",
      "REST MIN": "休憩分",
      "放鬆 10 分鐘": "リラックス 10 分",
      "快啟": "クイックスタート"
    }
  });
  return (
    <div className="carousel-page-four-stage relative flex-1 overflow-hidden rounded-2xl border border-white/75 bg-white/55 px-3 py-4 shadow-inner sm:px-4 sm:py-5">
      <svg
        viewBox="0 0 1000 1000"
        className="carousel-page-four-svg absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="carousel-page-four-focus-panel-clip">
            <rect x="72" y="126" width="420" height="686" rx="46" />
          </clipPath>
          <clipPath id="carousel-page-four-rest-panel-clip">
            <rect x="508" y="126" width="420" height="686" rx="46" />
          </clipPath>
        </defs>

        <g className="carousel-page-four-bg-shell">
          <rect x="72" y="126" width="420" height="686" rx="46" fill="#fef3c7" />
          <rect x="508" y="126" width="420" height="686" rx="46" fill="#dcfce7" />
          <rect x="72" y="126" width="856" height="686" rx="52" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <line x1="500" y1="158" x2="500" y2="782" stroke="#dbeafe" strokeWidth="6" strokeDasharray="16 14" />
        </g>

        <g className="carousel-page-four-top-track">
          <line x1="140" y1="192" x2="860" y2="192" stroke="#cbd5e1" strokeWidth="10" strokeLinecap="round" />
          <line x1="140" y1="192" x2="860" y2="192" stroke="#0f172a" strokeWidth="10" strokeLinecap="round" pathLength="1" className="carousel-page-four-top-progress" />

          <g className="carousel-page-four-node carousel-page-four-node-start">
            <circle cx="172" cy="192" r="28" fill="#0f172a" />
            <text x="172" y="202" textAnchor="middle" fontSize="26" fontWeight="700" fill="#ffffff">▶</text>
            <text x="172" y="242" textAnchor="middle" fontSize="22" fontWeight="700" fill="#334155">{tHere("START")}</text>
          </g>

          <g className="carousel-page-four-node carousel-page-four-node-focus">
            <circle cx="396" cy="192" r="28" fill="#f59e0b" />
            <text x="396" y="202" textAnchor="middle" fontSize="24" fontWeight="700" fill="#ffffff">30</text>
            <text x="396" y="242" textAnchor="middle" fontSize="22" fontWeight="700" fill="#92400e">{tHere("FOCUS")}</text>
          </g>

          <g className="carousel-page-four-node carousel-page-four-node-end">
            <circle cx="616" cy="192" r="28" fill="#0f172a" />
            <text x="616" y="202" textAnchor="middle" fontSize="22" fontWeight="700" fill="#ffffff">■</text>
            <text x="616" y="242" textAnchor="middle" fontSize="22" fontWeight="700" fill="#334155">{tHere("END")}</text>
          </g>

          <g className="carousel-page-four-node carousel-page-four-node-rest">
            <circle cx="840" cy="192" r="28" fill="#10b981" />
            <text x="840" y="202" textAnchor="middle" fontSize="22" fontWeight="700" fill="#ffffff">10</text>
            <text x="840" y="242" textAnchor="middle" fontSize="22" fontWeight="700" fill="#166534">{tHere("REST")}</text>
          </g>
        </g>

        <g className="carousel-page-four-task-card">
          <rect x="126" y="304" width="312" height="172" rx="34" fill="#ffffff" stroke="#f59e0b" strokeWidth="6" />
          <rect x="136" y="334" width="150" height="34" rx="17" fill="#0f172a" />
          <text x="214" y="357" textAnchor="middle" fontSize="18" fontWeight="700" fill="#ffffff">{tHere("現在任務")}</text>
          <rect x="156" y="392" width="190" height="12" rx="6" fill="#0f172a" />
          <rect x="156" y="418" width="226" height="10" rx="5" fill="#94a3b8" />
          <rect x="156" y="444" width="158" height="10" rx="5" fill="#cbd5e1" />
          <rect x="306" y="336" width="116" height="30" rx="15" fill="#fef3c7" className="carousel-page-four-start-pill" />
          <text x="364" y="357" textAnchor="middle" fontSize="17" fontWeight="700" fill="#92400e" className="carousel-page-four-start-pill">{tHere("按下開始")}</text>
        </g>

        <g clipPath="url(#carousel-page-four-focus-panel-clip)">
          <rect x="72" y="126" width="420" height="686" fill="rgba(255,255,255,0.18)" className="carousel-page-four-focus-sheen" />
        </g>

        <g className="carousel-page-four-clock-shell">
          <circle cx="500" cy="504" r="154" fill="#ffffff" stroke="#e2e8f0" strokeWidth="10" />
          <circle cx="500" cy="504" r="118" fill="#f8fafc" />
          <circle cx="500" cy="504" r="132" fill="none" stroke="#fde68a" strokeWidth="26" pathLength="100" className="carousel-page-four-focus-ring" />
          <circle cx="500" cy="504" r="132" fill="none" stroke="#86efac" strokeWidth="26" pathLength="100" className="carousel-page-four-rest-ring" />
          <circle cx="500" cy="504" r="8" fill="#475569" />
          <line x1="500" y1="504" x2="500" y2="414" stroke="#475569" strokeWidth="8" strokeLinecap="round" />
          <line x1="500" y1="504" x2="566" y2="538" stroke="#475569" strokeWidth="8" strokeLinecap="round" />
          <text x="500" y="474" textAnchor="middle" fontSize="30" fontWeight="700" fill="#64748b">{tHere("RHYTHM")}</text>
          <text x="500" y="536" textAnchor="middle" fontSize="80" fontWeight="700" fill="#0f172a" className="carousel-page-four-label carousel-page-four-label-focus">30</text>
          <text x="500" y="536" textAnchor="middle" fontSize="80" fontWeight="700" fill="#166534" className="carousel-page-four-label carousel-page-four-label-rest">10</text>
          <text x="500" y="590" textAnchor="middle" fontSize="26" fontWeight="700" fill="#64748b" className="carousel-page-four-subtitle carousel-page-four-subtitle-focus">{tHere("FOCUS MIN")}</text>
          <text x="500" y="590" textAnchor="middle" fontSize="26" fontWeight="700" fill="#64748b" className="carousel-page-four-subtitle carousel-page-four-subtitle-rest">{tHere("REST MIN")}</text>
        </g>

        <g className="carousel-page-four-end-check">
          <circle cx="616" cy="404" r="42" fill="#0f172a" />
          <text x="616" y="420" textAnchor="middle" fontSize="34" fontWeight="700" fill="#ffffff">✓</text>
        </g>

        <g className="carousel-page-four-rest-card">
          <rect x="584" y="610" width="258" height="126" rx="34" fill="#ffffff" stroke="#10b981" strokeWidth="6" />
          <text x="712" y="660" textAnchor="middle" fontSize="56" fontWeight="700">☕</text>
          <text x="712" y="706" textAnchor="middle" fontSize="24" fontWeight="700" fill="#166534">{tHere("放鬆 10 分鐘")}</text>
        </g>

        <g className="carousel-page-four-phone-hint">
          <rect x="814" y="764" width="92" height="42" rx="21" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="4" />
          <text x="860" y="791" textAnchor="middle" fontSize="20" fontWeight="700" fill="#475569">📱 {tHere("快啟")}</text>
        </g>
      </svg>
    </div>
  );
}