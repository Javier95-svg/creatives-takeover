import { Link } from "react-router-dom";
import { Mail, Linkedin, Instagram, Twitter, Youtube } from "lucide-react";

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
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
            <h2 id="footer-social" className="text-sm font-semibold tracking-wide text-foreground">Follow</h2>
            <ul className="mt-3 flex flex-wrap items-center gap-4">
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
              <li className="flex items-center">
                <a
                  href="https://www.linkedin.com/company/creatives-takeover"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="flex items-center justify-center"
                >
                  <Linkedin className="h-5 w-5 text-blue-600 hover:text-blue-500 transition-colors" />
                </a>
              </li>
              <li className="flex items-center">
                <a
                  href="https://www.youtube.com/@CreativesTakeover"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="flex items-center justify-center"
                >
                  <Youtube className="h-5 w-5 text-red-600 hover:text-red-500 transition-colors" />
                </a>
              </li>
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
              <li>
                <a
                  href="https://discord.gg/kcsxMzGw"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Discord"
                >
                  <img 
                    src="/lovable-uploads/discord-logo.png" 
                    alt="Discord" 
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
                  className="hover:opacity-80 transition-opacity" 
                  style={{ width: '250px', height: '54px' }} 
                  width="250" 
                  height="54" 
                />
              </a>
            </div>
          </nav>
        </div>

        <div className="mt-8 text-xs text-muted-foreground">
          &copy; {year} Creatives Takeover Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
