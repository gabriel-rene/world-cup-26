"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getMeta } from "@/lib/snapshot";

const LINKS = [
  { href: "/", label: "Feed" },
  { href: "/explore", label: "Explorer" },
  { href: "/teams", label: "Teams" },
  { href: "/about", label: "Methodology" },
] as const;

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="wordmark">
          <span className="wordmark-title">Fun Correlations</span>
          <span className="wordmark-tournament">{getMeta().tournament}</span>
        </Link>
        <nav className="site-nav" aria-label="Sections">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
