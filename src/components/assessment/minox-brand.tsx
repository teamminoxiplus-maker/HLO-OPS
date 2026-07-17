import { cn } from "@/lib/utils";

// MINOXIPLUS visual identity (spec §7): dark blue / white / black. Scoped to the
// public assessment surfaces so it stays independent of the green HLO Ops theme.
export const MINOX = {
  name: "MINOXIPLUS",
  ink: "#0b1f4d", // dark blue
  accent: "#1d4ed8", // action blue
};

export function MinoxLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-extrabold tracking-tight text-white",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <rect width="24" height="24" rx="6" fill="#1d4ed8" />
        <path
          d="M7 17V7l5 6 5-6v10"
          stroke="#fff"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>MINOXIPLUS</span>
    </span>
  );
}

// Full-height mobile-first page shell with the dark-blue header bar.
export function MinoxShell({
  children,
  showHeader = true,
}: {
  children: React.ReactNode;
  showHeader?: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {showHeader && (
        <header
          className="flex items-center justify-center px-4 py-3"
          style={{ backgroundColor: MINOX.ink }}
        >
          <MinoxLogo />
        </header>
      )}
      <main className="mx-auto w-full max-w-md px-4 pb-16 pt-5">{children}</main>
    </div>
  );
}
