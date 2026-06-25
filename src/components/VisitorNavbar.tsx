import type { MouseEvent } from "react";
import { Fragment, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  ChevronDown,
  DollarSign,
  FlaskConical,
  Gift,
  GraduationCap,
  Info,
  type LucideIcon,
  Menu,
  Mic,
  Newspaper,
  Radio,
  Rocket,
  Rss,
  Target,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/ThemeToggle";
import ctLogoPolished from "@/assets/ct-logo-polished-borders.webp";
import { cn } from "@/lib/utils";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import { useCTAAttribution } from "@/hooks/useCTAAttribution";
import { captureEvent } from "@/lib/analytics";

type VisitorLink = { label: string; href: string; icon: LucideIcon; sectionId?: string };
type VisitorMenuItem = { label: string; href: string; icon: LucideIcon; description: string };
type VisitorMenu = { label: string; icon: LucideIcon; tagline: string; taglineIcon?: LucideIcon; items: VisitorMenuItem[] };

// Simple links, in display order. The Gifts menu renders first and the Media menu is
// injected right after "Learn" (see the render below). Final order:
// Gifts · Build · Learn · Media · About Us · Pricing. (Home is intentionally omitted —
// the logo already links home.)
const visitorLinks: VisitorLink[] = [
  { label: "Build", href: "/build", icon: Zap },
  { label: "Learn", href: "/mentorship", icon: GraduationCap },
  { label: "About Us", href: "/about", icon: Info },
  { label: "Pricing", href: "/pricing", icon: DollarSign },
];

// Free Tools menu — logged-out visitors can use these tools before signing up.
// Each lands on a usable public experience that gates only the deliverable.
const freeToolsItems: VisitorMenuItem[] = [
  {
    label: "ICP Builder",
    href: "/icp-builder",
    icon: Target,
    description: "Find your ideal customer from two sentences.",
  },
  {
    label: "Pitch Deck Analyzer",
    href: "/pitch-deck-analyzer",
    icon: BarChart3,
    description: "Score your deck across 6 investor dimensions.",
  },
  {
    label: "Insighta Test",
    href: "/insighta-test",
    icon: FlaskConical,
    description: "Check your fundraising readiness in minutes.",
  },
  {
    label: "Tech Stack Builder",
    href: "/tech-stack",
    icon: Boxes,
    description: "Plan your startup stack and monthly budget.",
  },
];

const giftsMenu: VisitorMenu = {
  label: "Gifts",
  icon: Gift,
  tagline: "From Creatives Takeover with 💙",
  items: freeToolsItems,
};

// Media menu — content & conversations under one roof.
const mediaMenu: VisitorMenu = {
  label: "Media",
  icon: Radio,
  tagline: "News & Stories",
  taglineIcon: Rss,
  items: [
    { label: "Podcast", href: "/podcast", icon: Mic, description: "Founders Unleashed." },
    { label: "Newspaper", href: "/newspaper", icon: Newspaper, description: "What founders learn the hard way." },
  ],
};

const VisitorNavbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMobileMenu, setOpenMobileMenu] = useState<string | null>(null);
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
    setOpenMobileMenu(null);
  }, [location.pathname, location.hash]);

  const isActive = (href: string, sectionId?: string) => {
    if (sectionId) {
      return false;
    }

    if (href === "/") {
      return location.pathname === "/" && !location.hash;
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

  const linkClassName = (href: string, sectionId?: string) => navItemClass(isActive(href, sectionId));

  const menuActive = (menu: VisitorMenu) =>
    menu.items.some((item) => location.pathname.startsWith(item.href));

  const handleMenuOpen = (menu: VisitorMenu, source: "desktop" | "mobile") => {
    trackNavClick(menu.label);
    captureEvent(menu.label === "Gifts" ? "free_tools_menu_opened" : "visitor_menu_opened", {
      menu: menu.label,
      source: `visitor_navbar_${source}`,
    });
  };

  const renderDesktopMenu = (menu: VisitorMenu) => {
    const MenuIcon = menu.icon;
    const TaglineIcon = menu.taglineIcon;
    return (
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) handleMenuOpen(menu, "desktop");
        }}
      >
        <DropdownMenuTrigger className={cn(navItemClass(menuActive(menu)), "inline-flex items-center gap-2")}>
          <MenuIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {menu.label}
          <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-max">
          <DropdownMenuLabel className="flex items-center justify-between gap-6">
            <span>{menu.tagline}</span>
            {TaglineIcon && <TaglineIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {menu.items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  to={item.href}
                  onClick={() => trackNavClick(`${menu.label} - ${item.label}`)}
                  className="cursor-pointer"
                >
                  <ItemIcon className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
                  <div className="flex flex-col">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </div>
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const renderMobileMenu = (menu: VisitorMenu) => {
    const MenuIcon = menu.icon;
    const open = openMobileMenu === menu.label;
    return (
      <div>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
            menuActive(menu)
              ? "bg-background text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
          aria-expanded={open}
          onClick={() =>
            setOpenMobileMenu((current) => {
              const next = current === menu.label ? null : menu.label;
              if (next) handleMenuOpen(menu, "mobile");
              return next;
            })
          }
        >
          <span className="flex items-center gap-3">
            <MenuIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {menu.label}
          </span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
        </button>
        {open && (
          <div className="ml-7 mt-1 space-y-1">
            {menu.items.map((item) => {
              const ItemIcon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  onClick={() => trackNavClick(`Mobile ${menu.label} - ${item.label}`)}
                >
                  <ItemIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav
      style={{ top: "var(--banner-height, 0)" } as React.CSSProperties}
      className="fixed left-0 right-0 z-50 transition-all duration-300"
      aria-label="Visitor navigation"
    >
      <div className="mx-auto max-w-[1600px] px-3 pt-3 sm:px-5 lg:px-8">
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
              className="flex min-w-0 items-center gap-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              <span className="hidden min-w-0 flex-col leading-tight xl:flex">
                <span className="font-space-grotesk text-sm font-semibold text-foreground">
                  Creatives Takeover
                </span>
                <span className="text-label text-muted-foreground">Think. Build. Ship. Connect.</span>
              </span>
            </Link>

            <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
              {renderDesktopMenu(giftsMenu)}
              {visitorLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Fragment key={item.label}>
                    <Link
                      to={item.href}
                      className={cn(linkClassName(item.href, item.sectionId), "inline-flex items-center gap-2")}
                      onClick={(event) => handleNavClick(event, item)}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {item.label}
                    </Link>

                    {item.label === "Learn" && renderDesktopMenu(mediaMenu)}
                  </Fragment>
                );
              })}
            </div>

            <div className="ml-auto hidden items-center gap-2 lg:flex">
              <ThemeToggle />
              <Button asChild variant="ghost" size="sm">
                <Link to="/login" onClick={() => trackNavClick("Sign In")}>
                  Sign In
                </Link>
              </Button>
              <Button asChild size="sm" className="gap-2">
                <Link to="/signup" onClick={() => { trackNavClick("Join Today"); setAttribution('navbar_join_today', location.pathname); }}>
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
                {renderMobileMenu(giftsMenu)}
                {visitorLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Fragment key={item.label}>
                      <Link
                        to={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                          isActive(item.href, item.sectionId)
                            ? "bg-background text-foreground"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        )}
                        onClick={(event) => handleNavClick(event, item, `Mobile ${item.label}`)}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {item.label}
                      </Link>

                      {item.label === "Learn" && renderMobileMenu(mediaMenu)}
                    </Fragment>
                  );
                })}

                <div className="grid gap-2 border-t border-border/70 pt-3">
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/login" onClick={() => trackNavClick("Mobile Sign In")}>
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link to="/signup" onClick={() => { trackNavClick("Mobile Join Today"); setAttribution('navbar_join_today', location.pathname); }}>
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
