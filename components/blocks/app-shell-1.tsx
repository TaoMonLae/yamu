"use client";

import { SignOutButton, UserButton } from "@clerk/nextjs";
import { ChevronRight, ExternalLink, LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { AdminIdentity } from "@/lib/auth";

export type AppShellItem = {
  id: string;
  label: string;
  detail: string;
  icon: LucideIcon;
  badge?: number;
  hidden?: boolean;
};

type Props = {
  identity: AdminIdentity;
  siteName: string;
  logoUrl: string | null;
  items: AppShellItem[];
  activeId: string;
  onNavigate: (id: string) => void;
  children: ReactNode;
  actions?: ReactNode;
};

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--index-accent)] focus-visible:ring-offset-2";

export default function AppShell1({ identity, siteName, logoUrl, items, activeId, onNavigate, children, actions }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleItems = items.filter((item) => !item.hidden);
  const active = visibleItems.find((item) => item.id === activeId) ?? visibleItems[0];

  const navigate = (id: string) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-[#141415] text-[#f8f7f3]">
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <button type="button" onClick={() => navigate("overview")} className={`${focus} flex items-center gap-3 text-left`}>
          <BrandMark logoUrl={logoUrl} className="h-9 w-9" />
          <span>
            <span className="block text-[13px] font-semibold tracking-[-0.01em]">{siteName}</span>
            <span className="block font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">Catalog operations</span>
          </span>
        </button>
        <button type="button" onClick={() => setMobileOpen(false)} className={`${focus} p-2 text-white/60 lg:hidden`} aria-label="Close navigation"><X className="h-4 w-4" /></button>
      </div>

      <nav aria-label="Admin sections" className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">Workspace</p>
        <div className="mt-3 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const selected = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                aria-current={selected ? "page" : undefined}
                className={`${focus} group relative flex min-h-11 w-full items-center gap-3 px-3 text-left transition-colors ${selected ? "bg-white/10 text-white" : "text-white/58 hover:bg-white/[0.06] hover:text-white"}`}
              >
                {selected ? <span className="absolute inset-y-2 left-0 w-0.5 bg-[var(--index-accent)]" /> : null}
                <Icon aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.7} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium">{item.label}</span>
                  <span className="block truncate text-[10px] text-white/35">{item.detail}</span>
                </span>
                {typeof item.badge === "number" ? <span className="min-w-6 bg-white/10 px-1.5 py-0.5 text-center font-mono text-[10px] text-white/65">{item.badge}</span> : null}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 p-4">
        <ThemeToggle variant="sidebar" />
        <div className="flex items-center gap-3">
          <UserButton appearance={{ elements: { avatarBox: "h-9 w-9 rounded-[2px]" } }} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium">{identity.name}</p>
            <p className="truncate text-[10px] text-white/40">{identity.email}</p>
            <span className="mt-1.5 inline-flex border border-white/15 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-white/55">{identity.role}</span>
          </div>
          <SignOutButton redirectUrl="/">
            <button type="button" aria-label="Sign out" title="Sign out" className={`${focus} inline-flex h-10 w-10 shrink-0 items-center justify-center border border-white/15 text-white/55 transition-colors hover:border-white/35 hover:bg-white/[0.08] hover:text-white focus-visible:ring-offset-[#141415]`}>
              <LogOut aria-hidden className="h-4 w-4" strokeWidth={1.7} />
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink [--rb-accent:var(--index-accent)] [--rb-r-md:2px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/45" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />
          <aside className="relative h-full w-[min(86vw,288px)]">{sidebar}</aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-pewter bg-canvas/95 px-4 backdrop-blur md:px-7">
          <button type="button" onClick={() => setMobileOpen(true)} className={`${focus} -ml-1 p-2 lg:hidden`} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
          <div className="flex min-w-0 flex-1 items-center gap-2 text-[12px] text-stone">
            <span>Admin</span><ChevronRight className="h-3.5 w-3.5" /><span className="truncate font-medium text-ink">{active?.label}</span>
          </div>
          <a href="/" target="_blank" className={`${focus} hidden items-center gap-2 border border-pewter bg-paper px-3 py-2 text-[11px] font-medium text-ash no-underline hover:border-ink sm:inline-flex`}>
            View public site <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {actions}
        </header>
        <main className="mx-auto w-full max-w-[1480px] px-4 py-6 md:px-7 md:py-8">{children}</main>
      </div>
    </div>
  );
}
