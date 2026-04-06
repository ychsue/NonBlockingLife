import "./page-six-first-setup.css";

export function PageSixFirstSetup() {
  return (
    <div className="carousel-page-six-stage relative flex-1 overflow-hidden rounded-2xl border border-white/75 bg-white/55 px-3 py-4 shadow-inner sm:px-4 sm:py-5">
      <svg
        viewBox="0 0 1000 1000"
        className="carousel-page-six-svg absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <g className="carousel-page-six-bg-shell">
          <rect x="90" y="176" width="328" height="280" rx="40" fill="#eff6ff" />
          <rect x="582" y="176" width="328" height="280" rx="40" fill="#fef3c7" />
          <rect x="240" y="618" width="520" height="178" rx="46" fill="#ecfdf5" />
          <rect x="90" y="176" width="820" height="620" rx="54" fill="none" stroke="#e2e8f0" strokeWidth="8" />
        </g>

        <g className="carousel-page-six-card carousel-page-six-card-one">
          <rect x="122" y="210" width="264" height="212" rx="34" fill="#ffffff" stroke="#0ea5e9" strokeWidth="6" />
          <rect x="152" y="248" width="122" height="34" rx="17" fill="#0ea5e9" />
          <text x="213" y="270" textAnchor="middle" fontSize="18" fontWeight="700" fill="#ffffff">TASK POOL</text>
          <rect x="152" y="314" width="156" height="12" rx="6" fill="#0f172a" />
          <rect x="152" y="340" width="186" height="10" rx="5" fill="#94a3b8" />
          <rect x="152" y="364" width="132" height="10" rx="5" fill="#cbd5e1" />
          <g className="carousel-page-six-check carousel-page-six-check-one">
            <circle cx="346" cy="364" r="28" fill="#0ea5e9" />
            <text x="346" y="374" textAnchor="middle" fontSize="28" fontWeight="700" fill="#ffffff">✓</text>
          </g>
        </g>

        <g className="carousel-page-six-card carousel-page-six-card-two">
          <rect x="614" y="210" width="264" height="212" rx="34" fill="#ffffff" stroke="#f59e0b" strokeWidth="6" />
          <rect x="644" y="248" width="132" height="34" rx="17" fill="#f59e0b" />
          <text x="710" y="270" textAnchor="middle" fontSize="18" fontWeight="700" fill="#ffffff">SCHEDULED</text>
          <rect x="644" y="314" width="168" height="12" rx="6" fill="#0f172a" />
          <rect x="644" y="340" width="152" height="10" rx="5" fill="#94a3b8" />
          <rect x="644" y="364" width="118" height="10" rx="5" fill="#cbd5e1" />
          <g className="carousel-page-six-check carousel-page-six-check-two">
            <circle cx="838" cy="364" r="28" fill="#f59e0b" />
            <text x="838" y="374" textAnchor="middle" fontSize="28" fontWeight="700" fill="#ffffff">✓</text>
          </g>
        </g>

        <g className="carousel-page-six-path-shell">
          <path d="M256 456C256 544 344 612 500 654" fill="none" stroke="#0ea5e9" strokeWidth="10" strokeLinecap="round" pathLength="1" className="carousel-page-six-path carousel-page-six-path-one" />
          <path d="M744 456C744 544 656 612 500 654" fill="none" stroke="#f59e0b" strokeWidth="10" strokeLinecap="round" pathLength="1" className="carousel-page-six-path carousel-page-six-path-two" />
        </g>

        <g className="carousel-page-six-ready-shell">
          <rect x="292" y="646" width="416" height="120" rx="36" fill="#ffffff" stroke="#22c55e" strokeWidth="7" />
          <circle cx="360" cy="706" r="34" fill="#22c55e" className="carousel-page-six-ready-badge" />
          <text x="360" y="717" textAnchor="middle" fontSize="30" fontWeight="700" fill="#ffffff">▶</text>
          <text x="528" y="694" textAnchor="middle" fontSize="34" fontWeight="700" fill="#166534">READY TO START</text>
          <text x="528" y="732" textAnchor="middle" fontSize="20" fontWeight="700" fill="#64748b">完成兩步後，首頁教學不再自動跳出</text>
        </g>
      </svg>
    </div>
  );
}