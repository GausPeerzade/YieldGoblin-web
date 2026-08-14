"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { GoblinMark } from "@/components/brand/goblin-mark";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Markets" },
  { href: "/my-vaults", label: "My Vaults" },
  { href: "/rewards", label: "Rewards" },
  { href: "/activity", label: "Activity" },
  { href: "/docs", label: "How it works" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/vault") : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <GoblinMark className="size-9" />
          <span className="text-lg font-semibold tracking-tight">Yield Goblin</span>
          <span
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400"
            title="Unaudited beta — use a test wallet only"
          >
            Beta
          </span>
        </Link>

        <nav className="mx-auto hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              {isActive(item.href) ? (
                <span className="absolute inset-x-3 -bottom-[21px] h-0.5 rounded-full bg-primary" />
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle />
          <ConnectWalletButton />
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "md:hidden",
              )}
              aria-label="Menu"
            >
              <Menu className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {NAV.map((item) => (
                <DropdownMenuItem
                  key={item.href}
                  render={<Link href={item.href}>{item.label}</Link>}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
