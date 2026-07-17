"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Megaphone,
  Menu,
  X,
  LogOut,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo, LogoMark } from "@/components/logo";
import { signOut } from "@/app/login/actions";
import type { UserProfile } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/production", label: "Production", icon: ClipboardList },
  { href: "/content", label: "Content", icon: Megaphone },
  { href: "/admin", label: "Assessment", icon: Sparkles },
  { href: "/search", label: "Search", icon: Search },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </>
  );
}

export function AppNav({ profile }: { profile: UserProfile }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center border-b px-4">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <NavLinks />
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 px-1">
            <p className="truncate text-sm font-medium">{profile.name}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">
              {profile.role}
              {profile.department ? ` · ${profile.department}` : ""}
            </p>
          </div>
          <form action={signOut}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
        <Logo compact markSize="h-7 w-7" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute left-0 top-0 flex h-full w-64 flex-col bg-card shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-14 items-center justify-between border-b px-4">
              <span className="flex items-center gap-2">
                <LogoMark className="h-7 w-7" />
                <span className="font-semibold">Menu</span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1 p-3">
              <NavLinks onNavigate={() => setOpen(false)} />
            </nav>
            <div className="border-t p-3">
              <p className="mb-2 px-1 text-sm font-medium">{profile.name}</p>
              <form action={signOut}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
