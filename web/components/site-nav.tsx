"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Arena" },
  { href: "/architecture", label: "Architecture" },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="display text-lg tracking-tight text-[var(--fog)]"
        >
          Engage<span className="text-[var(--copper)]">Pulse</span>
        </Link>
        <div className="flex gap-1">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="mono rounded-sm px-2.5 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors"
                style={{
                  color: active ? "var(--ink)" : "var(--fog-mute)",
                  background: active
                    ? "linear-gradient(120deg, var(--copper), var(--teal))"
                    : "transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--fog-mute)]">
        live console · v0.1.0
      </p>
    </nav>
  );
}
