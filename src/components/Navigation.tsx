import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: "Home", href: "/" },
    { name: "How It Works", href: "/how-it-works" },
    { name: "Software", href: "/software" },
    { name: "Resources", href: "/resources" },
    { name: "Pricing", href: "/pricing" },
    { name: "Community", href: "/community" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border shadow-sm">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="text-2xl font-bold gradient-text">Creatives Takeover</a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors animated-underline"
              >
                {item.name}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-4">
            <a href="/faq" className="text-sm text-muted-foreground hover:text-foreground animated-underline">
              FAQ
            </a>
            <DropdownMenu>
              <DropdownMenuTrigger className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                Legal <ChevronDown className="w-4 h-4" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[220px]">
                <DropdownMenuItem asChild>
                  <a href="/privacy-policy" className="w-full">Privacy Policy</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/terms" className="w-full">Terms of Service</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/ip-policy" className="w-full">IP Policy</a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" aria-label="Login">
              Login
            </Button>
            <Button size="sm" className="glass bg-primary hover:bg-primary/90 text-primary-foreground" aria-label="Sign Up">
              Sign Up
            </Button>
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
                <a
                  key={item.name}
                  href={item.href}
                  className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <div className="px-3 py-2 space-y-2">
                <a
                  href="/faq"
                  className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  FAQ
                </a>
                <div className="pl-3">
                  <a href="/privacy-policy" className="block py-2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setIsOpen(false)}>
                    Privacy Policy
                  </a>
                  <a href="/terms" className="block py-2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setIsOpen(false)}>
                    Terms of Service
                  </a>
                  <a href="/ip-policy" className="block py-2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setIsOpen(false)}>
                    IP Policy
                  </a>
                </div>
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setIsOpen(false)}>
                  Login
                </Button>
                <Button size="sm" className="w-full glass bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setIsOpen(false)}>
                  Sign Up
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;