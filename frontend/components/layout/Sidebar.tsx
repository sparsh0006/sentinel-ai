"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "/", label: "Architect", icon: "🏗" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/workflows", label: "Workflows", icon: "🔄" },
  { href: "/monitoring", label: "Monitoring", icon: "📈" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-surface-1 border-r border-surface-3 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-surface-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-lg font-bold">
            A
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">AI Architect</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">
              MCP • Archestra • n8n
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                isActive
                  ? "bg-brand-600/15 text-brand-400 font-medium"
                  : "text-gray-400 hover:text-white hover:bg-surface-3"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Status Footer */}
      <div className="px-4 py-4 border-t border-surface-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse-slow" />
          System Online
        </div>
      </div>
    </aside>
  );
}