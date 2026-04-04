import "./page-two-back-to-mainline.css";

export function PageTwoBackToMainline() {
  return (
    <div className="carousel-page-two-stage relative flex-1 overflow-hidden rounded-2xl border border-white/75 bg-white/55 px-3 py-4 shadow-inner sm:px-4 sm:py-5">
      <svg
        viewBox="0 0 1000 1000"
        className="carousel-page-two-svg absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="carousel-page-two-arrow-clip">
            <polygon points="100,292 790,292 790,248 872,334 790,420 790,374 100,374" />
          </clipPath>
          <filter id="carousel-page-two-flag-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="carousel-page-two-mainline">
          <polygon
            points="100,292 790,292 790,248 872,334 790,420 790,374 100,374"
            fill="none"
            stroke="#64748b"
            strokeWidth="12"
            strokeLinejoin="miter"
          />
        </g>

        <g clipPath="url(#carousel-page-two-arrow-clip)">
          <rect x="100" y="292" width="188" height="128" fill="#facc15" className="carousel-page-two-progress carousel-page-two-progress-one" />
          <rect x="430" y="292" width="168" height="128" fill="#facc15" className="carousel-page-two-progress carousel-page-two-progress-two" />
          <rect x="704" y="248" width="188" height="172" fill="#facc15" className="carousel-page-two-progress carousel-page-two-progress-three" />
        </g>

        <g className="carousel-page-two-clock-base">
          <circle cx="268" cy="172" r="76" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="12" />
          <circle cx="268" cy="172" r="56" fill="#ffffff" />
          <circle
            cx="268"
            cy="172"
            r="58"
            fill="none"
            stroke="#facc15"
            strokeWidth="26"
            pathLength="100"
            className="carousel-page-two-clock-yellow"
          />
          <circle cx="268" cy="172" r="6" fill="#475569" />
          <line x1="268" y1="172" x2="268" y2="126" stroke="#475569" strokeWidth="8" />
          <line x1="268" y1="172" x2="304" y2="193" stroke="#475569" strokeWidth="8" />
        </g>

        {/* first U */}
        <path
          d="M280 334V610"
          fill="none"
          stroke="#f4c430"
          strokeWidth="16"
          pathLength="1"
          className="carousel-page-two-path carousel-page-two-path-down-one"
        />

        <path
          d="M280 610C280 640 319.5 660 359 660C398.5 660 438 640 438 610"
          fill="none"
          stroke="#f4c430"
          strokeWidth="16"
          pathLength="1"
          className="carousel-page-two-path carousel-page-two-path-turn-one"
        />

        <path
          d="M438 610V334"
          fill="none"
          stroke="#f4c430"
          strokeWidth="16"
          pathLength="1"
          className="carousel-page-two-path carousel-page-two-path-up-one"
        />

        {/* second U */}
        <path
          d="M590 334V640"
          fill="none"
          stroke="#f4c430"
          strokeWidth="16"
          pathLength="1"
          className="carousel-page-two-path carousel-page-two-path-down-two"
        />

        <path
          d="M590 640C590 668 621 688 652 688C683 688 712 668 712 640"
          fill="none"
          stroke="#f4c430"
          strokeWidth="16"
          pathLength="1"
          className="carousel-page-two-path carousel-page-two-path-turn-two"
        />

        <path
          d="M712 640V334"
          fill="none"
          stroke="#f4c430"
          strokeWidth="16"
          pathLength="1"
          className="carousel-page-two-path carousel-page-two-path-up-two"
        />

        <g transform="translate(351 614)">
          <g className="carousel-page-two-nbl-one">
            <rect x="-44" y="-44" width="88" height="88" rx="19" fill="#0f172a" />
            <circle cx="22" cy="-18" r="7" fill="#f59e0b" />
            <text x="0" y="12" textAnchor="middle" fontSize="28" fontWeight="700" fontFamily="Verdana, Arial, sans-serif" fill="#ffffff">NBL</text>
          </g>
        </g>

        <g transform="translate(644 644)">
          <g className="carousel-page-two-nbl-two">
            <rect x="-44" y="-44" width="88" height="88" rx="19" fill="#0f172a" />
            <circle cx="22" cy="-18" r="7" fill="#f59e0b" />
            <text x="0" y="12" textAnchor="middle" fontSize="28" fontWeight="700" fontFamily="Verdana, Arial, sans-serif" fill="#ffffff">NBL</text>
          </g>
        </g>

        <g transform="translate(500 886)">
          <g className="carousel-page-two-log-scroll">
            <path d="M-280 -42H220C246 -42 266 -22 266 4V92H-252C-278 92 -298 72 -298 46V-18C-298 -31 -290 -42 -280 -42Z" fill="#fff8e8" stroke="#caa86a" strokeWidth="6" />
            <path d="M220 -42C246 -42 266 -22 266 4V92C266 50 238 20 200 20H160V-42Z" fill="#f4dfb3" stroke="#caa86a" strokeWidth="6" />
            <line x1="-242" y1="-2" x2="152" y2="-2" stroke="#d2b48c" strokeWidth="6" />
            <line x1="-242" y1="34" x2="152" y2="34" stroke="#d2b48c" strokeWidth="6" />
            <line x1="-242" y1="70" x2="128" y2="70" stroke="#d2b48c" strokeWidth="6" />
            <line x1="-226" y1="-2" x2="86" y2="-2" stroke="#0f766e" strokeWidth="8" className="carousel-page-two-log-entry carousel-page-two-log-entry-one" />
            <line x1="-226" y1="34" x2="122" y2="34" stroke="#0f766e" strokeWidth="8" className="carousel-page-two-log-entry carousel-page-two-log-entry-two" />
          </g>
        </g>

        <g className="carousel-page-two-flag-shell">
          <line x1="916" y1="190" x2="916" y2="316" stroke="#64748b" strokeWidth="10" />
          <path d="M916 196L984 220L916 248Z" fill="#94a3b8" className="carousel-page-two-flag-gray" />
          <g className="carousel-page-two-flag-win" filter="url(#carousel-page-two-flag-glow)">
            <path d="M916 196L984 220L916 248Z" fill="#ef4444" />
            <path d="M916 220L968 236L916 248Z" fill="#facc15" />
            <circle cx="992" cy="204" r="8" fill="#fde68a" />
            <circle cx="1006" cy="228" r="6" fill="#bfdbfe" />
            <circle cx="988" cy="246" r="5" fill="#fbcfe8" />
          </g>
        </g>
      </svg>

      <div className="carousel-page-two-event-badge carousel-page-two-event-badge-one absolute z-20 text-4xl" style={{ left: "27.2%", top: "34%" }}>
        📞
      </div>
      <div className="carousel-page-two-event-badge carousel-page-two-event-badge-two absolute z-20 text-4xl" style={{ left: "58.2%", top: "34.5%" }}>
        🔔
      </div>
    </div>
  );
}