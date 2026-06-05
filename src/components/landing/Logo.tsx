interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Zentry Qor logo"
    >
      <defs>
        <linearGradient id="logo-blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5BA9FF" />
          <stop offset="45%" stopColor="#1E6BE6" />
          <stop offset="100%" stopColor="#0A3FAE" />
        </linearGradient>
        <linearGradient id="logo-blue-edge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9FCBFF" />
          <stop offset="100%" stopColor="#1B5BD0" />
        </linearGradient>
        <linearGradient id="logo-silver" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8ECF1" />
          <stop offset="50%" stopColor="#9AA3AE" />
          <stop offset="100%" stopColor="#3A434F" />
        </linearGradient>
        <filter id="logo-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" />
          <feOffset dx="0" dy="1.2" result="off" />
          <feComponentTransfer><feFuncA type="linear" slope="0.45" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#logo-shadow)">
        {/* Silver ribbon (back) - forms right/bottom triangle loop */}
        <path
          d="M50 18 L86 82 L14 82 Z"
          fill="none"
          stroke="url(#logo-silver)"
          strokeWidth="10"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Blue ribbon (front) - interlocking Z/triangle */}
        <path
          d="M22 30 L78 30 L30 78 L82 78"
          fill="none"
          stroke="url(#logo-blue)"
          strokeWidth="11"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Highlight on blue */}
        <path
          d="M24 28 L76 28"
          fill="none"
          stroke="url(#logo-blue-edge)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.8"
        />
      </g>
    </svg>
  );
}
