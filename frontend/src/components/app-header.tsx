import type { LucideIcon } from "lucide-react";
import { Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { MorpholexLogo } from "@/components/morpholex-logo";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** The icons on the right of the header. */
const NAV: NavItem[] = [{ href: "/settings", label: "Settings", icon: Settings }];

interface AppHeaderProps {
  /** Called when the logo is clicked, e.g. to clear the home screen's results. */
  onLogoClick?: () => void;
}

/** The fixed bar at the top of every page: the logo and the links to the other pages. */
export function AppHeader({ onLogoClick }: AppHeaderProps) {
  const [location] = useLocation();

  return (
    <header className="fixed left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6">
      <Link href="/" onClick={onLogoClick} aria-label="Morpholex, home" className="rounded-md focus-visible:outline-2 focus-visible:outline-ring">
        <MorpholexLogo className="h-14 w-auto max-w-[250px] text-foreground sm:h-16 sm:max-w-[320px]" />
      </Link>

      <nav className="flex items-center gap-0.5 sm:gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = location === href || location.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              title={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted hover:text-foreground",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon size={18} />
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
