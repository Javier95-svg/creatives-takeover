import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";


const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: "Home", href: "/" },
    { name: "BizMap AI", href: "/dream2plan" },
    { name: "About Us", href: "/about" },
    { name: "Pricing", href: "/pricing" }
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
            <Button variant="ghost" size="sm" aria-label="Login">
              Login
            </Button>
            <Button asChild size="sm" className="glass bg-primary hover:bg-primary/90 text-primary-foreground" aria-label="Sign Up">
              <Link to="/signup">Sign Up</Link>
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
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setIsOpen(false)}>
                  Login
                </Button>
                <Button asChild size="sm" className="w-full glass bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setIsOpen(false)}>
                  <Link to="/signup">Sign Up</Link>
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