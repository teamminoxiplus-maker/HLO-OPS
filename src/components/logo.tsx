import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

// Original sprout mark — an organic "growth" motif that fits both the
// organics brand and its hair-growth flagship. Pure SVG: crisp at any size,
// themeable, no external asset, no CSP concerns.
export function LogoMark({
  className,
  title = BRAND.name,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
      className={className}
      fill="none"
    >
      {/* rounded badge */}
      <rect width="32" height="32" rx="9" fill="url(#hlo-grad)" />
      {/* stem */}
      <path
        d="M16 24.5 C16 20 16 17.5 16 14.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* left leaf */}
      <path
        d="M16 17.2 C11.6 17.2 8.4 14.3 8.4 9.9 C13 9.9 16 12.8 16 17.2 Z"
        fill="white"
        fillOpacity="0.92"
      />
      {/* right leaf */}
      <path
        d="M16 14.6 C20.4 14.6 23.6 11.7 23.6 7.3 C19 7.3 16 10.2 16 14.6 Z"
        fill="white"
      />
      <defs>
        <linearGradient id="hlo-grad" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="hsl(150 58% 40%)" />
          <stop offset="1" stopColor="hsl(158 62% 26%)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Full lockup: mark + stacked wordmark. `compact` hides the subtitle.
export function Logo({
  className,
  compact = false,
  markSize = "h-8 w-8",
}: {
  className?: string;
  compact?: boolean;
  markSize?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={cn(markSize, "shrink-0")} />
      <span className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          {BRAND.appName}
        </span>
        {!compact && (
          <span className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {BRAND.appSubtitle}
          </span>
        )}
      </span>
    </span>
  );
}
