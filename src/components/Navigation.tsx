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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    { name: "Careers", href: "/careers" },
    { name: "About Us", href: "/about" },
    { name: "Pricing", href: "/pricing" }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border shadow-sm">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-20 gap-6">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img src="/lovable-uploads/2ae69f5c-24f2-4a91-ae89-df8696970fd3.png" alt="Logo" className="h-9 w-auto animate-fade-in animate-glow hover:scale-110 transition-transform duration-300" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-10">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`text-base font-medium text-muted-foreground hover:text-foreground transition-colors animated-underline px-3 py-2 ${
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
          <div className="hidden md:flex items-center space-x-3">
            {loading ? (
              <div className="w-8 h-8 animate-pulse bg-muted rounded-full" />
            ) : user ? (
              <>
                <CreditDisplay variant="inline" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="default" className="gap-2 px-4">
                      <User className="w-4 h-4" />
                      <span className="text-base font-medium">
                        {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 z-[100]">
                    <div className="px-2 py-1.5">
                      <SubscriptionStatus variant="inline" />
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/account" className="cursor-pointer flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Account Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer flex items-center gap-2">
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="default" asChild>
                  <Link to="/login" className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Link>
                </Button>
                <Button size="default" className="glass bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </>
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