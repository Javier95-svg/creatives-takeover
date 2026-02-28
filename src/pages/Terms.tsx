import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";

const Terms = () => {
  return (
    <>
      <Helmet>
        <title>Terms of Service | Creatives Takeover</title>
        <meta
          name="description"
          content="Review the Terms of Service governing your use of Creatives Takeover, including AI startup-building tools, subscriptions, credits, community features, messaging, and mentor services."
        />
        <link rel="canonical" href="/terms" />
      </Helmet>
      <HomeWallpaper />
      <div className="relative min-h-screen">
        <Navigation />
        <main className="container mx-auto px-6 py-24">
          <header className="mb-16 text-center">
            <h1 className="text-4xl md:text-6xl font-bold gradient-text creatives-font mb-6">
              Terms of Service
            </h1>
          </header>

          <div className="max-w-4xl mx-auto space-y-8">
            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">1. Acceptance of Terms</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">1.1.</span> By accessing or using the service, you agree to these Terms and our Privacy Policy.</p>
                <p><span className="text-primary font-medium">1.2.</span> If you do not agree, do not use the service.</p>
                <p><span className="text-primary font-medium">1.3.</span> If you use the service on behalf of a business or organization, you represent that you have authority to bind that entity.</p>
                <p><span className="text-primary font-medium">1.4.</span> We may update these Terms from time to time. Continued use after updated Terms become effective means you accept the revised Terms.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">2. Description of the Service</h2>
              <div className="text-foreground/90 space-y-4">
                <p>Creatives Takeover is a founder support platform built to help users build startups from scratch and move from idea to execution.</p>
                <p>The platform may include, for example:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li><strong className="text-primary">BizMap AI</strong> and the Startup Development Cycle workflow.</li>
                  <li><strong className="text-primary">Founder tools</strong> such as ICP Builder, Waitlist Maker, PMF Lab, MVP Builder, Tech Stack, GTM Strategist, Directories, Focus Funnel, and Prompt Library.</li>
                  <li><strong className="text-primary">Insighta features</strong> such as VC Search, Accelerator Hunt, Email Templates, Pitch Deck Analyzer, and the Insighta Test.</li>
                  <li><strong className="text-primary">Community features</strong> including profiles, posts, comments, matching, messaging, and founder networking.</li>
                  <li><strong className="text-primary">Marketplace and support features</strong> including mentor discovery, booking flows, and founder-to-founder or founder-to-mentor communication.</li>
                </ul>
                <p><span className="text-primary font-medium">2.1.</span> Features may change over time. Some tools may be in beta, may be renamed, or may be added, modified, paused, or removed without permanent availability.</p>
                <p><span className="text-primary font-medium">2.2.</span> Some parts of the service require a paid subscription, credits, or both.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">3. Accounts and Eligibility</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">3.1.</span> You must provide accurate information and keep it reasonably up to date.</p>
                <p><span className="text-primary font-medium">3.2.</span> You are responsible for safeguarding your login credentials and for activity under your account.</p>
                <p><span className="text-primary font-medium">3.3.</span> You must be at least 18 years old and legally capable of entering a binding agreement to use the service.</p>
                <p><span className="text-primary font-medium">3.4.</span> We may suspend or restrict accounts that appear fraudulent, abusive, duplicated without authorization, or otherwise in violation of these Terms.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">4. Acceptable Use</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">4.1.</span> You may use the service only for lawful purposes and in accordance with these Terms.</p>
                <p>You must not:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Break the law or infringe another person&apos;s rights.</li>
                  <li>Post or send abusive, defamatory, hateful, fraudulent, or misleading content.</li>
                  <li>Upload malware, malicious code, or harmful files.</li>
                  <li>Interfere with the service, security controls, or infrastructure.</li>
                  <li>Scrape, reverse engineer, or use automated methods to extract data or reproduce substantial parts of the service without our written permission.</li>
                  <li>Use the platform to spam, impersonate others, or manipulate community interactions.</li>
                  <li>Use the service to build a competing product through unauthorized extraction of prompts, outputs, system behavior, or platform data.</li>
                </ul>
                <p><span className="text-primary font-medium">4.2.</span> We may investigate suspected violations and take action including content removal, feature restriction, suspension, or termination.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">5. Your Content and Intellectual Property</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">5.1.</span> You retain ownership of the content you create, upload, or submit to the service, including startup notes, prompts, files, posts, comments, and messages, subject to the rights you grant below.</p>
                <p><span className="text-primary font-medium">5.2.</span> You grant us a non-exclusive, worldwide, royalty-free license to host, process, store, reproduce, and display your content as needed to operate, secure, and improve the service.</p>
                <p><span className="text-primary font-medium">5.3.</span> If you choose to share content publicly or within community surfaces, you grant us the right to display and distribute that content within those features.</p>
                <p><span className="text-primary font-medium">5.4.</span> You represent that you have the necessary rights to upload or share your content and that doing so does not violate law or third-party rights.</p>
                <p><span className="text-primary font-medium">5.5.</span> The service itself, including software, branding, design, workflows, and platform content other than your content, belongs to Creatives Takeover or its licensors and is protected by law.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">6. AI Features and Outputs</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">6.1.</span> Our AI-powered features are designed to help you think, validate, plan, and execute faster. Outputs are generated from models and may be incomplete, inaccurate, biased, or outdated.</p>
                <p><span className="text-primary font-medium">6.2.</span> You are responsible for reviewing, testing, and validating AI outputs before relying on them.</p>
                <p><span className="text-primary font-medium">6.3.</span> The service does not provide legal, tax, accounting, regulated investment, or other professional advice.</p>
                <p><span className="text-primary font-medium">6.4.</span> We do not guarantee funding, revenue, product-market fit, launch success, customer demand, or any particular business outcome.</p>
                <p><span className="text-primary font-medium">6.5.</span> Private workspace content is treated as private by default unless you choose to publish or share it through a public feature.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">7. Subscriptions, Credits, and Payments</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">7.1.</span> We may offer free and paid plans, credits, usage-based limits, promotional access, and beta access. Current plan and feature details are shown on the platform and may change over time.</p>
                <p><span className="text-primary font-medium">7.2.</span> Paid subscriptions renew automatically unless canceled before the next billing date, except where stated otherwise at checkout.</p>
                <p><span className="text-primary font-medium">7.3.</span> You authorize us and our payment providers to charge the payment method associated with your account for applicable fees, taxes, and renewals.</p>
                <p><span className="text-primary font-medium">7.4.</span> Credits, usage allowances, and feature access may vary by plan. Unless expressly stated otherwise, unused credits do not roll over.</p>
                <p><span className="text-primary font-medium">7.5.</span> We may change pricing, credit allocations, or plan structure in the future. Where required, we will provide notice before changes take effect.</p>
                <p><span className="text-primary font-medium">7.6.</span> Refunds are only provided where required by law or where we expressly agree otherwise.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">8. Community, Messaging, and Marketplace Features</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">8.1.</span> Community and messaging features exist to help founders connect, learn, collaborate, and get support. You are responsible for what you post and send.</p>
                <p><span className="text-primary font-medium">8.2.</span> We may moderate, remove, restrict, or review content that violates these Terms, harms the platform, or creates legal or safety risk.</p>
                <p><span className="text-primary font-medium">8.3.</span> Mentors, founders, angel contacts, and other third parties available through the platform may be independent parties and not our employees or agents.</p>
                <p><span className="text-primary font-medium">8.4.</span> We facilitate introductions, discovery, and platform communication, but we are not responsible for independent advice, arrangements, conduct, or outcomes arising from those relationships.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">9. Privacy</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">9.1.</span> Your use of the service is also governed by our Privacy Policy, which explains how we collect, use, and protect personal information.</p>
                <p><span className="text-primary font-medium">9.2.</span> By using the service, you acknowledge that some features require us to process content you provide in order to deliver the service.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">10. Third-Party Services</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">10.1.</span> We may rely on or link to third-party tools and providers, including payment providers, infrastructure vendors, AI vendors, scheduling tools, authentication services, and external websites.</p>
                <p><span className="text-primary font-medium">10.2.</span> Those third parties operate under their own terms and privacy notices. We are not responsible for their independent content, security, availability, or conduct.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">11. Availability and Changes</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">11.1.</span> We aim to keep the service available, but we do not guarantee uninterrupted or error-free operation.</p>
                <p><span className="text-primary font-medium">11.2.</span> We may modify, suspend, or discontinue all or part of the service at any time, including features that are experimental, low-usage, or under maintenance.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">12. Disclaimers</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">12.1.</span> The service is provided "as is" and "as available" to the fullest extent permitted by law.</p>
                <p><span className="text-primary font-medium">12.2.</span> We disclaim all implied warranties, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement, except where such disclaimers are prohibited by law.</p>
                <p><span className="text-primary font-medium">12.3.</span> We do not warrant that the service will meet every expectation, be continuously available, or produce error-free outputs.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">13. Limitation of Liability</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">13.1.</span> To the maximum extent permitted by law, Creatives Takeover and its affiliates, officers, employees, and agents will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of profits, revenues, goodwill, data, or business opportunity.</p>
                <p><span className="text-primary font-medium">13.2.</span> To the maximum extent permitted by law, our total aggregate liability arising out of or relating to the service or these Terms will not exceed the greater of: (a) the amount you paid us in the 12 months before the event giving rise to the claim, or (b) GBP 100.</p>
                <p><span className="text-primary font-medium">13.3.</span> Nothing in these Terms excludes or limits liability that cannot be excluded under applicable law.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">14. Indemnity</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">14.1.</span> You agree to indemnify and hold harmless Creatives Takeover and its affiliates, officers, employees, and agents from claims, losses, liabilities, and expenses arising out of your misuse of the service, your content, or your violation of these Terms or applicable law.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">15. Suspension and Termination</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">15.1.</span> You may stop using the service at any time and may cancel your subscription in accordance with your billing settings.</p>
                <p><span className="text-primary font-medium">15.2.</span> We may suspend or terminate access if you violate these Terms, create legal or security risk, misuse the platform, fail to pay applicable fees, or if we discontinue the service.</p>
                <p><span className="text-primary font-medium">15.3.</span> On termination, your right to use the service ends immediately, but provisions that should reasonably survive termination will continue to apply.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">16. Governing Law</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">16.1.</span> These Terms are governed by the laws of England and Wales.</p>
                <p><span className="text-primary font-medium">16.2.</span> Subject to any non-excludable consumer rights, disputes arising out of or relating to these Terms or the service will be subject to the courts of England and Wales.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">17. General Terms</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">17.1.</span> These Terms and the Privacy Policy form the entire agreement between you and us regarding the service.</p>
                <p><span className="text-primary font-medium">17.2.</span> If any provision is found unenforceable, the remaining provisions will remain in effect.</p>
                <p><span className="text-primary font-medium">17.3.</span> Our failure to enforce a provision is not a waiver of that provision.</p>
                <p><span className="text-primary font-medium">17.4.</span> You may not assign these Terms without our prior written consent. We may assign them as part of a merger, reorganization, or transfer of the business.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">18. Contact Information</h2>
              <div className="space-y-4 text-foreground/90">
                <p>If you have questions about these Terms, contact us:</p>
                <div className="grid md:grid-cols-2 gap-6 mt-4">
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-primary">Founder & CEO</h3>
                    <p><strong>Email:</strong> javier@creatives-takeover.com</p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-primary">General Support</h3>
                    <p><strong>Email:</strong> admin@creatives-takeover.com</p>
                    <p><strong>Website:</strong> https://creatives-takeover.com/contact</p>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  <h3 className="text-lg font-medium text-primary">Registered Office</h3>
                  <p>
                    Creatives Takeover Ltd<br />
                    Company No. 16741912<br />
                    71-75 Shelton Street<br />
                    Covent Garden<br />
                    London, WC2H 9JQ<br />
                    United Kingdom
                  </p>
                </div>
              </div>
            </section>

            <div className="glass-card bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
              <p className="text-sm text-foreground/80">
                <strong className="text-primary">Acknowledgment:</strong> By creating an account
                or using Creatives Takeover, you acknowledge that you have read and understood
                these Terms and agree to be bound by them.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Terms;
