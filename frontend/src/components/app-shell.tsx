"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { AmbientEffects } from "@/components/ambient-effects";
import { UiIcon, type UiIconName } from "@/components/ui-icon";
import { useAuthStore } from "@/lib/auth-store";

type AppSection = "dashboard" | "messmate" | "fixit" | "roomtab" | "parcelping" | "admin";

type NavItem = {
  key: AppSection;
  href: string;
  icon: UiIconName;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/", icon: "grid_view", label: "Dashboard" },
  { key: "messmate", href: "/messmate", icon: "restaurant", label: "MessMate" },
  { key: "fixit", href: "/fixit", icon: "construction", label: "FixIt" },
  { key: "roomtab", href: "/roomtab", icon: "account_balance_wallet", label: "RoomTab" },
  { key: "parcelping", href: "/parcelping", icon: "package_2", label: "ParcelPing" },
  { key: "admin", href: "/admin", icon: "terminal", label: "Admin" },
];

export function AppShell({
  active,
  children,
}: {
  active: AppSection;
  children: ReactNode;
}) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => item.key !== "admin" || (user && user.role === "admin")
  );

  const displayName = user?.username?.toUpperCase() ?? "GUEST";
  const displayRole = user?.role?.toUpperCase() ?? "LOCAL_ACCESS";
  const mobileGridCols = visibleNavItems.length <= 5 ? "grid-cols-5" : "grid-cols-6";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden bg-background-light text-slate-900 dark:bg-background-dark dark:text-slate-100 font-display">
      <AmbientEffects />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="floaty absolute -left-20 top-20 size-72 rounded-full bg-primary/6 blur-3xl" />
        <div className="floaty absolute right-0 top-10 size-80 rounded-full bg-slate-300/5 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-primary/8 pulse-soft" />
      </div>
      <header className="pixel-panel relative z-10 flex flex-col gap-3 border-b border-accent-dark/30 bg-background-dark/78 px-4 py-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-6 rounded-none">
        <div className="min-w-0 flex items-center gap-3 sm:gap-6">
          <div className="min-w-0 flex items-center gap-3">
            <div className="size-8 shrink-0 rounded bg-primary/90 text-background-dark flex items-center justify-center">
              <UiIcon name="terminal" className="size-4" />
            </div>
            <div className="min-w-0 flex flex-col">
              <h2 className="truncate text-white font-mono text-sm font-bold leading-tight tracking-tight uppercase sm:text-[15px]">
                HostelOS
              </h2>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
          <button className="pixel-control flex size-9 cursor-pointer items-center justify-center rounded bg-neutral-dark hover:bg-accent-dark text-slate-300 transition-colors">
            <UiIcon name="notifications" className="size-5" />
          </button>
          <div className="hidden items-center gap-3 pl-2 lg:flex lg:pl-4 border-l border-accent-dark/50">
            <div className="text-right">
              <p className="text-xs font-mono font-bold text-white">{displayName}</p>
              <p className="text-[10px] font-mono text-slate-400">{displayRole}</p>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-full p-0.5">
              <div className="size-8 rounded-full bg-neutral-dark flex items-center justify-center overflow-hidden text-primary text-xs font-bold font-mono">
                {user?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            </div>
          </div>
          {user && (
            <button
              onClick={handleLogout}
              title="Logout"
              className="pixel-control flex size-9 cursor-pointer items-center justify-center rounded bg-neutral-dark hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors"
            >
              <UiIcon name="logout" className="size-4" />
            </button>
          )}
        </div>
      </header>

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="pixel-panel w-64 border-r border-accent-dark/30 bg-background-dark/66 hidden lg:flex lg:flex-col p-4 gap-6 rounded-none">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-mono font-bold text-slate-500 px-3 uppercase tracking-wider mb-2">Workspace</p>
            <nav className="flex flex-col gap-1">
              {visibleNavItems.map((item) => {
                const isActive = item.key === active;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={
                      isActive
                        ? "flex items-center gap-3 px-3 py-2 rounded bg-primary/10 text-slate-100 border border-primary/15"
                        : "flex items-center gap-3 px-3 py-2 rounded text-slate-400 hover:bg-neutral-dark hover:text-slate-100 transition-all"
                    }
                  >
                    <UiIcon name={item.icon} className="size-5" />
                    <span className="text-sm font-mono">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="mt-auto" />
        </aside>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">{children}</main>

        <nav className="pixel-panel lg:hidden border-t border-accent-dark/30 bg-background-dark/78 px-2 py-2 rounded-none">
          <div className={`grid ${mobileGridCols} gap-1`}>
            {visibleNavItems.map((item) => {
              const isActive = item.key === active;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={
                    isActive
                      ? "flex flex-col items-center gap-1 rounded border border-primary/30 bg-primary/10 px-1 py-2 text-primary"
                      : "flex flex-col items-center gap-1 rounded border border-transparent px-1 py-2 text-slate-400 hover:bg-neutral-dark hover:text-slate-100"
                  }
                >
                  <UiIcon name={item.icon} className="size-4" />
                  <span className="text-[10px] font-mono leading-none">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
