import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, MessageCircle, User, Gift, Rocket } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { captureEvent, trackActivationFunnelEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { FREE_TOOLS_NAV_ITEMS } from "@/config/freeTools";
import {
  getActivationPreferenceState,
  getDaysSinceSignup,
  shouldShowFirstResultMode,
} from "@/lib/activationState";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
}

const navItems: NavItem[] = [
  { name: "Home", href: "/", icon: Home },
  { name: "Continue", href: "/dashboard", icon: Rocket, requiresAuth: true },
  { name: "Community", href: "/mentorship", icon: Users },
  { name: "Messages", href: "/messages", icon: MessageCircle, requiresAuth: true },
  { name: "Account", href: "/account", icon: User, requiresAuth: true },
];

// Free Tools entry — shown to logged-out visitors only, so the logged-in bottom
// bar is unchanged. Mirrors the Free Tools menu in VisitorNavbar.
const freeToolsItems: NavItem[] = FREE_TOOLS_NAV_ITEMS.map((tool) => ({
  name: tool.name,
  href: tool.href,
  icon: tool.icon,
}));

export const MobileBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isScrollingDown, setIsScrollingDown] = React.useState(false);
  const [continueState, setContinueState] = React.useState<{
    href: string;
    activationIntent: string | null;
    firstResultMode: boolean;
  }>({
    href: "/dashboard",
    activationIntent: null,
    firstResultMode: false,
  });
  const lastScrollY = React.useRef(0);

  // Hide nav when scrolling down, show when scrolling up
  React.useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrollingDown(currentScrollY > lastScrollY.current && currentScrollY > 100);
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobile]);

  React.useEffect(() => {
    let cancelled = false;

    const loadContinueState = async () => {
      if (!user) {
        setContinueState({ href: "/dashboard", activationIntent: null, firstResultMode: false });
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed, user_preferences")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      const preferenceState = getActivationPreferenceState(data?.user_preferences);
      const firstResultMode = shouldShowFirstResultMode({
        onboardingCompleted: data?.onboarding_completed,
        userPreferences: data?.user_preferences,
      });

      setContinueState({
        href: firstResultMode ? preferenceState.continueUrl : "/dashboard",
        activationIntent: preferenceState.activationIntent,
        firstResultMode,
      });
    };

    void loadContinueState();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!isMobile) return null;
  if (location.pathname.startsWith("/share/")) return null;

  const visibleItems = navItems
    .filter(item => !item.requiresAuth || user)
    .map((item) => item.name === "Continue" ? { ...item, href: continueState.href } : item);
  const freeToolsActive = freeToolsItems.some((tool) => location.pathname.startsWith(tool.href));

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-area-inset",
        "transition-transform duration-300 ease-in-out",
        isScrollingDown ? "translate-y-full" : "translate-y-0"
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0)",
      }}
    >
      <div className="flex items-center justify-around h-16">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const itemPath = item.href.split("?")[0];
          const isActive = location.pathname === itemPath ||
            (itemPath !== "/" && location.pathname.startsWith(itemPath));

          return (
            <React.Fragment key={item.href}>
              <Link
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 h-full",
                  "transition-colors duration-200 touch-manipulation",
                  "min-h-[44px] min-w-[44px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground active:text-primary"
                )}
                aria-label={item.name}
                onClick={() => {
                  if (item.name !== "Continue") return;
                  trackActivationFunnelEvent("first_action_opened", {
                    user_id: user?.id ?? null,
                    activation_intent: continueState.activationIntent,
                    selected_path: continueState.href,
                    source: "mobile_bottom_nav",
                    days_since_signup: getDaysSinceSignup(user?.created_at ?? null),
                    first_result_mode: continueState.firstResultMode,
                  });
                }}
              >
                <div className={cn(
                  "relative p-2 rounded-lg transition-colors",
                  isActive && "bg-primary/10"
                )}>
                  <Icon className={cn(
                    "h-5 w-5 transition-transform",
                    isActive && "scale-110"
                  )} />
                  {isActive && (
                    <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-primary rounded-full" />
                  )}
                </div>
                <span className={cn(
                  "text-caption font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.name}
                </span>
              </Link>

              {/* Free Tools menu — logged-out visitors only, placed right after Home */}
              {item.href === "/" && !user && (
                <DropdownMenu
                  onOpenChange={(open) => {
                    if (open) captureEvent("free_tools_menu_opened", { source: "mobile_bottom_nav" });
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 flex-1 h-full",
                        "transition-colors duration-200 touch-manipulation",
                        "min-h-[44px] min-w-[44px]",
                        freeToolsActive ? "text-primary" : "text-muted-foreground active:text-primary"
                      )}
                      aria-label="Free Tools"
                    >
                      <div className={cn("relative p-2 rounded-lg transition-colors", freeToolsActive && "bg-primary/10")}>
                        <Gift className={cn("h-5 w-5 transition-transform", freeToolsActive && "scale-110")} />
                      </div>
                      <span className={cn(
                        "text-caption font-medium transition-colors",
                        freeToolsActive ? "text-primary" : "text-muted-foreground"
                      )}>
                        Free Tools
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="center" className="mb-2 w-60">
                    <DropdownMenuLabel>From Creatives Takeover with 💙</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {freeToolsItems.map((tool) => {
                      const ToolIcon = tool.icon;
                      return (
                        <DropdownMenuItem key={tool.href} asChild>
                          <Link
                            to={tool.href}
                            onClick={() =>
                              captureEvent("free_tool_nav_click", { tool: tool.name, source: "mobile_bottom_nav" })
                            }
                            className="cursor-pointer"
                          >
                            <ToolIcon className="mr-2 h-4 w-4" />
                            {tool.name}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};
