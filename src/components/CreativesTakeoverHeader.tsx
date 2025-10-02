import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const CreativesTakeoverHeader = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);

  const toggleNav = () => {
    setIsNavOpen(!isNavOpen);
  };

  const closeNav = () => {
    setIsNavOpen(false);
  };

  return (
    <header className="site-header sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="header-inner container mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 gap-8">
          {/* Logo */}
          <Link to="/" className="creatives-font text-xl font-bold takeover-gradient flex-shrink-0">
            Creatives Takeover
          </Link>

          {/* Desktop Navigation */}
          <nav 
            id="site-nav" 
            className="hidden md:flex items-center space-x-8 ml-auto"
            aria-hidden="false"
          >
            <Link to="#work" className="text-foreground hover:text-primary animated-underline transition-colors text-sm font-medium">
              Work
            </Link>
            <Link to="#services" className="text-foreground hover:text-primary animated-underline transition-colors text-sm font-medium">
              Services
            </Link>
            <Link to="#about" className="text-foreground hover:text-primary animated-underline transition-colors text-sm font-medium">
              About
            </Link>
            <Link to="#contact" className="text-foreground hover:text-primary animated-underline transition-colors text-sm font-medium">
              Contact
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            id="navToggle"
            className="nav-toggle md:hidden p-2 text-foreground hover:text-primary transition-colors ml-auto"
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
          } overflow-hidden`}
          aria-hidden={!isNavOpen}
        >
          <div className="py-4 space-y-4 border-t border-border">
            <Link 
              to="#work" 
              className="block text-foreground hover:text-primary transition-colors py-2"
              onClick={closeNav}
            >
              Work
            </Link>
            <Link 
              to="#services" 
              className="block text-foreground hover:text-primary transition-colors py-2"
              onClick={closeNav}
            >
              Services
            </Link>
            <Link 
              to="#about" 
              className="block text-foreground hover:text-primary transition-colors py-2"
              onClick={closeNav}
            >
              About
            </Link>
            <Link 
              to="#contact" 
              className="block text-foreground hover:text-primary transition-colors py-2"
              onClick={closeNav}
            >
              Contact
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default CreativesTakeoverHeader;