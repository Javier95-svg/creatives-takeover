import React, { FocusEvent, KeyboardEvent, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  ChevronDown,
  LayoutDashboard,
  Mail,
  Menu,
  Newspaper,
  Rocket,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/ThemeToggle";
import ctLogoPolished from "@/assets/ct-logo-polished-borders.png";
import { cn } from "@/lib/utils";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";

type DropdownKey = "how" | "more";

const howItWorksPillars = [
  {
    title: "BizMap AI",
    href: "/bizmap-ai",
    icon: Bot,
    description:
      "This is where your startup journey starts. BizMap AI helps you clarify the business model, pressure-test the idea, define the customer, map the offer, and turn scattered thoughts into guided strategic decisions.",
    outcome: "A validated startup roadmap with clear next actions, not another blank business plan.",
  },
  {
    title: "Community",
    href: "/community",
    icon: Users,
    description:
      "Get access to founders, creatives, mentors, coaches, and collaborators who understand the early-stage grind. Use the network for peer feedback, accountability, founder matching, and finding cofounders or operators with complementary skills.",
    outcome: "A real support network that helps you move faster and make better decisions.",
  },
  {
    title: "Insighta",
    href: "/insighta",
    icon: BarChart3,
    description:
      "Insighta is the analytics and market intelligence layer. It helps you understand your ICP, evaluate traction signals, research funding and growth opportunities, and spot what deserves more focus before you commit time or money.",
    outcome: "Clarity on what is working, what is not, and where the next smart bet is.",
  },
  {
    title: "Dashboard",
    href: "/how-it-works#dashboard",
    icon: LayoutDashboard,
    description:
      "The dashboard becomes your founder mission control after signup. It brings together your progress, routine, tasks, recommendations, and platform activity so you always know what to do next.",
    outcome: "A focused daily workspace that keeps execution organized and personal to your startup.",
  },
];

const freeTools = [
  {
    title: "Newspaper",
    href: "/newspaper",
    icon: Newspaper,
    description: "Curated startup stories, market notes, and founder lessons to stay informed without the noise.",
  },
  {
    title: "Email Templates",
    href: "/email-templates",
    icon: Mail,
    description: "Copy-ready templates for investor outreach, partnerships, customer follow-ups, and more.",
  },
  {
    title: "Prompt Library",
    href: "/prompt-library",
    icon: BookOpen,
    description: "Founder-specific AI prompts for strategy, marketing, product, and growth work.",
  },
];

const homeLink = { label: "Home", href: "/" };
const mentorshipLink = { label: "Mentorship", href: "/community" };
const finalLinks = [
  { label: "About Us", href: "/about" },
  { label: "Pricing", href: "/pricing" },
];

const VisitorNavbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<DropdownKey | null>("how");
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
    setOpenDropdown(null);
  }, [location.pathname]);

  const isActive = (href: string) => {
    if (href === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(href);
  };

  const handleDropdownBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setOpenDropdown(null);
    }
  };

  const handleDropdownKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      setOpenDropdown(null);
    }
  };

  const trackNavClick = (label: string) => {
    trackClick(`VisitorNavbar - ${label}`, "Navigation");
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
              <Link
                to={homeLink.href}
                className={cn(
                  "rounded-[14px] px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive(homeLink.href)
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
                )}
                onClick={() => trackNavClick(homeLink.label)}
              >
                {homeLink.label}
              </Link>

              <div
                className="relative"
                onMouseEnter={() => setOpenDropdown("how")}
                onMouseLeave={() => setOpenDropdown(null)}
                onBlur={handleDropdownBlur}
                onKeyDown={handleDropdownKeyDown}
              >
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-2 rounded-[14px] px-3.5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isActive("/how-it-works")
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
                  )}
                  aria-haspopup="true"
                  aria-expanded={openDropdown === "how"}
                  aria-controls="visitor-how-dropdown"
                  onClick={() => setOpenDropdown(openDropdown === "how" ? null : "how")}
                >
                  How It Works
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      openDropdown === "how" && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                </button>

                <div
                  id="visitor-how-dropdown"
                  role="menu"
                  className={cn(
                    "absolute left-1/2 top-full mt-3 w-[760px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-border/80 bg-background/98 p-4 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.45)] backdrop-blur-xl transition-all duration-150",
                    openDropdown === "how"
                      ? "pointer-events-auto translate-y-0 opacity-100"
                      : "pointer-events-none -translate-y-1 opacity-0"
                  )}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {howItWorksPillars.map((pillar) => {
                      const Icon = pillar.icon;
                      return (
                        <Link
                          key={pillar.title}
                          to={pillar.href}
                          role="menuitem"
                          className="group rounded-xl border border-border/70 bg-muted/20 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => trackNavClick(`How It Works ${pillar.title}`)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <Icon className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <span className="font-space-grotesk text-base font-semibold text-foreground">
                              {pillar.title}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-muted-foreground">{pillar.description}</p>
                          <p className="mt-3 text-sm font-medium text-foreground">
                            What you will walk away with:{" "}
                            <span className="text-muted-foreground">{pillar.outcome}</span>
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
                    <Link
                      to="/how-it-works"
                      className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onClick={() => trackNavClick("See full journey")}
                    >
                      See the full journey
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <Button asChild size="sm">
                      <Link to="/signup" onClick={() => trackNavClick("Get Started Free Dropdown")}>
                        Get Started Free
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>

              <Link
                to={mentorshipLink.href}
                className={cn(
                  "rounded-[14px] px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive(mentorshipLink.href)
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
                )}
                onClick={() => trackNavClick(mentorshipLink.label)}
              >
                {mentorshipLink.label}
              </Link>

              <div
                className="relative"
                onMouseEnter={() => setOpenDropdown("more")}
                onMouseLeave={() => setOpenDropdown(null)}
                onBlur={handleDropdownBlur}
                onKeyDown={handleDropdownKeyDown}
              >
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-2 rounded-[14px] px-3.5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    openDropdown === "more"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
                  )}
                  aria-haspopup="true"
                  aria-expanded={openDropdown === "more"}
                  aria-controls="visitor-resources-dropdown"
                  onClick={() => setOpenDropdown(openDropdown === "more" ? null : "more")}
                >
                  Resources
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      openDropdown === "more" && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                </button>

                <div
                  id="visitor-resources-dropdown"
                  role="menu"
                  className={cn(
                    "absolute right-0 top-full mt-3 w-[430px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border/80 bg-background/98 p-3 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.45)] backdrop-blur-xl transition-all duration-150",
                    openDropdown === "more"
                      ? "pointer-events-auto translate-y-0 opacity-100"
                      : "pointer-events-none -translate-y-1 opacity-0"
                  )}
                >
                  <div className="space-y-2">
                    {freeTools.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <Link
                          key={tool.title}
                          to={tool.href}
                          role="menuitem"
                          className="group flex gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => trackNavClick(`Free Tool ${tool.title}`)}
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                            <Icon className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-space-grotesk text-sm font-semibold text-foreground">
                                {tool.title}
                              </span>
                              <Badge variant="secondary" className="text-[10px] font-medium">
                                Free, no account needed
                              </Badge>
                            </span>
                            <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                              {tool.description}
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                  <Link
                    to="/resources"
                    className="mt-3 flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => trackNavClick("Explore all free tools")}
                  >
                    Explore all free tools
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {finalLinks.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "rounded-[14px] px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isActive(item.href)
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
                  )}
                  onClick={() => trackNavClick(item.label)}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="ml-auto hidden items-center gap-2 lg:flex">
              <ThemeToggle />
              <Button asChild variant="ghost" size="sm">
                <Link to="/login" onClick={() => trackNavClick("Log In")}>
                  Log In
                </Link>
              </Button>
              <Button asChild size="sm" className="gap-2">
                <Link to="/signup" onClick={() => trackNavClick("Start Free")}>
                  <Rocket className="h-4 w-4" aria-hidden="true" />
                  Start free
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
              <div className="space-y-3 border-t border-border/70 px-3 py-4 sm:px-4">
                <Link
                  to={homeLink.href}
                  className={cn(
                    "block rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                    isActive(homeLink.href)
                      ? "bg-background text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                  onClick={() => trackNavClick(`Mobile ${homeLink.label}`)}
                >
                  {homeLink.label}
                </Link>

                <section className="rounded-2xl border border-border/70 bg-muted/20">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    aria-expanded={mobileExpanded === "how"}
                    aria-controls="visitor-mobile-how"
                    onClick={() => setMobileExpanded(mobileExpanded === "how" ? null : "how")}
                  >
                    <span className="font-space-grotesk text-sm font-semibold text-foreground">
                      How It Works
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform",
                        mobileExpanded === "how" && "rotate-180"
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    id="visitor-mobile-how"
                    className={cn("space-y-3 px-3 pb-3", mobileExpanded === "how" ? "block" : "hidden")}
                  >
                    {howItWorksPillars.map((pillar) => {
                      const Icon = pillar.icon;
                      return (
                        <Link
                          key={pillar.title}
                          to={pillar.href}
                          className="block rounded-xl bg-background/75 p-3"
                          onClick={() => trackNavClick(`Mobile How It Works ${pillar.title}`)}
                        >
                          <span className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="font-space-grotesk text-sm font-semibold text-foreground">
                              {pillar.title}
                            </span>
                          </span>
                          <span className="mt-2 block text-sm leading-5 text-muted-foreground">
                            {pillar.description}
                          </span>
                          <span className="mt-2 block text-sm font-medium text-foreground">
                            What you will walk away with:{" "}
                            <span className="font-normal text-muted-foreground">{pillar.outcome}</span>
                          </span>
                        </Link>
                      );
                    })}
                    <div className="flex flex-col gap-2 pt-1">
                      <Button asChild variant="outline" className="justify-between">
                        <Link to="/how-it-works" onClick={() => trackNavClick("Mobile See Full Journey")}>
                          See the full journey
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Button>
                      <Button asChild>
                        <Link to="/signup" onClick={() => trackNavClick("Mobile Get Started Free")}>
                          Get Started Free
                        </Link>
                      </Button>
                    </div>
                  </div>
                </section>

                <Link
                  to={mentorshipLink.href}
                  className={cn(
                    "block rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                    isActive(mentorshipLink.href)
                      ? "bg-background text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                  onClick={() => trackNavClick(`Mobile ${mentorshipLink.label}`)}
                >
                  {mentorshipLink.label}
                </Link>

                <section className="rounded-2xl border border-border/70 bg-muted/20">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    aria-expanded={mobileExpanded === "more"}
                    aria-controls="visitor-mobile-more"
                    onClick={() => setMobileExpanded(mobileExpanded === "more" ? null : "more")}
                  >
                    <span className="font-space-grotesk text-sm font-semibold text-foreground">Resources</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform",
                        mobileExpanded === "more" && "rotate-180"
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    id="visitor-mobile-more"
                    className={cn("space-y-2 px-3 pb-3", mobileExpanded === "more" ? "block" : "hidden")}
                  >
                    {freeTools.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <Link
                          key={tool.title}
                          to={tool.href}
                          className="flex gap-3 rounded-xl bg-background/75 p-3"
                          onClick={() => trackNavClick(`Mobile Free Tool ${tool.title}`)}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-space-grotesk text-sm font-semibold text-foreground">
                                {tool.title}
                              </span>
                              <Badge variant="secondary" className="text-[10px] font-medium">
                                Free, no account needed
                              </Badge>
                            </span>
                            <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                              {tool.description}
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                    <Link
                      to="/resources"
                      className="flex items-center justify-between rounded-xl border border-border/70 bg-background/75 px-3 py-2.5 text-sm font-medium text-foreground"
                      onClick={() => trackNavClick("Mobile Explore all free tools")}
                    >
                      Explore all free tools
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </section>

                <div className="grid gap-1">
                  {finalLinks.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                        isActive(item.href)
                          ? "bg-background text-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                      onClick={() => trackNavClick(`Mobile ${item.label}`)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                <div className="grid gap-2 border-t border-border/70 pt-3">
                  <Button asChild variant="outline">
                    <Link to="/login" onClick={() => trackNavClick("Mobile Log In")}>
                      Log In
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link to="/signup" onClick={() => trackNavClick("Mobile Start Free")}>
                      Start free
                    </Link>
                  </Button>
                </div>

                <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Built for early-stage founders, indie hackers, and creative entrepreneurs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default VisitorNavbar;
