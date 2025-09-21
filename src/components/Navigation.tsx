import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, LogOut, User, Settings, Gift } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CreditDisplay } from "@/components/CreditDisplay";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";
import { CreditCampaignPopup } from "@/components/CreditCampaignPopup";
import { useHoverPopup } from "@/hooks/useHoverPopup";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut, loading, isAuthenticated } = useAuth();
  
  // Hover popup for BizMap AI menu item
  const bizMapHover = useHoverPopup({ delay: 1500, trigger: 'bizmap-nav' });

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
    { name: "About Us", href: "/about" },
    { name: "Pricing", href: "/pricing" }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border shadow-sm">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img src="/lovable-uploads/2ae69f5c-24f2-4a91-ae89-df8696970fd3.png" alt="Logo" className="h-9 w-auto animate-fade-in hover-scale animate-pulse-scale transition-transform duration-200" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`text-muted-foreground hover:text-foreground transition-colors animated-underline ${
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
                <div className="flex items-center space-x-2 text-sm">
                  <User className="w-4 h-4" />
                  <span className="text-muted-foreground">
                    {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  asChild
                  className="flex items-center gap-2"
                >
                  <Link to="/account">
                    <Settings className="w-4 h-4" />
                    Account
                  </Link>
                </Button>
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
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
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
                  className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
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
    </nav>
  );
};

export default Navigation;