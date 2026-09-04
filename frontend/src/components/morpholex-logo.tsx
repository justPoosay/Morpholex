interface MorpholexLogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function MorpholexLogo({ className, iconOnly = false }: MorpholexLogoProps) {
  const width = iconOnly ? 84 : 520;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height="120"
      viewBox={iconOnly ? "31 20 80 80" : "0 0 520 120"}
      role="img"
      aria-label={iconOnly ? "Morpholex" : "Morpholex, morphology explorer"}
      className={className}
    >
      <g transform="translate(31 20)">
        <rect x="2" y="2" width="76" height="76" rx="16" fill="hsl(var(--foreground))" />
        <path d="M40 59V21" stroke="hsl(var(--background))" strokeWidth="5" strokeLinecap="round" />
        <path
          d="M40 39 24 28M40 39l16-11M40 50 23 60M40 50l18 10"
          stroke="hsl(var(--background))"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="24" cy="28" r="5.5" fill="#d98545" />
        <circle cx="56" cy="28" r="5.5" fill="#4e9a9a" />
        <circle cx="23" cy="60" r="5.5" fill="#b43c55" />
        <circle cx="58" cy="60" r="5.5" fill="#d98545" />
      </g>
      {!iconOnly && (
        <>
          <text
            x="126"
            y="72"
            fill="currentColor"
            fontFamily="Georgia, 'Times New Roman', serif"
            fontSize="47"
            fontWeight="700"
            letterSpacing="0"
          >
            Morpholex
          </text>
          <text
            x="128"
            y="93"
            fill="hsl(var(--primary))"
            fontFamily="Inter, Arial, sans-serif"
            fontSize="13"
            letterSpacing="1.6"
          >
            MORPHOLOGY EXPLORER
          </text>
        </>
      )}
    </svg>
  );
}

export function MorpholexIcon({ className }: Pick<MorpholexLogoProps, "className">) {
  return <MorpholexLogo iconOnly className={className} />;
}
