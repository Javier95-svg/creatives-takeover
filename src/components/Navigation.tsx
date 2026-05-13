import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, LogOut, User, Settings, Gift, UserPlus, MessageCircle, Home, Bot, BookOpen, TrendingUp, Users as UsersIcon, FileText, Info, DollarSign, ChevronDown, Mail, Rocket, FlaskConical, Lightbulb, Target, Boxes, GraduationCap, Handshake, BarChart3, Filter, CheckSquare, LineChart, CalendarCheck, HeartHandshake, Sparkles, Lock } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
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
import VisitorNavbar from "@/components/VisitorNavbar";
import { useDeviceType } from "@/hooks/use-device-type";
import { TabletNavigation } from "@/components/navigation/TabletNavigation";
import ctLogoPolished from "@/assets/ct-logo-polished-borders.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useBizMapProgress } from "@/hooks/useBizMapProgress";
import { BIZMAP_STAGES } from "@/lib/bizmapStages";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPublicTabState } from "@/config/publicTabVisibility";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [lockedMenuItem, setLockedMenuItem] = useState<{ name: string; reason: string } | null>(null);
  const mobileBarRef = useRef<HTMLDivElement | null>(null);
  const { user, signOut, loading } = useAuth();
  const { pendingFriendRequests } = useSocial(user?.id || '');
  const { trackClick } = usePageAnalytics();
  const deviceType = useDeviceType();
  const location = useLocation();
  const { isToolRouteUnlocked, getLockReasonForRoute } = useBizMapProgress();
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
    "More": FileText,
    "About Us": Info,
    "Pricing": DollarSign,
  };

  // BizMap AI submenu -- grouped by guided stages
  type SubmenuLinkItem = {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
  };

  type BizMapMenuItem =
    | { type: 'label'; label: string }
    | SubmenuLinkItem;

  const bizMapSubmenu: BizMapMenuItem[] = BIZMAP_STAGES.flatMap((stage) => [
    { type: 'label' as const, label: `Stage ${stage.numeral}: ${stage.title}` },
    ...stage.tools.map((tool) => ({
      name: tool.beta ? `${tool.name} (Beta)` : tool.name,
      href: tool.route,
      icon: tool.icon,
      description: tool.description,
    })),
  ]);

  // Insighta submenu items
  const insightaSubmenu: BizMapMenuItem[] = [
    { type: 'label', label: "STAGE VI: TRACTION" },
    { name: "Traction Engine", href: "/traction-engine", icon: LineChart, description: "Track weekly distribution and retention signals." },
    { type: 'label', label: "STAGE VII: FUNDRAISE" },
    { name: "VC Search", href: "/vc-search", icon: UsersIcon, description: "Browse venture capital firms." },
    { name: "Accelerator Hunt", href: "/accelerator-hunt", icon: Rocket, description: "Find top accelerator programs." },
    { name: "Pitch Deck Analyzer", href: "/pitch-deck-analyzer", icon: BarChart3, description: "Analyze your pitch deck." },
    { name: "Insighta Test", href: "/insighta-test", icon: FlaskConical, description: "Measure your fundraising readiness." },
  ];

  // Community submenu items
  const communitySubmenu = [
    { name: "Find a Mentor", href: "/mentorship", icon: GraduationCap, description: "Connect with experienced startup coaches." },
    { name: "Find a Co-Founder", href: "/co-founder", icon: Handshake, description: "Meet your business soulmate." },
    { name: "Find your Angel", href: "/investors", icon: Sparkles, description: "Angel investor network." },
  ];

  // Resources submenu items
  const resourcesSubmenu = [
    { name: "Newspaper", href: "/newspaper", icon: FileText, description: "Business Cases & Founder Stories." },
    { name: "Email Templates", href: "/email-templates", icon: Mail, description: "Reach out smartly." },
    { name: "Prompt Library", href: "/prompt-library", icon: BookOpen, description: "60 business models from 8 different industries." },
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

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (deviceType !== 'mobile' && isOpen) {
      setIsOpen(false);
    }
  }, [deviceType, isOpen]);

  useEffect(() => {
    const root = document.documentElement;

    const updateMobileNavOffset = () => {
      if (!mobileBarRef.current || typeof window === 'undefined') {
        return;
      }

      if (window.innerWidth > 768) {
        root.style.setProperty('--mobile-nav-offset', '0px');
        return;
      }

      const { bottom } = mobileBarRef.current.getBoundingClientRect();
      root.style.setProperty('--mobile-nav-offset', `${Math.ceil(bottom)}px`);
    };

    updateMobileNavOffset();

    const resizeObserver = new ResizeObserver(() => {
      updateMobileNavOffset();
    });

    if (mobileBarRef.current) {
      resizeObserver.observe(mobileBarRef.current);
    }

    window.addEventListener('resize', updateMobileNavOffset);
    window.addEventListener('scroll', updateMobileNavOffset, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateMobileNavOffset);
      window.removeEventListener('scroll', updateMobileNavOffset);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const navItems = [
    { name: "Home", href: "/", tooltip: "Return to homepage", icon: Home },
    { name: "BizMap AI", href: "/bizmap-ai", tooltip: "Validate, build, and launch with guided startup tools", icon: Bot },
    { name: "Community", href: "/mentorship", tooltip: "Mentors, angel investors, and co-founder matchmaking", icon: UsersIcon },
    { name: "Insighta", href: "/insighta", tooltip: "Funding opportunities and investment resources", icon: TrendingUp },
    { name: "More", href: "/newspaper", tooltip: "Stories, prompts, and learning resources", icon: FileText },
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

  const navTriggerBaseClass =
    "group relative flex items-center gap-2 px-3.5 py-2 rounded-[14px] whitespace-nowrap font-medium text-sm outline-none nav-item-hover-effect";
  const navTriggerActiveClass =
    "text-foreground bg-background/90 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.45),inset_0_0_0_1px_hsl(var(--border)/0.9)] nav-active-indicator active";
  const navTriggerInactiveClass = "text-muted-foreground hover:text-foreground";
  const navDropdownClass =
    "nav-dropdown-surface max-w-[calc(100vw-2rem)]";
  const navActionButtonClass =
    "nav-action-button relative h-10 w-10 rounded-[14px] text-muted-foreground hover:text-foreground";
  const getSignedOutTabState = (href: string) => (!user ? getPublicTabState(href) : 'accessible');

  if (!loading && !user) {
    return <VisitorNavbar />;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <nav
        style={{ top: 'var(--banner-height, 0)' } as React.CSSProperties}
        className="fixed left-0 right-0 z-50 transition-all duration-300"
      >
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 pt-3">
          <div
            className={cn(
              "rounded-[22px] border transition-all duration-300 backdrop-blur-xl",
              scrolled
                ? "bg-background/88 border-border/80 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.28)]"
                : "bg-background/72 border-border/68 shadow-[0_12px_32px_-26px_rgba(15,23,42,0.2)]"
            )}
          >
          <div ref={mobileBarRef} className="flex items-center h-16 md:h-[70px] px-3 sm:px-4 lg:px-6 border-0">
            {/* Logo with Enhanced Hover Effects - Fixed width to prevent layout shifts */}
            <div className="flex items-center border-0 flex-shrink-0 w-16 min-w-[4rem]">
              <Link to="/" className="flex items-center justify-center w-full rounded-xl" aria-label="Home">
                <img
                  src={ctLogoPolished}
                  alt="Creatives Takeover Logo"
                  className="site-nav-logo animate-logo-breathing nav-logo-hover"
                  width={44}
                  height={44}
                  decoding="async"
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
              <div className="flex items-center justify-center flex-1 pl-6 lg:pl-10 pr-6 lg:pr-10 !border-0 gap-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon || iconMap[item.name];
                  const active = isActive(item.href);

                  // Special handling for BizMap AI with dropdown
                  if (item.name === 'BizMap AI') {
                    return (
                      <DropdownMenu key={item.name}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger className={cn(
                              navTriggerBaseClass,
                              active
                                ? navTriggerActiveClass
                                : navTriggerInactiveClass
                            )}>
                              {Icon && <Icon className="h-4 w-4 flex-shrink-0 opacity-70 transition-opacity group-hover:opacity-100" />}
                              <span className="tracking-wide">{item.name}</span>
                              <ChevronDown className="h-3 w-3 ml-0.5 opacity-60" />
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{item.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="start" className={cn("w-80 md:w-72 sm:w-64 max-h-[min(520px,80vh)] overflow-y-auto overscroll-contain", navDropdownClass)}>
                          <DropdownMenuLabel>Validate ✅ Build 🛠️ Launch 🚀</DropdownMenuLabel>
                          <DropdownMenuSeparator />
	                          {bizMapSubmenu.map((subItem, idx) => {
	                            if ('type' in subItem && subItem.type === 'label') {
                              return (
                                <DropdownMenuLabel key={idx} className="text-[10px] font-semibold uppercase tracking-wider text-primary mt-2 first:mt-0">
                                  {subItem.label}
                                </DropdownMenuLabel>
                              );
                            }
	                            const linkItem = subItem as { name: string; href: string; icon: React.ComponentType<{ className?: string }>; description: string };
	                            const SubIcon = linkItem.icon;
                            const publicTabState = getSignedOutTabState(linkItem.href);
                            const showSignedOutLock = publicTabState === 'locked';

                            if (publicTabState === 'hidden') {
                              return null;
                            }

                            if (showSignedOutLock) {
                              return (
                                <DropdownMenuItem key={linkItem.name} asChild>
                                  <Link
                                    to={linkItem.href}
                                    onClick={() => trackClick(`${item.name} - ${linkItem.name}`, 'Navigation')}
                                    className="cursor-pointer"
                                  >
                                    <div className="relative mr-2">
                                      <SubIcon className="h-4 w-4 text-muted-foreground" />
                                      <Lock className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full bg-background text-primary" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{linkItem.name}</span>
                                      <span className="text-xs text-muted-foreground">{linkItem.description}</span>
                                    </div>
                                  </Link>
                                </DropdownMenuItem>
                              );
                            }

	                            const toolUnlocked = isToolRouteUnlocked(linkItem.href);
	                            const lockReason = getLockReasonForRoute(linkItem.href);

                            if (!toolUnlocked) {
                              return (
                                <DropdownMenuItem key={linkItem.name} asChild>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setLockedMenuItem({
                                        name: linkItem.name,
                                        reason: lockReason || 'Complete previous stage requirements to unlock this tool.',
                                      })
                                    }
                                    className="w-full cursor-pointer"
                                  >
                                    <Lock className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <div className="flex flex-col text-left">
                                      <span className="font-medium text-muted-foreground">{linkItem.name}</span>
                                      <span className="text-xs text-muted-foreground">{lockReason || 'Locked'}</span>
                                    </div>
                                  </button>
                                </DropdownMenuItem>
                              );
                            }

                            return (
                              <DropdownMenuItem key={linkItem.name} asChild>
                                <Link
                                  to={linkItem.href}
                                  onClick={() => trackClick(`${item.name} - ${linkItem.name}`, 'Navigation')}
                                  className="cursor-pointer"
                                >
                                  <SubIcon className="h-4 w-4 mr-2" />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{linkItem.name}</span>
                                    <span className="text-xs text-muted-foreground">{linkItem.description}</span>
                                  </div>
                                </Link>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }

                  // Special handling for Insighta with dropdown
                  if (item.name === 'Insighta') {
                    return (
                      <DropdownMenu key={item.name}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger className={cn(
                              navTriggerBaseClass,
                              active
                                ? navTriggerActiveClass
                                : navTriggerInactiveClass
                            )}>
                              {Icon && <Icon className="h-4 w-4 flex-shrink-0 opacity-70 transition-opacity group-hover:opacity-100" />}
                              <span className="tracking-wide">{item.name}</span>
                              <ChevronDown className="h-3 w-3 ml-0.5 opacity-60" />
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{item.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="start" className={cn("w-72 md:w-56 sm:w-full", navDropdownClass)}>
                          <DropdownMenuLabel>Distribute?? Fundraise??</DropdownMenuLabel>
                          <DropdownMenuSeparator />
	                          {insightaSubmenu.map((subItem, idx) => {
                              if ('type' in subItem && subItem.type === 'label') {
                                return (
                                  <DropdownMenuLabel key={idx} className="text-[10px] font-semibold uppercase tracking-wider text-primary mt-2 first:mt-0">
                                    {subItem.label}
                                  </DropdownMenuLabel>
                                );
                              }

		                            const SubIcon = subItem.icon;
	                            const publicTabState = getSignedOutTabState(subItem.href);

                            if (publicTabState === 'hidden') {
                              return null;
                            }

	                            return (
	                              <DropdownMenuItem key={subItem.name} asChild>
	                                <Link
	                                  to={subItem.href}
	                                  onClick={() => trackClick(`${item.name} - ${subItem.name}`, 'Navigation')}
	                                  className="cursor-pointer"
	                                >
	                                  <div className="relative mr-2">
	                                    <SubIcon className={cn("h-4 w-4", publicTabState === 'locked' && "text-muted-foreground")} />
	                                    {publicTabState === 'locked' && (
	                                      <Lock className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full bg-background text-primary" />
	                                    )}
	                                  </div>
	                                  <div className="flex flex-col">
	                                    <span className="font-medium">{subItem.name}</span>
	                                    <span className="text-xs text-muted-foreground">
                                          {subItem.description}
                                        </span>
	                                  </div>
	                                </Link>
	                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }

                  // Special handling for Community with dropdown
                  if (item.name === 'Community') {
                    return (
                      <DropdownMenu key={item.name}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger className={cn(
                              navTriggerBaseClass,
                              active
                                ? navTriggerActiveClass
                                : navTriggerInactiveClass
                            )}>
                              {Icon && <Icon className="h-4 w-4 flex-shrink-0 opacity-70 transition-opacity group-hover:opacity-100" />}
                              <span className="tracking-wide">{item.name}</span>
                              <ChevronDown className="h-3 w-3 ml-0.5 opacity-60" />
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{item.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="start" className={cn("w-72 md:w-56 sm:w-full", navDropdownClass)}>
                          <DropdownMenuLabel>Connect & Collab 🌐🤝</DropdownMenuLabel>
                          <DropdownMenuSeparator />
	                          {communitySubmenu.map((subItem) => {
	                            const SubIcon = subItem.icon;
                            const publicTabState = getSignedOutTabState(subItem.href);

                            if (publicTabState === 'hidden') {
                              return null;
                            }

	                            return (
	                              <DropdownMenuItem key={subItem.name} asChild>
	                                <Link
	                                  to={subItem.href}
	                                  onClick={() => trackClick(`${item.name} - ${subItem.name}`, 'Navigation')}
	                                  className="cursor-pointer"
	                                >
	                                  <div className="relative mr-2">
	                                    <SubIcon className={cn("h-4 w-4", publicTabState === 'locked' && "text-muted-foreground")} />
	                                    {publicTabState === 'locked' && (
	                                      <Lock className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full bg-background text-primary" />
	                                    )}
	                                  </div>
	                                  <div className="flex flex-col">
	                                    <span className="font-medium">{subItem.name}</span>
	                                    <span className="text-xs text-muted-foreground">
                                          {subItem.description}
                                        </span>
	                                  </div>
	                                </Link>
	                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }

                  // Special handling for More with dropdown
                  if (item.name === 'More') {
                    return (
                      <DropdownMenu key={item.name}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger className={cn(
                              navTriggerBaseClass,
                              active
                                ? navTriggerActiveClass
                                : navTriggerInactiveClass
                            )}>
                              {Icon && <Icon className="h-4 w-4 flex-shrink-0 opacity-70 transition-opacity group-hover:opacity-100" />}
                              <span className="tracking-wide">{item.name}</span>
                              <ChevronDown className="h-3 w-3 ml-0.5 opacity-60" />
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{item.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="start" className="w-72 md:w-56 sm:w-full max-w-[calc(100vw-2rem)]">
                          <DropdownMenuLabel>Resources for Founders 🗂️</DropdownMenuLabel>
                          <DropdownMenuSeparator />
	                          {resourcesSubmenu.map((subItem) => {
	                            const SubIcon = subItem.icon;
                            const publicTabState = getSignedOutTabState(subItem.href);

                            if (publicTabState === 'hidden') {
                              return null;
                            }

	                            return (
	                              <DropdownMenuItem key={subItem.name} asChild>
	                                <Link
	                                  to={subItem.href}
	                                  onClick={() => trackClick(`${item.name} - ${subItem.name}`, 'Navigation')}
	                                  className="cursor-pointer"
	                                >
	                                  <div className="relative mr-2">
	                                    <SubIcon className={cn("h-4 w-4", publicTabState === 'locked' && "text-muted-foreground")} />
	                                    {publicTabState === 'locked' && (
	                                      <Lock className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full bg-background text-primary" />
	                                    )}
	                                  </div>
	                                  <div className="flex flex-col">
	                                    <span className="font-medium">{subItem.name}</span>
	                                    <span className="text-xs text-muted-foreground">
                                          {subItem.description}
                                        </span>
	                                  </div>
	                                </Link>
	                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }

                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.href}
                          onClick={() => trackClick(item.name, 'Navigation')}
                          className={cn(
                            navTriggerBaseClass,
                            active
                              ? navTriggerActiveClass
                              : navTriggerInactiveClass,
                            item.name === 'BizMap AI' && 'relative'
                          )}
                          onMouseEnter={item.name === 'BizMap AI' ? bizMapHover.handleMouseEnter : undefined}
                          onMouseLeave={item.name === 'BizMap AI' ? bizMapHover.handleMouseLeave : undefined}
                        >
                          {Icon && <Icon className="h-4 w-4 flex-shrink-0 opacity-70 transition-opacity group-hover:opacity-100" />}
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
            )}

            {/* Desktop & Tablet CTA */}
            <div className="desktop-nav-actions flex items-center gap-3 !border-0 ml-auto">
              {loading ? (
                <div className="w-8 h-8 animate-pulse bg-muted rounded-full" />
              ) : user ? (
                <div className="flex items-center gap-2.5 self-center">
                  <CreditDisplay variant="navigation" showPurchaseButton={true} />
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowFriendRequests(true)}
                      className={cn(navActionButtonClass, "touch-manipulation")}
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
                      className={cn(navActionButtonClass, "touch-manipulation")}
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
                  </div>
                  <ThemeToggle />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={cn("cursor-pointer self-center outline-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 nav-action-button h-[42px] w-[42px] rounded-[15px]")}>
                        <Avatar className="h-[42px] w-[42px]">
                          <AvatarImage src={avatarUrl} alt={user.user_metadata?.full_name || 'User'} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                            {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className={cn("w-56", navDropdownClass)}>
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
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <Button variant="ghost" size="sm" asChild className="rounded-xl px-3.5 text-muted-foreground hover:text-foreground hover:bg-background/80">
                    <Link to="/login" className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-xl bg-gradient-unified hover:opacity-95 text-primary-foreground shadow-[0_10px_22px_-14px_hsl(var(--primary)/0.55)] transition-all duration-300 font-semibold px-4"
                    asChild
                  >
                    <Link to="/signup">Sign Up</Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="mobile-nav-trigger flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-border/55 bg-background/72 touch-manipulation active:opacity-70 transition-opacity shadow-sm"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
              aria-controls="mobile-nav-panel"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          <div
            id="mobile-nav-panel"
            className={cn(
              "mobile-nav-panel overflow-hidden transition-[max-height,opacity,border-color] duration-300 ease-out",
              isOpen
                ? "max-h-[calc(100dvh-var(--mobile-nav-offset,88px)-1rem)] opacity-100 border-t border-border/60"
                : "max-h-0 opacity-0 border-t border-transparent"
            )}
            aria-hidden={!isOpen}
          >
            <div className="px-2 pt-2 pb-safe space-y-1 max-h-[calc(100dvh-var(--mobile-nav-offset,88px)-1rem)] overflow-y-auto">
                {/* Theme Toggle at top of mobile menu */}
                <div className="px-4 py-3 border-b border-border sticky top-0 bg-background/95 backdrop-blur-xl z-10">
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
                    const submenuMap: Record<string, { items: BizMapMenuItem[] }> = {
                      'BizMap AI': { items: bizMapSubmenu.filter((s): s is SubmenuLinkItem => !('type' in s)) },
                      'Insighta': { items: insightaSubmenu },
                      'Community': { items: communitySubmenu },
                      'More': { items: resourcesSubmenu },
                    };
                    const submenu = submenuMap[item.name];

                    return (
                      <div key={item.name}>
                        <Link
                          to={item.href}
                          className={cn(
                            "mobile-nav-link block px-4 py-3.5 min-h-[48px] touch-manipulation flex items-center gap-3 text-base transition-all duration-200",
                            "hover:bg-muted/50 active:bg-muted rounded-lg mx-2",
                            active
                              ? "text-foreground font-semibold bg-primary/5"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          onClick={() => setIsOpen(false)}
                        >
                          {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
                          <span>{item.name}</span>
                        </Link>
                        {/* Mobile submenu items */}
                        {submenu && (
                          <div className="ml-10 mr-2 mb-1 space-y-0.5">
	                            {submenu.items.map((sub) => {
                              if ('type' in sub && sub.type === 'label') {
                                return (
                                  <div
                                    key={sub.label}
                                    className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-primary"
                                  >
                                    {sub.label}
                                  </div>
                                );
                              }

		                              const SubIcon = sub.icon;
		                              const publicTabState = getSignedOutTabState(sub.href);

                              if (publicTabState === 'hidden') {
                                return null;
                              }

	                              const subUnlocked = isToolRouteUnlocked(sub.href);
	                              const subLockReason = getLockReasonForRoute(sub.href);

                              if (publicTabState === 'locked') {
                                return (
                                  <Link
                                    key={sub.name}
                                    to={sub.href}
                                    className="mobile-nav-link flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] touch-manipulation text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted rounded-lg transition-colors"
                                    onClick={() => setIsOpen(false)}
                                  >
                                    <div className="relative">
                                      <SubIcon className="h-4 w-4 flex-shrink-0" />
                                      <Lock className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full bg-background text-primary" />
                                    </div>
                                    <div className="flex flex-col text-left">
                                      <span>{sub.name}</span>
                                      <span className="text-xs text-muted-foreground">{sub.description}</span>
                                    </div>
                                  </Link>
                                );
                              }

	                              if (!subUnlocked && item.name === 'BizMap AI') {
                                return (
                                  <button
                                    key={sub.name}
                                    type="button"
                                    className="mobile-nav-link w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] touch-manipulation text-sm text-muted-foreground hover:bg-muted/50 active:bg-muted rounded-lg transition-colors"
                                    onClick={() => {
                                      setIsOpen(false);
                                      setLockedMenuItem({
                                        name: sub.name,
                                        reason: subLockReason || 'Complete previous stage requirements to unlock this tool.',
                                      });
                                    }}
                                  >
                                    <Lock className="h-4 w-4 flex-shrink-0" />
                                    <span className="text-left">{subLockReason || `${sub.name} is locked`}</span>
                                  </button>
                                );
                              }

                              return (
                                <Link
                                  key={sub.name}
                                  to={sub.href}
                                  className="mobile-nav-link flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] touch-manipulation text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted rounded-lg transition-colors"
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
                      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg mb-3 border border-primary/10">
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
                        className="w-full justify-start min-h-[48px] touch-manipulation text-base transition-all duration-200 hover:bg-muted/50 hover:scale-[1.02]"
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
                        className="w-full justify-start min-h-[48px] touch-manipulation text-base transition-all duration-200 hover:bg-muted/50 hover:scale-[1.02]"
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
                        className="w-full justify-start min-h-[48px] touch-manipulation text-base transition-all duration-200 hover:bg-muted/50 hover:scale-[1.02]"
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
                        className="w-full justify-start min-h-[48px] touch-manipulation text-base text-destructive hover:text-destructive hover:bg-destructive/10"
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
                        className="w-full justify-start min-h-[48px] touch-manipulation text-base"
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
          </div>
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

        <Dialog open={!!lockedMenuItem} onOpenChange={(open) => !open && setLockedMenuItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{lockedMenuItem?.name} is locked</DialogTitle>
              <DialogDescription>{lockedMenuItem?.reason}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setLockedMenuItem(null)}>
                Close
              </Button>
              {user ? (
                <Button asChild>
                  <Link to="/bizmap-ai">Open Stage Map</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link to={`/signup?return=${encodeURIComponent('/bizmap-ai')}`}>Sign Up</Link>
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </nav>
    </TooltipProvider>
  );
};

export default Navigation;
