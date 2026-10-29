import type { MouseEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BookMarked,
  Building2,
  CalendarDays,
  ChevronDown,
  Compass,
  DollarSign,
  Handshake,
  IdCard,
  Info,
  Lightbulb,
  type LucideIcon,
  Menu,
  Mic,
  Newspaper,
  PlayCircle,
  Rocket,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/ThemeToggle";
import ctLogoNav44 from "@/assets/ct-logo-small-44.webp";
import ctLogoNav88 from "@/assets/ct-logo-small-88.webp";
import ctLogoNav132 from "@/assets/ct-logo-small-132.webp";
import { cn } from "@/lib/utils";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import { useCTAAttribution } from "@/hooks/useCTAAttribution";

type VisitorLink = { label: string; href: string; icon: LucideIcon; sectionId?: string; exact?: boolean };
type VisitorMenu = { label: string; links: VisitorLink[]; icon: LucideIcon };
type VisitorEntry = VisitorLink | VisitorMenu;

const isMenu = (entry: VisitorEntry): entry is VisitorMenu => "links" in entry;

// The For founders menu's contents: what founders build, who they work with,
// and the Founder ID page (2026-10-21).
const founderLinks: VisitorLink[] = [
  { label: "Build", href: "/build", icon: Wrench },
  { label: "Collab", href: "/mentorship", icon: Handshake },
  { label: "Founder ID", href: "/founder-id", icon: IdCard },
];

// The Explore menu's contents.
const exploreLinks: VisitorLink[] = [
  { label: "Newspaper", href: "/newspaper", icon: Newspaper },
  { label: "Podcast", href: "/podcast", icon: Mic },
  // Startup Pedia, the knowledge hub that replaced /answers (2026-10-25).
  { label: "Startup Pedia", href: "/startup-pedia", icon: BookMarked },
];

// The bar in display order (2026-10-17). Home is covered by the brand lockup.
// For founders and Enterprise sit side by side, one per audience (B2B2C
// repositioning); Enterprise is the programs page.
const visitorEntries: VisitorEntry[] = [
  // exact, because /demo-studio and /demo-calls both start with /demo and would
  // otherwise light this entry up while the visitor is somewhere else entirely.
  { label: "How it works", href: "/demo", icon: PlayCircle, exact: true },
  { label: "For founders", links: founderLinks, icon: Lightbulb },
  { label: "Enterprise", href: "/enterprise", icon: Building2 },
  { label: "Explore", links: exploreLinks, icon: Compass },
  { label: "About", href: "/about", icon: Info },
  { label: "Pricing", href: "/pricing", icon: DollarSign },
];

import { useWorkspaceFrame } from '@/contexts/WorkspaceFrameContext';

const VisitorNavbar = () => {
  const inWorkspace = useWorkspaceFrame();
  return inWorkspace ? null : <LegacyVisitorNavbar />;
};

const LegacyVisitorNavbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { trackClick } = usePageAnalytics();
  const { set: setAttribution } = useCTAAttribution();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  // On /enterprise the visitor is a program, not a founder, so the main button
  // books a pilot call (the form on that page) instead of founder sign-up.
  const onEnterprise = location.pathname === "/enterprise";

  const isActive = (href: string, sectionId?: string, exact?: boolean) => {
    if (sectionId) {
      return false;
    }

    if (href === "/" || exact) {
      return location.pathname === href && !location.hash;
    }

    return location.pathname.startsWith(href);
  };

  const trackNavClick = (label: string) => {
    trackClick(`VisitorNavbar - ${label}`, "Navigation");
  };

  const handleNavClick = (
    event: MouseEvent<HTMLAnchorElement>,
    item: VisitorLink,
    trackingLabel = item.label
  ) => {
    trackNavClick(trackingLabel);

    if (!item.sectionId) return;

    event.preventDefault();
    setMobileOpen(false);
    navigate("/", { state: { scrollToSection: item.sectionId } });
  };

  const navItemClass = (active: boolean) =>
    cn(
      "rounded-2xl px-2 py-2 text-sm font-medium transition-colors xl:px-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      active
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
    );

  const linkClassName = (href: string, sectionId?: string, exact?: boolean) => navItemClass(isActive(href, sectionId, exact));

  const renderMobileLink = (item: VisitorLink, nested = false) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.label}
        to={item.href}
        className={cn(
          "flex items-center gap-3 rounded-xl py-3 text-sm font-medium transition-colors",
          nested ? "pl-8 pr-4" : "px-4",
          isActive(item.href, item.sectionId, item.exact)
            ? "bg-background text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )}
        onClick={(event) => handleNavClick(event, item, `Mobile ${item.label}`)}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {item.label}
      </Link>
    );
  };

  return (
    <nav
      style={{ top: "var(--banner-height, 0)" } as React.CSSProperties}
      className="fixed left-0 right-0 z-50 transition-all duration-300"
      aria-label="Visitor navigation"
    >
      <div className="mx-auto max-w-[1440px] px-3 pt-3 sm:px-5 lg:px-8">
        <div
          className={cn(
            "rounded-3xl border backdrop-blur-xl transition-all duration-300",
            scrolled
              ? "border-border/80 bg-background/92 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.32)]"
              : "border-border/68 bg-background/76 shadow-[0_12px_32px_-26px_rgba(15,23,42,0.22)]"
          )}
        >
          <div className="flex h-16 items-center gap-3 px-3 sm:px-4 lg:h-[70px] lg:px-6">
            <Link
              to="/"
              className="flex shrink-0 items-center gap-4 rounded-xl pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 xl:pr-5"
              aria-label="Creatives Takeover home"
              onClick={() => trackNavClick("Logo")}
            >
              <img
                src={ctLogoNav44}
                srcSet={`${ctLogoNav44} 1x, ${ctLogoNav88} 2x, ${ctLogoNav132} 3x`}
                alt="Creatives Takeover"
                className="site-nav-logo animate-logo-breathing nav-logo-hover h-11 w-11 shrink-0"
                width={44}
                height={44}
                decoding="async"
              />
              <span className="hidden shrink-0 flex-col whitespace-nowrap leading-tight xl:flex">
                <span className="font-space-grotesk text-[13px] font-semibold text-foreground">
                  Creatives Takeover
                </span>
                <span className="text-[11px] tracking-[0.01em] text-muted-foreground">Think. Test. Ship.</span>
              </span>
            </Link>

            <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex xl:gap-2 2xl:gap-3">
              {/* Each entry keeps its icon on the left. Six entries only fit with
                  icons from 2xl; below that the labels carry it. */}
              {visitorEntries.map((entry) =>
                isMenu(entry) ? (
                  <DropdownMenu key={entry.label} modal={false}>
                    <DropdownMenuTrigger
                      className={cn(
                        navItemClass(entry.links.some((item) => isActive(item.href, item.sectionId, item.exact))),
                        "group inline-flex items-center gap-1 whitespace-nowrap 2xl:gap-2"
                      )}
                      onClick={() => trackNavClick(entry.label)}
                    >
                      <entry.icon className="hidden h-4 w-4 shrink-0 2xl:block" aria-hidden="true" />
                      {entry.label}
                      <ChevronDown
                        className="h-3.5 w-3.5 opacity-70 transition-transform group-data-[state=open]:rotate-180"
                        aria-hidden="true"
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" sideOffset={10} className="w-52 rounded-2xl p-1.5">
                      {entry.links.map((item) => {
                        const Icon = item.icon;
                        return (
                          <DropdownMenuItem key={item.label} asChild className="cursor-pointer rounded-xl px-3 py-2.5">
                            <Link to={item.href} onClick={() => trackNavClick(`${entry.label} ${item.label}`)}>
                              <Icon className="mr-2.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                              {item.label}
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link
                    key={entry.label}
                    to={entry.href}
                    className={cn(linkClassName(entry.href, entry.sectionId, entry.exact), "inline-flex items-center gap-2 whitespace-nowrap")}
                    onClick={(event) => handleNavClick(event, entry)}
                  >
                    <entry.icon className="hidden h-4 w-4 shrink-0 2xl:block" aria-hidden="true" />
                    {entry.label}
                  </Link>
                )
              )}
            </div>

            <div className="ml-auto hidden items-center gap-2 pl-2 lg:flex xl:pl-4">
              <ThemeToggle />
              <Button asChild variant="ghost" size="sm">
                <Link to="/login" onClick={() => trackNavClick("Sign In")}>
                  Sign In
                </Link>
              </Button>
              <Button asChild size="sm" className="gap-2">
                {onEnterprise ? (
                  <Link to="/enterprise#talk" onClick={() => trackNavClick("Book a pilot call")}>
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    Book a pilot call
                  </Link>
                ) : (
                  <Link to="/signup" onClick={() => { trackNavClick("Join Today"); setAttribution('navbar_join_today', location.pathname); }}>
                    <Rocket className="h-4 w-4" aria-hidden="true" />
                    Join Today
                  </Link>
                )}
              </Button>
            </div>

            <div className="ml-auto flex items-center gap-1 lg:hidden">
              <ThemeToggle />
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={mobileOpen}
                aria-controls="visitor-mobile-menu"
                onClick={() => setMobileOpen((open) => !open)}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div
            id="visitor-mobile-menu"
            className={cn(
              "grid overflow-hidden transition-[grid-template-rows] duration-300 lg:hidden",
              mobileOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            )}
          >
            <div className="min-h-0">
              <div className="space-y-2 border-t border-border/70 px-3 py-4 sm:px-4">
                {visitorEntries.map((entry) =>
                  isMenu(entry) ? (
                    <div key={entry.label}>
                      <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                        {entry.label}
                      </p>
                      {entry.links.map((item) => renderMobileLink(item, true))}
                    </div>
                  ) : (
                    renderMobileLink(entry)
                  )
                )}

                <div className="grid gap-2 border-t border-border/70 pt-3">
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/login" onClick={() => trackNavClick("Mobile Sign In")}>
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild className="w-full">
                    {onEnterprise ? (
                      <Link to="/enterprise#talk" onClick={() => trackNavClick("Mobile Book a pilot call")}>
                        <CalendarDays className="mr-2 h-4 w-4" aria-hidden="true" />
                        Book a pilot call
                      </Link>
                    ) : (
                      <Link to="/signup" onClick={() => { trackNavClick("Mobile Join Today"); setAttribution('navbar_join_today', location.pathname); }}>
                        <Rocket className="mr-2 h-4 w-4" aria-hidden="true" />
                        Join Today
                      </Link>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default VisitorNavbar;
