import { Link } from "react-router-dom";
import { Mail, Linkedin, Instagram, Twitter, Youtube } from "lucide-react";

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="relative bg-background border-t-2" style={{
      borderImage: 'linear-gradient(90deg, hsl(var(--blue-primary)), hsl(var(--red-primary)), hsl(var(--green-primary))) 1',
      borderImageSlice: 1
    }}>
      {/* RGB gradient top border */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{
        background: 'linear-gradient(90deg, hsl(var(--blue-primary)), hsl(var(--red-primary)), hsl(var(--green-primary)))'
      }} />
      
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 relative">
        <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <section aria-labelledby="footer-address">
            <h2 id="footer-address" className="text-sm font-semibold tracking-wide text-foreground">Registered Office</h2>
            <address className="mt-3 text-sm text-muted-foreground not-italic">
              <strong>Creatives Takeover Ltd</strong><br />
              71-75, Shelton Street<br />
              Covent Garden<br />
              London, WC2H 9JQ<br />
              United Kingdom
            </address>
          </section>

          <section aria-labelledby="footer-contact">
            <h2 id="footer-contact" className="text-sm font-semibold tracking-wide text-foreground">Contact</h2>
            <p className="mt-3 text-sm text-muted-foreground">Questions or feedback? We’d love to hear from you.</p>
            <a
              href="mailto:admin@creatives-takeover.com"
              className="mt-4 inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              admin@creatives-takeover.com
            </a>
          </section>

          <nav aria-labelledby="footer-legal">
            <h2 id="footer-legal" className="text-sm font-semibold tracking-wide text-foreground">Legal</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link className="hover:underline underline-offset-4" to="/privacy-policy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link className="hover:underline underline-offset-4" to="/terms">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-social">
            <h2 id="footer-social" className="text-sm font-semibold tracking-wide gradient-rgb">Follow Us</h2>
            <ul className="mt-3 flex flex-wrap items-center gap-4">
              {/* Instagram */}
              <li className="flex items-center">
                <a
                  href="https://www.instagram.com/creativestakeover.official/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex items-center justify-center"
                >
                  <Instagram className="h-5 w-5 text-pink-500 hover:text-pink-400 transition-colors" />
                </a>
              </li>
              
              {/* TikTok */}
              <li>
                <a
                  href="https://www.tiktok.com/@creativestakeover"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="flex items-center justify-center"
                >
                  <svg className="h-5 w-5 text-foreground hover:text-muted-foreground transition-colors" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </a>
              </li>
              
              {/* LinkedIn */}
              <li className="flex items-center">
                <a
                  href="https://www.linkedin.com/company/creatives-takeover"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="flex items-center justify-center"
                >
                  <Linkedin className="h-5 w-5 text-planning hover:text-planning/80 transition-colors" />
                </a>
              </li>
              
              {/* X */}
              <li>
                <a
                  href="https://x.com/Creatives_Rule"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X"
                >
                  <span className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center text-lg font-bold">
                    𝕏
                  </span>
                </a>
              </li>
              
              {/* YouTube */}
              <li className="flex items-center">
                <a
                  href="https://www.youtube.com/@CreativesTakeover"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="flex items-center justify-center"
                >
                  <Youtube className="h-5 w-5 text-action hover:text-action/80 transition-colors" />
                </a>
              </li>
              
              {/* Reddit */}
              <li>
                <a
                  href="https://www.reddit.com/r/Creatives_Takeover/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Reddit"
                >
                  <img 
                    src="/lovable-uploads/reddit-logo.png" 
                    alt="Reddit" 
                    className="h-5 w-5 hover:opacity-80 transition-opacity" 
                  />
                </a>
              </li>
            </ul>
            
            {/* Product Hunt Badge */}
            <div className="mt-4 pt-4 border-t border-border">
              <a 
                href="https://www.producthunt.com/products/creatives-takeover?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-creatives-takeover" 
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Featured on Product Hunt"
              >
                <img 
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1025583&theme=light&t=1760234587519" 
                  alt="Creatives Takeover - AI Platform for Creators & Entrepreneurs | Product Hunt" 
                  className="hover:opacity-80 transition-opacity dark:invert dark:opacity-90" 
                  style={{ width: '250px', height: '54px' }} 
                  width="250" 
                  height="54" 
                />
              </a>
            </div>

            {/* Peerpush Badge */}
            <div className="mt-4">
              <a 
                href="https://peerpush.net/p/creatives-takeover" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Featured on Peerpush"
              >
                <img 
                  src="https://peerpush.net/p/creatives-takeover/badge" 
                  alt="Creatives Takeover badge" 
                  className="hover:opacity-80 transition-opacity h-[60px]"
                />
              </a>
            </div>

            {/* SaaSHub Badge */}
            <div className="mt-4">
              <a 
                href='https://www.saashub.com/creatives-takeover?utm_source=badge&utm_campaign=badge&utm_content=creatives-takeover&badge_variant=color&badge_kind=approved' 
                target='_blank'
                rel="noopener noreferrer"
                aria-label="Approved on SaaSHub"
              >
                <img 
                  src="https://cdn-b.saashub.com/img/badges/approved-color.png?v=1" 
                  alt="Creatives Takeover badge" 
                  className="hover:opacity-80 transition-opacity"
                  style={{ maxWidth: '150px' }}
                />
              </a>
            </div>

            {/* Turbo0 Badge */}
            <div className="mt-4">
              <a 
                href="https://turbo0.com/item/creatives-takeover" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Listed on Turbo0"
              >
                <img 
                  src="https://img.turbo0.com/badge-listed-light.svg" 
                  alt="Listed on Turbo0" 
                  className="hover:opacity-80 transition-opacity"
                  style={{ height: '54px', width: 'auto' }}
                />
              </a>
            </div>
          </nav>
        </div>

        {/* RGB gradient divider */}
        <div className="mt-8 pt-8 border-t" style={{
          borderImage: 'linear-gradient(90deg, hsl(var(--blue-primary)), hsl(var(--red-primary)), hsl(var(--green-primary))) 1',
          borderImageSlice: 1
        }} />
        <div className="mt-6 text-xs text-muted-foreground text-center">
          <span className="gradient-rgb font-semibold">&copy; {year} Creatives Takeover Ltd.</span> All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
