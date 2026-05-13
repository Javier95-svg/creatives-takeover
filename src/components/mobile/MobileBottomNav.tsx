import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, MessageCircle, LayoutDashboard, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
}

const navItems: NavItem[] = [
  { name: "Home", href: "/", icon: Home },
  { name: "Community", href: "/mentorship", icon: Users },
  { name: "Messages", href: "/messages", icon: MessageCircle, requiresAuth: true },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, requiresAuth: true },
  { name: "Account", href: "/account", icon: User, requiresAuth: true },
];

export const MobileBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isScrollingDown, setIsScrollingDown] = React.useState(false);
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

  if (!isMobile) return null;
  if (location.pathname.startsWith("/share/")) return null;

  const visibleItems = navItems.filter(item => !item.requiresAuth || user);

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
          const isActive = location.pathname === item.href || 
            (item.href !== "/" && location.pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
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
                "text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

