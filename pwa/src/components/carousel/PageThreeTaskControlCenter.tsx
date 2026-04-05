import "./page-three-task-control-center.css";

export function PageThreeTaskControlCenter() {
  return (
    <div className="carousel-page-three-stage relative flex-1 overflow-hidden rounded-2xl border border-white/75 bg-white/55 px-3 py-4 shadow-inner sm:px-4 sm:py-5">
      <svg
        viewBox="0 0 1000 1000"
        className="carousel-page-three-svg absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <filter id="carousel-page-three-hub-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="18" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="498" cy="372" r="298" fill="rgba(14,165,233,0.08)" className="carousel-page-three-shell" />

        <g className="carousel-page-three-shell">
          <text x="140" y="182" fill="#475569" fontSize="26" fontWeight="700" letterSpacing="3">
            QUERY
          </text>
          <text x="700" y="182" fill="#475569" fontSize="26" fontWeight="700" letterSpacing="3">
            CAPTURE
          </text>
          <text x="404" y="646" fill="#475569" fontSize="24" fontWeight="700" letterSpacing="2">
            DAILY SCAN
          </text>
        </g>

        <g className="carousel-page-three-cards">
          <g className="carousel-page-three-card carousel-page-three-card-one">
            <rect x="92" y="244" width="220" height="72" rx="22" fill="#ffffff" stroke="#cbd5e1" strokeWidth="4" />
            <circle cx="128" cy="280" r="8" fill="#38bdf8" />
            <rect x="148" y="266" width="116" height="8" rx="4" fill="#94a3b8" />
            <rect x="148" y="282" width="92" height="8" rx="4" fill="#cbd5e1" />
          </g>

          <g className="carousel-page-three-card carousel-page-three-card-two">
            <rect x="92" y="340" width="220" height="72" rx="22" fill="#ffffff" stroke="#38bdf8" strokeWidth="5" />
            <circle cx="128" cy="376" r="8" fill="#f59e0b" />
            <rect x="148" y="362" width="132" height="8" rx="4" fill="#0f172a" />
            <rect x="148" y="378" width="104" height="8" rx="4" fill="#94a3b8" />
          </g>

          <g className="carousel-page-three-card carousel-page-three-card-three">
            <rect x="92" y="436" width="220" height="72" rx="22" fill="#ffffff" stroke="#cbd5e1" strokeWidth="4" />
            <circle cx="128" cy="472" r="8" fill="#34d399" />
            <rect x="148" y="458" width="124" height="8" rx="4" fill="#94a3b8" />
            <rect x="148" y="474" width="86" height="8" rx="4" fill="#cbd5e1" />
          </g>

          <rect
            x="80"
            y="328"
            width="244"
            height="96"
            rx="28"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="7"
            className="carousel-page-three-card-selection"
          />
        </g>

        <path
          d="M312 376C338 376 356 376 384 376"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="8"
          strokeLinecap="round"
          pathLength="1"
          className="carousel-page-three-query-beam"
        />

        <g className="carousel-page-three-hub-glow" filter="url(#carousel-page-three-hub-glow)">
          <circle cx="500" cy="374" r="122" fill="rgba(14,165,233,0.16)" />
        </g>

        <g className="carousel-page-three-hub-shell">
          <rect x="386" y="236" width="228" height="284" rx="44" fill="#f8fafc" stroke="#0f172a" strokeWidth="8" />
          <rect x="430" y="274" width="140" height="140" rx="30" fill="#0f172a" />
          <circle cx="536" cy="308" r="12" fill="#f59e0b" />
          <text x="500" y="358" textAnchor="middle" fontSize="52" fontWeight="700" fontFamily="Verdana, Arial, sans-serif" fill="#ffffff">
            NBL
          </text>
          <rect x="434" y="438" width="132" height="10" rx="5" fill="#0ea5e9" />
          <rect x="434" y="460" width="104" height="10" rx="5" fill="#bae6fd" />
          <text x="500" y="498" textAnchor="middle" fill="#334155" fontSize="22" fontWeight="700" letterSpacing="1.5">
            CONTROL
          </text>
        </g>

        <g className="carousel-page-three-inbox-shell">
          <rect x="704" y="274" width="176" height="194" rx="34" fill="#ecfdf5" stroke="#22c55e" strokeWidth="7" />
          <path d="M722 326H864" fill="none" stroke="#22c55e" strokeWidth="10" strokeLinecap="round" />
          <path d="M730 330L756 364H830L856 330" fill="none" stroke="#86efac" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <text x="792" y="430" textAnchor="middle" fill="#166534" fontSize="24" fontWeight="700" letterSpacing="2">
            INBOX
          </text>

          <rect x="738" y="352" width="108" height="12" rx="6" fill="#dcfce7" className="carousel-page-three-inbox-item carousel-page-three-inbox-item-one" />
          <rect x="738" y="374" width="96" height="12" rx="6" fill="#bbf7d0" className="carousel-page-three-inbox-item carousel-page-three-inbox-item-two" />
          <rect x="738" y="396" width="118" height="12" rx="6" fill="#4ade80" className="carousel-page-three-inbox-item carousel-page-three-inbox-item-three" />
          <rect x="738" y="418" width="88" height="12" rx="6" fill="#22c55e" className="carousel-page-three-inbox-item carousel-page-three-inbox-item-four" />
        </g>

        <g className="carousel-page-three-source-base">
          <g transform="translate(890 178)">
            <circle r="34" fill="rgba(255,255,255,0.72)" stroke="rgba(148,163,184,0.34)" strokeWidth="3" />
            <text textAnchor="middle" dominantBaseline="central" fontSize="34">🌐</text>
          </g>
          <g transform="translate(914 302)">
            <circle r="34" fill="rgba(255,255,255,0.72)" stroke="rgba(148,163,184,0.34)" strokeWidth="3" />
            <text textAnchor="middle" dominantBaseline="central" fontSize="34">💡</text>
          </g>
          <g transform="translate(884 428)">
            <circle r="34" fill="rgba(255,255,255,0.72)" stroke="rgba(148,163,184,0.34)" strokeWidth="3" />
            <text textAnchor="middle" dominantBaseline="central" fontSize="34">📝</text>
          </g>
          <g transform="translate(918 550)">
            <circle r="34" fill="rgba(255,255,255,0.72)" stroke="rgba(148,163,184,0.34)" strokeWidth="3" />
            <text textAnchor="middle" dominantBaseline="central" fontSize="34">🔖</text>
          </g>
        </g>

        <g className="carousel-page-three-sort-paths">
          <path d="M792 470C760 562 660 646 256 700" fill="none" stroke="#f59e0b" strokeWidth="10" strokeLinecap="round" pathLength="1" className="carousel-page-three-sort-path carousel-page-three-sort-path-one" />
          <path d="M792 470C792 568 680 646 500 700" fill="none" stroke="#0ea5e9" strokeWidth="10" strokeLinecap="round" pathLength="1" className="carousel-page-three-sort-path carousel-page-three-sort-path-two" />
          <path d="M792 470C834 560 864 646 744 700" fill="none" stroke="#22c55e" strokeWidth="10" strokeLinecap="round" pathLength="1" className="carousel-page-three-sort-path carousel-page-three-sort-path-three" />
        </g>

        <g className="carousel-page-three-bin carousel-page-three-bin-one">
          <rect x="168" y="700" width="176" height="112" rx="28" fill="#fef3c7" stroke="#f59e0b" strokeWidth="6" />
          <text x="256" y="748" textAnchor="middle" fill="#92400e" fontSize="23" fontWeight="700" letterSpacing="1.5">
            TASKS
          </text>
          <rect x="210" y="770" width="92" height="10" rx="5" fill="#f59e0b" opacity="0.35" />
        </g>

        <g className="carousel-page-three-bin carousel-page-three-bin-two">
          <rect x="412" y="700" width="176" height="112" rx="28" fill="#e0f2fe" stroke="#0ea5e9" strokeWidth="6" />
          <text x="500" y="748" textAnchor="middle" fill="#0c4a6e" fontSize="21" fontWeight="700" letterSpacing="1.5">
            RESOURCES
          </text>
          <rect x="454" y="770" width="92" height="10" rx="5" fill="#0ea5e9" opacity="0.35" />
        </g>

        <g className="carousel-page-three-bin carousel-page-three-bin-three">
          <rect x="656" y="700" width="176" height="112" rx="28" fill="#f1f5f9" stroke="#64748b" strokeWidth="6" />
          <text x="744" y="748" textAnchor="middle" fill="#334155" fontSize="23" fontWeight="700" letterSpacing="1.5">
            KEEP
          </text>
          <rect x="698" y="770" width="92" height="10" rx="5" fill="#64748b" opacity="0.35" />
        </g>

        <text x="500" y="878" textAnchor="middle" fill="#64748b" fontSize="26" fontWeight="700" letterSpacing="2" className="carousel-page-three-shell">
          QUERY  →  INBOX  →  DAILY ROUTE
        </text>
      </svg>

      <div className="carousel-page-three-source-fly carousel-page-three-source-fly-one">🌐</div>
      <div className="carousel-page-three-source-fly carousel-page-three-source-fly-two">💡</div>
      <div className="carousel-page-three-source-fly carousel-page-three-source-fly-three">📝</div>
      <div className="carousel-page-three-source-fly carousel-page-three-source-fly-four">🔖</div>

      <div className="carousel-page-three-token-fly carousel-page-three-token-fly-one" aria-hidden="true" />
      <div className="carousel-page-three-token-fly carousel-page-three-token-fly-two" aria-hidden="true" />
      <div className="carousel-page-three-token-fly carousel-page-three-token-fly-three" aria-hidden="true" />
    </div>
  );
}