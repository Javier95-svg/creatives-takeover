import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, LogOut, User, Settings, UserPlus, MessageCircle, Home, Bot, BookOpen, TrendingUp, Users as UsersIcon, FileText, Info, DollarSign, ChevronDown, Mail, Rocket, FlaskConical, Target, Boxes, GraduationCap, Handshake, BarChart3, Sparkles } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CreditDisplay } from "@/components/CreditDisplay";
import { CreditCampaignPopup } from "@/components/CreditCampaignPopup";
import { useHoverPopup } from "@/hooks/useHoverPopup";
import { useSocial } from "@/hooks/useSocial";
import { FriendRequestsModal } from "@/components/social/FriendRequestsModal";
import { NotificationBell } from "@/components/community/NotificationBell";
import { useMessaging } from "@/hooks/useMessaging";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ThemeToggle from "@/components/ThemeToggle";
import ctLogo from "@/assets/ct-logo.png";
import { useDeviceType } from "@/hooks/use-device-type";
import { TabletNavigation } from "@/components/navigation/TabletNavigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const { user, signOut, loading } = useAuth();
  const { pendingFriendRequests } = useSocial(user?.id || '');
  const { trackClick } = usePageAnalytics();
  const deviceType = useDeviceType();
  const location = useLocation();
  const { getTotalUnreadCount } = useMessaging({ autoLoad: true, suppressLoadErrors: true });
  const totalUnreadMessages = user ? getTotalUnreadCount() : 0;

  // Hover popup for BizMap AI menu item
  const bizMapHover = useHoverPopup({ delay: 1500, trigger: 'bizmap-nav' });

  // Icon mapping for navigation items
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    "Home": Home,
    "BizMap AI": Bot,
    "Insighta": TrendingUp,
    "Community": UsersIcon,
    "Resources": FileText,
    "About Us": Info,
    "Pricing": DollarSign,
  };

  // BizMap AI submenu -- grouped by Lean Startup phase
  type BizMapMenuItem =
    | { type: 'label'; label: string }
    | { type: 'separator' }
    | { type?: undefined; name: string; href: string; icon: React.ComponentType<{ className?: string }>; description: string };

  const bizMapSubmenu: BizMapMenuItem[] = [
    { type: 'label', label: 'Learn: Validate Your Idea' },
    { name: "ICP Builder", href: "/icp-builder", icon: Target, description: "Define your ideal customer and niche" },
    { name: "PMF Lab", href: "/pmf-lab", icon: FlaskConical, description: "AI market analysis + validation" },
    { type: 'label', label: 'Build: Ship Your MVP' },
    { name: "MVP Builder", href: "/mvp-builder", icon: Rocket, description: "From validated idea to working product" },
    { name: "Business Planner", href: "/bizmap-ai/chat", icon: Bot, description: "Your AI business partner for every stage" },
    { name: "Tech Stack Builder", href: "/tech-stack", icon: Boxes, description: "Choose your stack with budget calc" },
    { type: 'label', label: 'Measure: Get Traction' },
    { name: "GTM Strategist", href: "/go-to-market", icon: DollarSign, description: "End-to-end go-to-market planner" },
  ];

  // Insighta submenu items
  const insightaSubmenu = [
    { name: "VC Search", href: "/insighta/vc-search", icon: UsersIcon, description: "Browse venture capital firms" },
    { name: "Accelerator Hunt", href: "/insighta/accelerator-hunt", icon: Rocket, description: "Find top accelerator programs" },
    { name: "Email Templates", href: "/insighta/email-templates", icon: Mail, description: "Reach out smartly" },
    { name: "Pitch Deck Analyzer", href: "/insighta/pitch-deck-analyzer", icon: BarChart3, description: "Analyze your pitch deck" },
    { name: "Insighta Test", href: "/insighta/test", icon: FlaskConical, description: "Measure your fundraising readiness" },
  ];

  // Community submenu items
  const communitySubmenu = [
    { name: "Find a Mentor", href: "/community", icon: GraduationCap, description: "Connect with experienced mentors" },
    { name: "Find a Co-Founder", href: "/community/co-founders", icon: Handshake, description: "Meet your business soulmate" },
    { name: "Find your Angel", href: "/community/angels", icon: Sparkles, description: "Connect with angel investors" },
  ];

  // Resources submenu items
  const resourcesSubmenu = [
    { name: "Stories", href: "/stories", icon: FileText, description: "Insights and articles for founders" },
    { name: "Prompt Library", href: "/prompt-library", icon: BookOpen, description: "60+ business cases and prompts" },
  ];

  // Fetch user avatar
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };

    fetchAvatar();
  }, [user]);

  // Add subtle shadow and backdrop blur after scroll for professional feel
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const navItems = [
    { name: "Home", href: "/", tooltip: "Return to homepage", icon: Home },
    { name: "BizMap AI", href: "/bizmap-ai", tooltip: "AI Co-Founder that creates your business plan", icon: Bot },
    { name: "Insighta", href: "/insighta", tooltip: "Funding opportunities and investment resources", icon: TrendingUp },
    { name: "Community", href: "/community", tooltip: "Connect with fellow creative entrepreneurs", icon: UsersIcon },
    { name: "Resources", href: "/stories", tooltip: "Stories, prompts, and learning resources", icon: FileText },
    { name: "About Us", href: "/about", tooltip: "Learn about our mission and team", icon: Info },
    { name: "Pricing", href: "/pricing", tooltip: "View plans and pricing options", icon: DollarSign }
  ];

  // Check if a nav item is active
  const isActive = (href: string) => {
    if (href === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(href);
  };

  type DropdownConfig = {
    label: string;
    widthClass: string;
    items: BizMapMenuItem[];
  };

  const dropdownMenus: Record<string, DropdownConfig> = {
    "BizMap AI": {
      label: "Lean Startup System",
      widthClass: "w-72",
      items: bizMapSubmenu,
    },
    "Insighta": {
      label: "Fundraising Tools",
      widthClass: "w-56",
      items: insightaSubmenu as unknown as BizMapMenuItem[],
    },
    "Community": {
      label: "Connect & Collaborate",
      widthClass: "w-56",
      items: communitySubmenu as unknown as BizMapMenuItem[],
    },
    "Resources": {
      label: "Niche Content for Founders",
      widthClass: "w-56",
      items: resourcesSubmenu as unknown as BizMapMenuItem[],
    },
  };

  const renderDropdownNavigationItem = (
    item: { name: string; href: string; tooltip: string; icon?: React.ComponentType<{ className?: string }> },
    Icon: React.ComponentType<{ className?: string }> | undefined,
    active: boolean,
    colorClass: string
  ) => {
    const config = dropdownMenus[item.name];
    if (!config) return null;

    return (
      <DropdownMenu key={item.name}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger
              className={cn(
                "group relative flex items-center gap-1.5 rounded-xl px-3.5 py-2 whitespace-nowrap text-sm font-medium tracking-[0.01em] outline-none transition-all duration-200",
                "nav-item-hover-effect",
                active
                  ? "bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.22)] nav-active-indicator active"
                  : `text-muted-foreground ${colorClass}`
              )}
            >
              {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
              <span className="tracking-wide">{item.name}</span>
              <ChevronDown className="ml-0.5 h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{item.tooltip}</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          align="start"
          className={cn(
            config.widthClass,
            "rounded-2xl border border-border/70 bg-background/95 p-1.5 shadow-[0_16px_44px_hsl(var(--foreground)/0.2)] backdrop-blur-xl"
          )}
        >
          <DropdownMenuLabel className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground">
            {config.label}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {config.items.map((subItem, idx) => {
            if ("type" in subItem && subItem.type === "label") {
              return (
                <DropdownMenuLabel
                  key={`${item.name}-label-${idx}`}
                  className="mt-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-primary/85 first:mt-0"
                >
                  {subItem.label}
                </DropdownMenuLabel>
              );
            }

            if ("type" in subItem && subItem.type === "separator") {
              return <DropdownMenuSeparator key={`${item.name}-separator-${idx}`} />;
            }

            const linkItem = subItem as {
              name: string;
              href: string;
              icon: React.ComponentType<{ className?: string }>;
              description: string;
            };
            const SubIcon = linkItem.icon;

            return (
              <DropdownMenuItem
                key={`${item.name}-${linkItem.name}`}
                asChild
                className="rounded-xl px-0 focus:bg-transparent"
              >
                <Link
                  to={linkItem.href}
                  onClick={() => trackClick(`${item.name} - ${linkItem.name}`, "Navigation")}
                  className="group flex w-full cursor-pointer items-start gap-2.5 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-muted/70 focus:bg-muted/70"
                >
                  <SubIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium leading-tight">{linkItem.name}</span>
                    <span className="text-xs leading-snug text-muted-foreground">{linkItem.description}</span>
                  </div>
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <nav
        style={{ top: 'var(--banner-height, 0)' } as React.CSSProperties}
        className={cn(
          "fixed left-0 right-0 z-50 border-b transition-all duration-300",
          scrolled
            ? "border-border/80 bg-background/94 backdrop-blur-2xl shadow-[0_10px_30px_hsl(var(--foreground)/0.12)]"
            : "border-border/70 bg-background/82 backdrop-blur-xl shadow-[0_1px_0_hsl(var(--border)/0.65)]"
        )}
      >
        <div className="mx-auto max-w-[1480px] border-0 px-4 sm:px-6 lg:px-10">
          <div className="flex h-16 items-center border-0 md:h-[4.5rem]">
            {/* Logo with Enhanced Hover Effects - Fixed width to prevent layout shifts */}
            <div className="flex w-16 min-w-[4rem] flex-shrink-0 items-center border-0">
              <Link to="/" className="flex items-center justify-center w-full" aria-label="Home">
                <img
                  src={ctLogo}
                  alt="Creatives Takeover Logo"
                  className="h-9 w-auto max-w-full object-contain animate-logo-breathing nav-logo-hover md:h-10"
                />
              </Link>
            </div>

            {/* Tablet Navigation */}
            {deviceType === 'tablet' && (
              <div className="flex-1 flex items-center justify-center">
                <TabletNavigation
                  navItems={navItems}
                  onItemClick={(name) => trackClick(name, 'Navigation')}
                />
              </div>
            )}

            {/* Desktop Navigation */}
            {deviceType === 'desktop' && (
              <div className="flex flex-1 items-center justify-center px-5 lg:px-8">
                <div className="flex items-center gap-1 rounded-2xl border border-border/60 bg-background/62 px-2 py-1.5 shadow-[inset_0_1px_0_hsl(var(--background)/0.7)] backdrop-blur-xl">
                {navItems.map((item) => {
                  const Icon = item.icon || iconMap[item.name];
                  const active = isActive(item.href);

                  // Color-code navigation items semantically
                  const colorClass = 'hover:text-foreground';

                  if (dropdownMenus[item.name]) {
                    return renderDropdownNavigationItem(item, Icon, active, colorClass);
                  }

                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.href}
                          onClick={() => trackClick(item.name, 'Navigation')}
                          className={cn(
                            "relative flex items-center gap-1.5 rounded-xl px-3.5 py-2 whitespace-nowrap text-sm font-medium tracking-[0.01em] transition-all duration-200",
                            "nav-item-hover-effect",
                            active
                              ? "bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.22)] nav-active-indicator active"
                              : `text-muted-foreground ${colorClass}`,
                            item.name === 'BizMap AI' && 'relative'
                          )}
                          onMouseEnter={item.name === 'BizMap AI' ? bizMapHover.handleMouseEnter : undefined}
                          onMouseLeave={item.name === 'BizMap AI' ? bizMapHover.handleMouseLeave : undefined}
                        >
                          {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                          <span className="tracking-wide">{item.name}</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                </div>
              </div>
            )}

            {/* Desktop & Tablet CTA */}
            <div className="hidden md:flex items-center gap-3 !border-0 ml-auto">
              {loading ? (
                <div className="w-8 h-8 animate-pulse bg-muted rounded-full" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <CreditDisplay variant="navigation" showPurchaseButton={true} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowFriendRequests(true)}
                    className="relative h-10 w-10 rounded-xl border border-border/60 bg-background/60 text-muted-foreground transition-colors duration-200 hover:bg-muted/70 hover:text-foreground touch-manipulation"
                  >
                    <UserPlus className="w-5 h-5" />
                    {pendingFriendRequests.length > 0 && (
                      <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse">
                        {pendingFriendRequests.length}
                      </Badge>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="relative h-10 w-10 rounded-xl border border-border/60 bg-background/60 text-muted-foreground transition-colors duration-200 hover:bg-muted/70 hover:text-foreground touch-manipulation"
                  >
                    <Link to="/messages">
                      <MessageCircle className="w-5 h-5" />
                      {totalUnreadMessages > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                          {totalUnreadMessages > 9 ? '9+' : totalUnreadMessages}
                        </Badge>
                      )}
                    </Link>
                  </Button>
                  <NotificationBell />
                  <ThemeToggle />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="cursor-pointer rounded-full outline-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                        <Avatar className="h-10 w-10 ring-1 ring-border/70 transition-all hover:ring-primary/50">
                          <AvatarImage src={avatarUrl} alt={user.user_metadata?.full_name || 'User'} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                            {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {user.user_metadata?.full_name || 'User'}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          <span>Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/messages" className="cursor-pointer">
                          <MessageCircle className="mr-2 h-4 w-4" />
                          <span>Messages</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/account" className="cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <ThemeToggle />
                  <Button variant="ghost" size="sm" asChild className="rounded-xl border border-border/60 bg-background/55 px-3 hover:bg-muted/70">
                    <Link to="/login" className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-xl px-4 font-semibold shadow-sm"
                    asChild
                  >
                    <Link to="/signup">Sign Up</Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border/60 bg-background/70 text-foreground shadow-sm backdrop-blur md:hidden touch-manipulation transition-colors hover:bg-muted/60 active:opacity-70"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation Backdrop */}
          {isOpen && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-fadeIn"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Mobile Navigation */}
          {isOpen && (
            <div className="md:hidden fixed top-16 left-0 right-0 bottom-0 bg-background/95 backdrop-blur-xl border-t border-border animate-mobile-drawer safe-area-inset z-50 shadow-2xl">
              <div className="px-2 pt-2 pb-safe space-y-1 max-h-[calc(100vh-64px)] overflow-y-auto">
                {/* Theme Toggle at top of mobile menu */}
                <div className="sticky top-0 z-10 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Theme</span>
                    <ThemeToggle />
                  </div>
                </div>
                <div className="py-2">
                  {navItems.map((item) => {
                    const Icon = item.icon || iconMap[item.name];
                    const active = isActive(item.href);

                    // Determine submenu for this item
                    const submenuMap: Record<string, { items: typeof insightaSubmenu }> = {
                      'BizMap AI': { items: bizMapSubmenu.filter((s): s is { name: string; href: string; icon: React.ComponentType<{ className?: string }>; description: string } => !('type' in s)) },
                      'Insighta': { items: insightaSubmenu },
                      'Community': { items: communitySubmenu },
                      'Resources': { items: resourcesSubmenu },
                    };
                    const submenu = submenuMap[item.name];

                    return (
                      <div key={item.name}>
                        <Link
                          to={item.href}
                          className={cn(
                            "mx-2 flex min-h-[48px] touch-manipulation items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-base transition-all duration-200",
                            "hover:border-border/60 hover:bg-muted/50 active:bg-muted",
                            active
                              ? "border-primary/30 bg-primary/10 font-semibold text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          onClick={() => setIsOpen(false)}
                        >
                          {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
                          <span>{item.name}</span>
                        </Link>
                        {/* Mobile submenu items */}
                        {submenu && (
                          <div className="mb-1 ml-10 mr-2 mt-0.5 space-y-1">
                            {submenu.items.map((sub) => {
                              const SubIcon = sub.icon;
                              return (
                                <Link
                                  key={sub.name}
                                  to={sub.href}
                                  className="flex min-h-[44px] touch-manipulation items-center gap-2.5 rounded-lg border border-transparent px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-border/60 hover:bg-muted/50 hover:text-foreground active:bg-muted"
                                  onClick={() => setIsOpen(false)}
                                >
                                  <SubIcon className="h-4 w-4 flex-shrink-0" />
                                  <span>{sub.name}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="px-3 py-3 space-y-2 border-t border-border">
                  {loading ? (
                    <div className="w-full h-12 animate-pulse bg-muted rounded" />
                  ) : user ? (
                    <div className="space-y-2">
                      <div className="mb-3 flex items-center justify-between rounded-xl border border-primary/15 bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                            <AvatarImage src={avatarUrl} alt={user.user_metadata?.full_name || 'User'} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground">{user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </div>
                        <CreditDisplay variant="inline" />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start min-h-[48px] touch-manipulation rounded-xl border border-border/60 bg-background/55 text-base transition-colors duration-200 hover:bg-muted/70"
                        onClick={() => setIsOpen(false)}
                        asChild
                      >
                        <Link to="/dashboard" className="flex items-center">
                          <User className="w-5 h-5 mr-3" />
                          Dashboard
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start min-h-[48px] touch-manipulation rounded-xl border border-border/60 bg-background/55 text-base transition-colors duration-200 hover:bg-muted/70"
                        onClick={() => setIsOpen(false)}
                        asChild
                      >
                        <Link to="/messages" className="flex items-center">
                          <MessageCircle className="w-5 h-5 mr-3" />
                          Messages
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start min-h-[48px] touch-manipulation rounded-xl border border-border/60 bg-background/55 text-base transition-colors duration-200 hover:bg-muted/70"
                        onClick={() => setIsOpen(false)}
                        asChild
                      >
                        <Link to="/account" className="flex items-center">
                          <Settings className="w-5 h-5 mr-3" />
                          Settings
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start min-h-[48px] touch-manipulation rounded-xl border border-destructive/30 bg-background/55 text-base text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          setIsOpen(false);
                          handleSignOut();
                        }}
                      >
                        <LogOut className="w-5 h-5 mr-3" />
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start min-h-[48px] touch-manipulation rounded-xl border border-border/60 bg-background/55 text-base hover:bg-muted/70"
                        onClick={() => setIsOpen(false)}
                        asChild
                      >
                        <Link to="/login" className="flex items-center">
                          <LogIn className="w-5 h-5 mr-3" />
                          Sign In
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        className="w-full bg-gradient-unified hover:opacity-90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 min-h-[48px] touch-manipulation text-base font-semibold"
                        onClick={() => setIsOpen(false)}
                        asChild
                      >
                        <Link to="/signup">Sign Up</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hover-triggered Campaign Popup */}
        {bizMapHover.showPopup && (
          <CreditCampaignPopup
            trigger="hover"
            onClose={bizMapHover.closePopup}
          />
        )}

        {/* Friend Requests Modal */}
        <FriendRequestsModal
          open={showFriendRequests}
          onOpenChange={setShowFriendRequests}
        />
      </nav>
    </TooltipProvider>
  );
};

export default Navigation;
