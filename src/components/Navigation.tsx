import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, LogOut, User, Settings, Gift, UserPlus, MessageCircle, Home, Bot, BookOpen, TrendingUp, Users, FileText, Info, DollarSign } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CreditDisplay } from "@/components/CreditDisplay";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";
import { CreditCampaignPopup } from "@/components/CreditCampaignPopup";
import { useHoverPopup } from "@/hooks/useHoverPopup";
import { useSocial } from "@/hooks/useSocial";
import { FriendRequestsModal } from "@/components/social/FriendRequestsModal";
import { NotificationBell } from "@/components/community/NotificationBell";
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
  const { user, signOut, loading, isAuthenticated } = useAuth();
  const { pendingFriendRequests } = useSocial(user?.id || '');
  const { trackClick } = usePageAnalytics();
  const deviceType = useDeviceType();
  const location = useLocation();
  
  // Hover popup for BizMap AI menu item
  const bizMapHover = useHoverPopup({ delay: 1500, trigger: 'bizmap-nav' });

  // Icon mapping for navigation items
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    "Home": Home,
    "BizMap AI": Bot,
    "Prompt Library": BookOpen,
    "Insighta": TrendingUp,
    "Community": Users,
    "Stories": FileText,
    "About Us": Info,
    "Pricing": DollarSign,
  };

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
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const navItems = [
    { name: "Home", href: "/", tooltip: "Return to homepage", icon: Home },
    { name: "BizMap AI", href: "/bizmap-ai", tooltip: "AI Co-Founder that creates your business plan", icon: Bot },
    { name: "Prompt Library", href: "/prompt-library", tooltip: "Ready-made prompts to grow your business", icon: BookOpen },
    { name: "Insighta", href: "/insighta", tooltip: "Funding opportunities and investment resources", icon: TrendingUp },
    { name: "Community", href: "/community", tooltip: "Connect with fellow creative entrepreneurs", icon: Users },
    { name: "Stories", href: "/stories", tooltip: "Read insights and articles about building your business", icon: FileText },
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

  return (
    <TooltipProvider delayDuration={200}>
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b-2 transition-all duration-300",
        scrolled 
          ? 'backdrop-blur-xl bg-background/98 shadow-lg animate-nav-backdrop' 
          : 'backdrop-blur-sm bg-background/85 border-border'
      )}
      style={scrolled ? {
        borderImage: 'linear-gradient(90deg, hsl(var(--blue-primary)), hsl(var(--red-primary)), hsl(var(--green-primary))) 1',
        borderImageSlice: 1,
        boxShadow: '0 4px 20px -2px hsl(var(--primary) / 0.1)'
      } : {
        borderColor: 'hsl(var(--border))'
      }}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 border-0">
          <div className="flex items-center h-16 md:h-18 border-0">
            {/* Logo with Enhanced Hover Effects */}
            <div className="flex items-center border-0">
              <Link to="/" className="flex items-center nav-logo-hover" aria-label="Home">
                <img 
                  src={ctLogo} 
                  alt="Creatives Takeover Logo" 
                  className="h-12 w-auto cursor-pointer transition-all duration-300" 
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
              <div className="flex items-center justify-evenly flex-1 pl-4 lg:pl-6 pr-8 lg:pr-16 !border-0 gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon || iconMap[item.name];
                  const active = isActive(item.href);
                  
                  // Color-code navigation items semantically
                  let colorClass = '';
                  if (item.name === 'BizMap AI' || item.name === 'Prompt Library') {
                    colorClass = 'hover:text-planning';
                  } else if (item.name === 'Community' || item.name === 'Stories' || item.name === 'About Us') {
                    colorClass = 'hover:text-action';
                  } else if (item.name === 'Insighta' || item.name === 'Pricing') {
                    colorClass = 'hover:text-growth';
                  } else {
                    colorClass = 'hover:text-primary';
                  }
                  
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.href}
                          onClick={() => trackClick(item.name, 'Navigation')}
                          className={cn(
                            "relative flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-250 whitespace-nowrap font-medium text-sm",
                            "nav-item-hover-effect",
                            active 
                              ? "text-foreground bg-primary/5 nav-active-indicator active" 
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
            )}

          {/* Desktop & Tablet CTA */}
          <div className="hidden md:flex items-center space-x-3 !border-0">
            {loading ? (
              <div className="w-8 h-8 animate-pulse bg-muted rounded-full" />
            ) : user ? (
              <div className="flex items-center space-x-2">
                <CreditDisplay variant="navigation" showPurchaseButton={true} />
                <SubscriptionStatus variant="inline" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFriendRequests(true)}
                  className="relative h-9 w-9 transition-all duration-200 hover:bg-muted/50 hover:scale-110"
                >
                  <UserPlus className="w-4 h-4" />
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
                  className="relative h-9 w-9 transition-all duration-200 hover:bg-muted/50 hover:scale-110"
                >
                  <Link to="/messages">
                    <MessageCircle className="w-4 h-4" />
                  </Link>
                </Button>
                <NotificationBell />
                <ThemeToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full transition-all duration-200 hover:scale-110">
                      <Avatar className="h-9 w-9 hover:ring-2 hover:ring-primary transition-all">
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
                      <Link to="/account" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Account Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowFriendRequests(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span>Friend Requests</span>
                      {pendingFriendRequests.length > 0 && (
                        <Badge variant="destructive" className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs">
                          {pendingFriendRequests.length}
                        </Badge>
                      )}
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
                <Button variant="ghost" size="sm" asChild className="transition-all duration-200 hover:scale-105">
                  <Link to="/login" className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Link>
                </Button>
                <Button 
                  size="sm" 
                  className="bg-gradient-unified hover:opacity-90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 font-semibold px-4" 
                  asChild
                >
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] touch-manipulation !border-0 active:opacity-70 transition-opacity"
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
          <div className="md:hidden fixed top-16 left-0 right-0 bottom-0 bg-background border-t border-border animate-mobile-drawer safe-area-inset z-50 shadow-2xl">
            <div className="px-2 pt-2 pb-safe space-y-1 max-h-[calc(100vh-64px)] overflow-y-auto">
              {/* Theme Toggle at top of mobile menu */}
              <div className="px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Theme</span>
                  <ThemeToggle />
                </div>
              </div>
              <div className="py-2">
                {navItems.map((item) => {
                  const Icon = item.icon || iconMap[item.name];
                  const active = isActive(item.href);
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        "block px-4 py-3.5 min-h-[48px] touch-manipulation flex items-center gap-3 text-base transition-all duration-200",
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
                      <Link to="/messages" className="flex items-center">
                        <MessageCircle className="w-5 h-5 mr-3" />
                        Messages
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start relative min-h-[48px] touch-manipulation text-base transition-all duration-200 hover:bg-muted/50 hover:scale-[1.02]" 
                      onClick={() => {
                        setIsOpen(false);
                        setShowFriendRequests(true);
                      }}
                    >
                      <UserPlus className="w-5 h-5 mr-3" />
                      Friend Requests
                      {pendingFriendRequests.length > 0 && (
                        <Badge variant="destructive" className="ml-auto h-6 w-6 flex items-center justify-center p-0 text-xs font-semibold animate-pulse">
                          {pendingFriendRequests.length}
                        </Badge>
                      )}
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
                        Account Settings
                      </Link>
                    </Button>
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