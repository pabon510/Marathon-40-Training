"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/today", label: "Today", icon: "☀️" },
  { href: "/plan", label: "Plan", icon: "📅" },
  { href: "/workouts", label: "Workout", icon: "🏋️" },
  { href: "/progress", label: "Progress", icon: "📈" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <ul className="grid grid-cols-5">
        {LINKS.map((link) => {
          const active = pathname?.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-touch flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium ${
                  active ? "text-brand-700" : "text-slate-500"
                }`}
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  {link.icon}
                </span>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden w-56 shrink-0 border-r border-slate-200 bg-white md:block">
      <div className="p-4 text-lg font-bold text-slate-900">Marathon 40</div>
      <ul className="space-y-1 px-2">
        {LINKS.map((link) => {
          const active = pathname?.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-touch items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span aria-hidden="true">{link.icon}</span>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
