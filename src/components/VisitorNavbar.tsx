import type { MouseEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  DollarSign,
  GraduationCap,
  Handshake,
  Info,
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
import ctLogoPolished from "@/assets/ct-logo-polished-borders.webp";
import { cn } from "@/lib/utils";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import { useCTAAttribution } from "@/hooks/useCTAAttribution";

type VisitorLink = { label: string; href: string; icon: LucideIcon; sectionId?: string; exact?: boolean };

// Links in display order. Home is covered by the brand lockup. The programs
// page leads (B2B2C repositioning, 2026-10-15). Founders are the obvious
// audience, so they need no entry of their own, and investors wait until there
// are case studies to show them (2026-10-16).
const visitorLinks: VisitorLink[] = [
  { label: "For programs", href: "/for-programs", icon: GraduationCap },
];

// Everything else sits behind one Explore menu, so the bar stays short.
const exploreLinks: VisitorLink[] = [
  // exact, because /demo-studio and /demo-calls both start with /demo and would
  // otherwise light this entry up while the visitor is somewhere else entirely.
  { label: "How it works", href: "/demo", icon: PlayCircle, exact: true },
  { label: "Build", href: "/build", icon: Wrench },
  { label: "Collab", href: "/mentorship", icon: Handshake },
  { label: "News", href: "/newspaper", icon: Newspaper },
  { label: "Podcast", href: "/podcast", icon: Mic },
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
      "rounded-2xl px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      active
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
    );

  const linkClassName = (href: string, sectionId?: string, exact?: boolean) => navItemClass(isActive(href, sectionId, exact));

  const exploreActive = exploreLinks.some((item) => isActive(item.href, item.sectionId, item.exact));

  const renderMobileLink = (item: VisitorLink) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.label}
        to={item.href}
        className={cn(
          "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
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
      <div className="mx-auto max-w-[1344px] px-3 pt-3 sm:px-5 lg:px-8">
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
                src={ctLogoPolished}
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

            <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
              {/* Labels only: the audience names are long enough that icons would
                  crowd the bar at lg. */}
              {visitorLinks.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className={cn(linkClassName(item.href, item.sectionId, item.exact), "inline-flex items-center whitespace-nowrap")}
                  onClick={(event) => handleNavClick(event, item)}
                >
                  {item.label}
                </Link>
              ))}

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger
                  className={cn(navItemClass(exploreActive), "group inline-flex items-center gap-1 whitespace-nowrap")}
                  onClick={() => trackNavClick("Explore")}
                >
                  Explore
                  <ChevronDown
                    className="h-3.5 w-3.5 opacity-70 transition-transform group-data-[state=open]:rotate-180"
                    aria-hidden="true"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" sideOffset={10} className="w-52 rounded-2xl p-1.5">
                  {exploreLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.label} asChild className="cursor-pointer rounded-xl px-3 py-2.5">
                        <Link to={item.href} onClick={() => trackNavClick(`Explore ${item.label}`)}>
                          <Icon className="mr-2.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="ml-auto hidden items-center gap-2 pl-2 lg:flex xl:pl-4">
              <ThemeToggle />
              <Button asChild variant="ghost" size="sm">
                <Link to="/login" onClick={() => trackNavClick("Sign In")}>
                  Sign In
                </Link>
              </Button>
              <Button asChild size="sm" className="gap-2">
                <Link to="/#get-started" onClick={() => { trackNavClick("Join Today"); setAttribution('navbar_join_today', location.pathname); }}>
                  <Rocket className="h-4 w-4" aria-hidden="true" />
                  Join Today
                </Link>
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
                {visitorLinks.map(renderMobileLink)}

                <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                  Explore
                </p>
                {exploreLinks.map(renderMobileLink)}

                <div className="grid gap-2 border-t border-border/70 pt-3">
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/login" onClick={() => trackNavClick("Mobile Sign In")}>
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link to="/#get-started" onClick={() => { trackNavClick("Mobile Join Today"); setAttribution('navbar_join_today', location.pathname); }}>
                      <Rocket className="mr-2 h-4 w-4" aria-hidden="true" />
                      Join Today
                    </Link>
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
