"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/access";

const ownerLinks = [
  ["/", "Today"],
  ["/tomorrow", "Tomorrow"],
  ["/places", "Places"],
  ["/calendar", "Calendar"],
  ["/todos", "To-dos"],
  ["/notes", "Notes"],
  ["/printer", "Printer"],
  ["/users", "Users"],
];

const memberLinks = [
  ["/todos", "To-dos"],
  ["/notes", "Notes"],
];

export function Shell({ role, children }: { role: Role; children: React.ReactNode }) {
  const pathname = usePathname();
  const links = role === "owner" ? ownerLinks : memberLinks;
  return (
    <>
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-x-8 gap-y-3 px-5 py-5">
          <Link href={role === "owner" ? "/" : "/todos"} className="font-serif text-3xl italic leading-none tracking-tight">
            Roundup
          </Link>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {links.map(([href, label]) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={active ? "underline decoration-stamp decoration-2 underline-offset-4" : "text-muted"}
                    aria-current={active ? "page" : undefined}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
            <form action="/api/auth/logout" method="post">
              <button className="btn-text text-sm" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8 md:py-12">{children}</main>
    </>
  );
}
