import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import ctLogo from '@/assets/ct-logo.png';

const CreativesTakeoverHeader = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);

  const toggleNav = () => {
    setIsNavOpen(!isNavOpen);
  };

  const closeNav = () => {
    setIsNavOpen(false);
  };

  return (
    <header className="site-header sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="header-inner container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/">
            <img src={ctLogo} alt="Creatives Takeover" className="h-10 w-10" />
          </Link>

          {/* Desktop Navigation */}
          <nav 
            id="site-nav" 
            className="hidden md:flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-2 py-1 shadow-sm text-sm"
            aria-hidden="false"
          >
            <a href="#work" className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              Work
            </a>
            <a href="#services" className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              Services
            </a>
            <a href="#about" className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              About
            </a>
            <a href="#contact" className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              Contact
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            id="navToggle"
            className="nav-toggle md:hidden rounded-full border border-border/60 bg-background/80 p-2 text-foreground shadow-sm hover:bg-muted/50 transition-colors"
            onClick={toggleNav}
            aria-expanded={isNavOpen}
            aria-controls="site-nav"
            aria-label="Toggle navigation menu"
          >
            {isNavOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav 
          id="mobile-nav"
          className={`md:hidden transition-all duration-300 ease-in-out ${
            isNavOpen 
              ? 'max-h-64 opacity-100 transform translate-y-0' 
              : 'max-h-0 opacity-0 transform -translate-y-4'
          } overflow-hidden mt-2`}
          aria-hidden={!isNavOpen}
        >
          <div className="rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl px-4 py-4 shadow-sm space-y-3">
            <a 
              href="#work" 
              className="block rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              onClick={closeNav}
            >
              Work
            </a>
            <a 
              href="#services" 
              className="block rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              onClick={closeNav}
            >
              Services
            </a>
            <a 
              href="#about" 
              className="block rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              onClick={closeNav}
            >
              About
            </a>
            <a 
              href="#contact" 
              className="block rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              onClick={closeNav}
            >
              Contact
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default CreativesTakeoverHeader;
