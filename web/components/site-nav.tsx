"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Arena" },
  { href: "/architecture", label: "Architecture" },
] as const;

type Props = {
  apiOnline?: boolean | null;
};

export function SiteNav({ apiOnline }: Props) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/"
          className="focus-ring display text-lg tracking-tight text-[var(--fog)]"
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
                aria-current={active ? "page" : undefined}
                data-active={active ? "true" : "false"}
                className="nav-link focus-ring mono inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm px-3 py-2 text-[11px] uppercase tracking-[0.16em]"
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
      {apiOnline === undefined ? null : (
        <p className="mono inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--fog-mute)]">
          <span
            className={`live-dot h-1.5 w-1.5 rounded-full ${
              apiOnline ? "bg-[var(--teal)]" : "bg-[var(--ember)]"
            }`}
            aria-hidden
          />
          {apiOnline == null
            ? "Go service probing"
            : apiOnline
              ? "Go service online"
              : "Go service offline"}
        </p>
      )}
    </nav>
  );
}
