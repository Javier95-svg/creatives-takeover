import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import ctLogoPolished from "@/assets/ct-logo-polished-borders.png";
import { cn } from "@/lib/utils";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";

const visitorLinks = [
  { label: "Home", href: "/" },
  { label: "How It Works", href: "/#startup-development-cycle" },
  { label: "Features", href: "/#what-you-get" },
  { label: "Coaches", href: "/community" },
  { label: "Newspaper", href: "/newspaper" },
  { label: "About Us", href: "/about" },
  { label: "Pricing", href: "/pricing" },
];

const VisitorNavbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { trackClick } = usePageAnalytics();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  const isActive = (href: string) => {
    if (href.startsWith("/#")) {
      return location.pathname === "/" && location.hash === href.slice(1);
    }

    if (href === "/") {
      return location.pathname === "/" && !location.hash;
    }

    return location.pathname.startsWith(href);
  };

  const trackNavClick = (label: string) => {
    trackClick(`VisitorNavbar - ${label}`, "Navigation");
  };

  const linkClassName = (href: string) =>
    cn(
      "rounded-[14px] px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      isActive(href)
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
    );

  return (
    <nav
      style={{ top: "var(--banner-height, 0)" } as React.CSSProperties}
      className="fixed left-0 right-0 z-50 transition-all duration-300"
      aria-label="Visitor navigation"
    >
      <div className="mx-auto max-w-[1600px] px-3 pt-3 sm:px-5 lg:px-8">
        <div
          className={cn(
            "rounded-[22px] border backdrop-blur-xl transition-all duration-300",
            scrolled
              ? "border-border/80 bg-background/92 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.32)]"
              : "border-border/68 bg-background/76 shadow-[0_12px_32px_-26px_rgba(15,23,42,0.22)]"
          )}
        >
          <div className="flex h-16 items-center gap-3 px-3 sm:px-4 lg:h-[70px] lg:px-6">
            <Link
              to="/"
              className="flex min-w-0 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Creatives Takeover home"
              onClick={() => trackNavClick("Logo")}
            >
              <img
                src={ctLogoPolished}
                alt="Creatives Takeover"
                className="h-11 w-11 shrink-0"
                width={44}
                height={44}
                decoding="async"
              />
              <span className="hidden min-w-0 flex-col leading-tight xl:flex">
                <span className="font-space-grotesk text-sm font-semibold text-foreground">
                  Creatives Takeover
                </span>
                <span className="text-[11px] text-muted-foreground">Startup operating system</span>
              </span>
            </Link>

            <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
              {visitorLinks.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={linkClassName(item.href)}
                  onClick={() => trackNavClick(item.label)}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="ml-auto hidden items-center gap-2 lg:flex">
              <ThemeToggle />
              <Button asChild variant="ghost" size="sm">
                <Link to="/login" onClick={() => trackNavClick("Sign In")}>
                  Sign In
                </Link>
              </Button>
              <Button asChild size="sm" className="gap-2">
                <Link to="/signup" onClick={() => trackNavClick("Sign Up")}>
                  Sign Up
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
                {visitorLinks.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "block rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-background text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                    onClick={() => trackNavClick(`Mobile ${item.label}`)}
                  >
                    {item.label}
                  </Link>
                ))}

                <div className="grid gap-2 border-t border-border/70 pt-3">
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/login" onClick={() => trackNavClick("Mobile Sign In")}>
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link to="/signup" onClick={() => trackNavClick("Mobile Sign Up")}>
                      Sign Up
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
