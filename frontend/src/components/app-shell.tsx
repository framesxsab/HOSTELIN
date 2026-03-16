import Link from "next/link";
import { ReactNode } from "react";

type AppSection = "dashboard" | "messmate" | "fixit" | "roomtab" | "parcelping";

type NavItem = {
  key: AppSection;
  href: string;
  icon: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/", icon: "grid_view", label: "Dashboard" },
  { key: "messmate", href: "/messmate", icon: "restaurant", label: "MessMate" },
  { key: "fixit", href: "/fixit", icon: "construction", label: "FixIt" },
  { key: "roomtab", href: "/roomtab", icon: "account_balance_wallet", label: "RoomTab" },
  { key: "parcelping", href: "/parcelping", icon: "package_2", label: "ParcelPing" },
];

export function AppShell({
  active,
  children,
}: {
  active: AppSection;
  children: ReactNode;
}) {
  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <header className="flex items-center justify-between border-b border-accent-dark/30 bg-background-dark/80 backdrop-blur-md px-6 py-3 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-background-dark">
              <span className="material-symbols-outlined font-bold">terminal</span>
            </div>
            <div className="flex flex-col">
              <h2 className="text-white font-mono text-sm font-bold leading-tight tracking-tight uppercase">
                HostelOS <span className="text-primary">v4.0.2</span>
              </h2>
              <span className="text-[10px] text-primary/70 font-mono tracking-widest">BUNKY_DASHBOARD_STABLE</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex size-9 cursor-pointer items-center justify-center rounded-lg bg-neutral-dark hover:bg-accent-dark text-slate-300 transition-colors">
            <span className="material-symbols-outlined text-xl">notifications</span>
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-accent-dark/50">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-mono font-bold text-white">DEB_9921</p>
              <p className="text-[10px] font-mono text-primary">ADMIN_ACCESS</p>
            </div>
            <div className="bg-primary/20 border border-primary/50 rounded-full p-0.5">
              <div className="size-8 rounded-full bg-neutral-dark flex items-center justify-center overflow-hidden" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r border-accent-dark/30 bg-background-dark hidden lg:flex lg:flex-col p-4 gap-6">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-mono font-bold text-slate-500 px-3 uppercase tracking-wider mb-2">Main Menu</p>
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = item.key === active;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={
                      isActive
                        ? "flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20"
                        : "flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-neutral-dark hover:text-slate-100 transition-all"
                    }
                  >
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                    <span className="text-sm font-mono">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="mt-auto p-4 rounded-xl border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-lg">bolt</span>
              <p className="text-xs font-mono font-bold text-white tracking-tight uppercase">AI Engine</p>
            </div>
            <p className="text-[10px] font-mono text-slate-400 mb-3 leading-relaxed">Bunky AI is learning your routine. Network optimizations pending.</p>
            <div className="w-full bg-accent-dark h-1 rounded-full overflow-hidden">
              <div className="bg-primary h-full w-[65%]" />
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">{children}</main>
      </div>
    </div>
  );
}
