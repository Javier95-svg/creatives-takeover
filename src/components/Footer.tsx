import { Link } from "react-router-dom";
import { Mail, Linkedin, Instagram, Twitter, Youtube } from "lucide-react";

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="relative bg-background border-t border-border/70">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 relative">
        <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <section aria-labelledby="footer-address">
            <p className="text-sm text-muted-foreground">
              Creatives Takeover Ltd is a company registered in England and Wales (Company No. 16741912).
            </p>
            <h2 id="footer-address" className="mt-4 text-sm font-semibold tracking-wide text-foreground">Registered Office</h2>
            <address className="mt-3 text-sm text-muted-foreground not-italic">
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
              href="mailto:javier@creatives-takeover.com"
              className="mt-4 inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              javier@creatives-takeover.com
            </a>
            <a
              href="mailto:admin@creatives-takeover.com"
              className="mt-2 inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline"
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
            <h2 id="footer-social" className="text-sm font-semibold tracking-wide text-foreground">Follow Us</h2>
            <ul className="mt-3 flex flex-wrap items-center gap-1">
              {/* Instagram */}
              <li className="flex items-center">
                <a
                  href="https://www.instagram.com/creativestakeover.official/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex items-center justify-center p-2 min-h-[44px] min-w-[44px] rounded-lg hover:bg-muted/50 transition-colors touch-manipulation"
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
                  className="flex items-center justify-center p-2 min-h-[44px] min-w-[44px] rounded-lg hover:bg-muted/50 transition-colors touch-manipulation"
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
                  className="flex items-center justify-center p-2 min-h-[44px] min-w-[44px] rounded-lg hover:bg-muted/50 transition-colors touch-manipulation"
                >
                  <Linkedin className="h-5 w-5 text-planning hover:text-planning/80 transition-colors" />
                </a>
              </li>
              
              {/* X */}
              <li className="flex items-center">
                <a
                  href="https://x.com/Creatives_Rule"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X"
                  className="flex items-center justify-center p-2 min-h-[44px] min-w-[44px] rounded-lg hover:bg-muted/50 transition-colors touch-manipulation"
                >
                  <svg className="h-5 w-5 text-foreground hover:text-muted-foreground transition-colors" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              </li>
              
              {/* YouTube */}
              <li className="flex items-center">
                <a
                  href="https://www.youtube.com/@CreativesTakeover"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="flex items-center justify-center p-2 min-h-[44px] min-w-[44px] rounded-lg hover:bg-muted/50 transition-colors touch-manipulation"
                >
                  <Youtube className="h-6 w-6 text-action hover:text-action/80 transition-colors" />
                </a>
              </li>
            </ul>
            
          </nav>
        </div>

        <section className="footer-badge-section mt-8 border-t border-border/70 pt-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col gap-3">
              <a
                href="https://www.producthunt.com/products/creatives-takeover?utm_source=badge-follow&utm_medium=badge&utm_source=badge-creatives-takeover"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow on Product Hunt"
                className="shrink-0"
              >
                <img
                  src="https://api.producthunt.com/widgets/embed-image/v1/follow.svg?product_id=1115949&theme=light"
                  alt="Creatives Takeover - The Zero to One Platform | Product Hunt"
                  className="hover:opacity-80 transition-opacity"
                  width="250"
                  height="54"
                />
              </a>

              <a
                href="https://fazier.com/launches/creatives-takeover.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Featured on Fazier"
                className="shrink-0"
              >
                <img
                  src="https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=featured&theme=light"
                  width="250"
                  alt="Fazier badge"
                  className="hover:opacity-80 transition-opacity"
                />
              </a>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href="https://peerpush.net/p/creatives-takeover"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Featured on Peerpush"
                className="shrink-0"
              >
                <img
                  src="https://peerpush.net/p/creatives-takeover/badge"
                  alt="Creatives Takeover badge"
                  className="hover:opacity-80 transition-opacity h-[60px]"
                />
              </a>

              <a
                href="https://useneedle.net/directory/creatives-takeover"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Listed on Needle Directory"
                className="shrink-0"
              >
                <span className="inline-flex h-11 items-center rounded-full border border-border/60 bg-background px-4 text-sm font-medium text-foreground transition-opacity hover:opacity-80">
                  Listed on Needle Directory
                </span>
              </a>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href="https://www.saashub.com/creatives-takeover?utm_source=badge&utm_campaign=badge&utm_content=creatives-takeover&badge_variant=color&badge_kind=approved"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Approved on SaaSHub"
                className="shrink-0"
              >
                <img
                  src="https://cdn-b.saashub.com/img/badges/approved-color.png?v=1"
                  alt="Creatives Takeover badge"
                  className="hover:opacity-80 transition-opacity w-[130px] h-auto"
                />
              </a>

              <a
                href="https://www.foundrlist.com/product/creativestakeover-2"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Live on FoundrList"
                className="shrink-0"
              >
                <img
                  src="https://www.foundrlist.com/api/badge/creativestakeover-2"
                  alt="Live on FoundrList"
                  width="160"
                  height="64"
                  className="hover:opacity-80 transition-opacity w-[138px] h-auto"
                />
              </a>
            </div>
          </div>
        </section>

        {/* RGB gradient divider */}
        <div className="mt-8 pt-8 border-t border-border/70" />
        <div className="mt-6 text-xs text-muted-foreground text-center">
          <span className="gradient-rgb font-semibold">&copy; {year} Creatives Takeover Ltd.</span> All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
