interface MorpholexLogoProps {
  size?: number;
  className?: string;
}

export function MorpholexIcon({ size = 28, className }: MorpholexLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="7" fill="hsl(345 40% 40%)" />
      <path
        d="M7 25V7l9 11 9-11v18"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="7" y1="7" x2="3.5" y2="7" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
      <line x1="25" y1="7" x2="28.5" y2="7" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
      <line x1="7" y1="7" x2="7" y2="3.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.4" />
      <line x1="25" y1="7" x2="25" y2="3.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}
