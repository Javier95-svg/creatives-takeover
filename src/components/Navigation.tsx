import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, LogOut, User, Settings, Gift, UserPlus, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const { user, signOut, loading, isAuthenticated } = useAuth();
  const { pendingFriendRequests } = useSocial(user?.id || '');
  const { trackClick } = usePageAnalytics();
  
  // Hover popup for BizMap AI menu item
  const bizMapHover = useHoverPopup({ delay: 1500, trigger: 'bizmap-nav' });

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

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const navItems = [
    { name: "Home", href: "/" },
    { name: "BizMap AI", href: "/dream2plan" },
    { name: "Prompt Library", href: "/prompt-library" },
    { name: "Insighta", href: "/news" },
    { name: "Community", href: "/community" },
    { name: "Careers", href: "/careers" },
    { name: "About Us", href: "/about" },
    { name: "Pricing", href: "/pricing" }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border shadow-sm">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
        <div className="flex items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img src="/lovable-uploads/2ae69f5c-24f2-4a91-ae89-df8696970fd3.png" alt="Logo" className="h-12 w-auto animate-fade-in animate-glow hover:scale-110 transition-transform duration-300" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center justify-evenly flex-1 pl-4 lg:pl-6 pr-8 lg:pr-16">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => trackClick(item.name, 'Navigation')}
                className={`text-muted-foreground hover:text-foreground transition-colors animated-underline whitespace-nowrap ${
                  item.name === 'BizMap AI' ? 'relative' : ''
                }`}
                onMouseEnter={item.name === 'BizMap AI' ? bizMapHover.handleMouseEnter : undefined}
                onMouseLeave={item.name === 'BizMap AI' ? bizMapHover.handleMouseLeave : undefined}
              >
                {item.name}
                {item.name === 'BizMap AI' && !isAuthenticated && !bizMapHover.hasShown && (
                  <div className="absolute -top-1 -right-2 flex items-center">
                    <Gift className="w-3 h-3 text-primary animate-bounce" />
                  </div>
                )}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-4">
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
                  className="relative"
                >
                  <UserPlus className="w-4 h-4" />
                  {pendingFriendRequests.length > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {pendingFriendRequests.length}
                    </Badge>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="relative"
                >
                  <Link to="/messages">
                    <MessageCircle className="w-4 h-4" />
                  </Link>
                </Button>
                <NotificationBell />
                <Link to="/account" className="cursor-pointer">
                  <Avatar className="h-8 w-8 hover:ring-2 hover:ring-primary transition-all">
                    <AvatarImage src={avatarUrl} alt={user.user_metadata?.full_name || 'User'} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login" className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Link>
                </Button>
                <Button size="sm" className="glass bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] touch-manipulation"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t border-border animate-slide-in-right">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="block px-4 py-4 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] touch-manipulation flex items-center"
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="px-3 py-2 space-y-2">
                {loading ? (
                  <div className="w-full h-10 animate-pulse bg-muted rounded" />
                ) : user ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}</span>
                      </div>
                      <CreditDisplay variant="inline" />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start" 
                      onClick={() => setIsOpen(false)}
                      asChild
                    >
                      <Link to="/messages" className="flex items-center">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Messages
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start relative" 
                      onClick={() => {
                        setIsOpen(false);
                        setShowFriendRequests(true);
                      }}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Friend Requests
                      {pendingFriendRequests.length > 0 && (
                        <Badge variant="destructive" className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs">
                          {pendingFriendRequests.length}
                        </Badge>
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start" 
                      onClick={() => setIsOpen(false)}
                      asChild
                    >
                      <Link to="/account" className="flex items-center">
                        <Settings className="w-4 h-4 mr-2" />
                        Account
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start" 
                      onClick={() => {
                        setIsOpen(false);
                        handleSignOut();
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setIsOpen(false)} asChild>
                      <Link to="/login" className="flex items-center">
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign In
                      </Link>
                    </Button>
                    <Button size="sm" className="w-full glass bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setIsOpen(false)} asChild>
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
  );
};

export default Navigation;