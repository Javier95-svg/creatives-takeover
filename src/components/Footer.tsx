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
                  href="https://www.threads.com/@creativestakeover.official"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Threads"
                  className="flex items-center justify-center"
                >
                  <svg className="h-5 w-5 text-foreground hover:text-muted-foreground transition-colors" viewBox="0 0 192 192" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z"/>
                  </svg>
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
