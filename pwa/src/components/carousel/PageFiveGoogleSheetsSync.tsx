import "./page-five-google-sheets-sync.css";

export function PageFiveGoogleSheetsSync() {
  return (
    <div className="carousel-page-five-stage relative flex-1 overflow-hidden rounded-2xl border border-white/75 bg-white/55 px-3 py-4 shadow-inner sm:px-4 sm:py-5">
      <svg
        viewBox="0 0 1000 1000"
        className="carousel-page-five-svg absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <g className="carousel-page-five-bg-shell">
          <rect x="72" y="144" width="280" height="668" rx="44" fill="#f8fafc" />
          <rect x="396" y="144" width="208" height="668" rx="44" fill="#eff6ff" />
          <rect x="648" y="144" width="280" height="668" rx="44" fill="#ecfdf5" />
          <rect x="72" y="144" width="856" height="668" rx="50" fill="none" stroke="#e2e8f0" strokeWidth="8" />
        </g>

        <g className="carousel-page-five-label-shell">
          <text x="212" y="206" textAnchor="middle" fill="#475569" fontSize="24" fontWeight="700" letterSpacing="2">LOCAL DATA</text>
          <text x="500" y="206" textAnchor="middle" fill="#475569" fontSize="24" fontWeight="700" letterSpacing="2">SYNC BRIDGE</text>
          <text x="788" y="206" textAnchor="middle" fill="#166534" fontSize="24" fontWeight="700" letterSpacing="2">YOUR SHEET</text>
        </g>

        <g className="carousel-page-five-local-card carousel-page-five-local-card-one">
          <rect x="116" y="270" width="192" height="98" rx="28" fill="#ffffff" stroke="#cbd5e1" strokeWidth="5" />
          <rect x="142" y="296" width="72" height="24" rx="12" fill="#22c55e" />
          <text x="178" y="313" textAnchor="middle" fontSize="16" fontWeight="700" fill="#ffffff">INBOX</text>
          <rect x="142" y="334" width="116" height="10" rx="5" fill="#94a3b8" />
          <rect x="142" y="352" width="90" height="10" rx="5" fill="#cbd5e1" />
        </g>

        <g className="carousel-page-five-local-card carousel-page-five-local-card-two">
          <rect x="116" y="404" width="192" height="98" rx="28" fill="#ffffff" stroke="#cbd5e1" strokeWidth="5" />
          <rect x="142" y="430" width="72" height="24" rx="12" fill="#0ea5e9" />
          <text x="178" y="447" textAnchor="middle" fontSize="16" fontWeight="700" fill="#ffffff">TASKS</text>
          <rect x="142" y="468" width="126" height="10" rx="5" fill="#94a3b8" />
          <rect x="142" y="486" width="96" height="10" rx="5" fill="#cbd5e1" />
        </g>

        <g className="carousel-page-five-local-card carousel-page-five-local-card-three">
          <rect x="116" y="538" width="192" height="98" rx="28" fill="#ffffff" stroke="#cbd5e1" strokeWidth="5" />
          <rect x="142" y="564" width="96" height="24" rx="12" fill="#f59e0b" />
          <text x="190" y="581" textAnchor="middle" fontSize="16" fontWeight="700" fill="#ffffff">SCHEDULE</text>
          <rect x="142" y="602" width="118" height="10" rx="5" fill="#94a3b8" />
          <rect x="142" y="620" width="82" height="10" rx="5" fill="#cbd5e1" />
        </g>

        <g className="carousel-page-five-bridge-shell">
          <line x1="336" y1="476" x2="664" y2="476" stroke="#cbd5e1" strokeWidth="10" strokeLinecap="round" />
          <line x1="336" y1="476" x2="664" y2="476" stroke="#0f172a" strokeWidth="10" strokeLinecap="round" pathLength="1" className="carousel-page-five-bridge-progress" />
          <circle cx="500" cy="476" r="54" fill="#ffffff" stroke="#0f172a" strokeWidth="8" className="carousel-page-five-bridge-node" />
          <circle cx="500" cy="476" r="36" fill="#0f172a" />
          <text x="500" y="486" textAnchor="middle" fontSize="30" fontWeight="700" fill="#ffffff">↔</text>
          <text x="500" y="552" textAnchor="middle" fontSize="22" fontWeight="700" fill="#334155">SAFE SYNC</text>
        </g>

        <g className="carousel-page-five-sheet-shell">
          <rect x="692" y="266" width="192" height="332" rx="34" fill="#ffffff" stroke="#22c55e" strokeWidth="7" />
          <rect x="692" y="266" width="192" height="64" rx="34" fill="#22c55e" />
          <rect x="692" y="298" width="192" height="32" fill="#22c55e" />
          <text x="788" y="306" textAnchor="middle" fontSize="20" fontWeight="700" fill="#ffffff">Google Sheet</text>
          <line x1="728" y1="356" x2="848" y2="356" stroke="#d1fae5" strokeWidth="12" />
          <line x1="728" y1="396" x2="848" y2="396" stroke="#d1fae5" strokeWidth="12" />
          <line x1="728" y1="436" x2="848" y2="436" stroke="#d1fae5" strokeWidth="12" />
          <line x1="728" y1="476" x2="848" y2="476" stroke="#d1fae5" strokeWidth="12" />
          <line x1="728" y1="516" x2="848" y2="516" stroke="#d1fae5" strokeWidth="12" />

          <rect x="724" y="384" width="128" height="14" rx="7" fill="#10b981" className="carousel-page-five-sheet-row carousel-page-five-sheet-row-one" />
          <rect x="724" y="424" width="104" height="14" rx="7" fill="#34d399" className="carousel-page-five-sheet-row carousel-page-five-sheet-row-two" />
          <rect x="724" y="464" width="140" height="14" rx="7" fill="#6ee7b7" className="carousel-page-five-sheet-row carousel-page-five-sheet-row-three" />
        </g>

        <g className="carousel-page-five-pill carousel-page-five-pill-one">
          <rect x="674" y="640" width="116" height="42" rx="21" fill="#ffffff" stroke="#22c55e" strokeWidth="4" />
          <text x="732" y="667" textAnchor="middle" fontSize="18" fontWeight="700" fill="#166534">BACKUP</text>
        </g>

        <g className="carousel-page-five-pill carousel-page-five-pill-two">
          <rect x="728" y="696" width="100" height="42" rx="21" fill="#ffffff" stroke="#0ea5e9" strokeWidth="4" />
          <text x="778" y="723" textAnchor="middle" fontSize="18" fontWeight="700" fill="#0c4a6e">SYNC</text>
        </g>

        <g className="carousel-page-five-pill carousel-page-five-pill-three">
          <rect x="690" y="752" width="134" height="42" rx="21" fill="#ffffff" stroke="#64748b" strokeWidth="4" />
          <text x="757" y="779" textAnchor="middle" fontSize="18" fontWeight="700" fill="#334155">ANALYZE</text>
        </g>

        <g className="carousel-page-five-note-shell">
          <rect x="108" y="706" width="278" height="66" rx="24" fill="#ffffff" stroke="#cbd5e1" strokeWidth="4" />
          <text x="247" y="734" textAnchor="middle" fontSize="18" fontWeight="700" fill="#334155">你自己建立表與腳本</text>
          <text x="247" y="760" textAnchor="middle" fontSize="16" fontWeight="700" fill="#64748b">資料掌握權也因此在你手上</text>
        </g>
      </svg>

      <div className="carousel-page-five-token carousel-page-five-token-one" aria-hidden="true" />
      <div className="carousel-page-five-token carousel-page-five-token-two" aria-hidden="true" />
    </div>
  );
}