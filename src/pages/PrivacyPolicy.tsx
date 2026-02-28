import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";

const PrivacyPolicy = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | Creatives Takeover</title>
        <meta
          name="description"
          content="Read how Creatives Takeover collects, uses, stores, and protects personal data across its AI startup-building tools, community features, messaging, subscriptions, and support services."
        />
        <link rel="canonical" href="/privacy-policy" />
      </Helmet>
      <HomeWallpaper />
      <div className="relative min-h-screen">
        <Navigation />
        <main className="container mx-auto px-6 py-24">
          <header className="mb-16 text-center">
            <h1 className="text-4xl md:text-6xl font-bold gradient-text creatives-font mb-6">
              Privacy Policy
            </h1>
          </header>

          <div className="max-w-4xl mx-auto space-y-8">
            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">1. Information We Collect</h2>
              <div className="space-y-6 text-foreground/90">
                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">1.1 Information you give us</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li><strong>Account details:</strong> name, username, email address, password, profile photo, and any bio or links you add.</li>
                    <li><strong>Founder and startup details:</strong> idea descriptions, startup stage, target customer, validation notes, goals, and other information you enter while building.</li>
                    <li><strong>Workspace content:</strong> prompts, AI chats, saved outputs, startup planning notes, uploaded files, waitlist drafts, PMF inputs, MVP scope, GTM plans, and related materials.</li>
                    <li><strong>Community and messaging data:</strong> posts, comments, reactions, direct messages, mentor conversations, booking requests, and co-founder or angel matching activity.</li>
                    <li><strong>Payment and subscription details:</strong> billing contact details, subscription status, transaction records, and credit usage data. Card details are processed by our payment provider, not stored by us in full.</li>
                    <li><strong>Support communications:</strong> emails, feedback, bug reports, and other messages you send to us.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">1.2 Information we collect automatically</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li><strong>Device and connection data:</strong> IP address, browser type, operating system, device identifiers, and approximate location derived from IP.</li>
                    <li><strong>Usage data:</strong> pages viewed, routes visited, searches, clicks, session activity, referral source, and feature usage across tools like BizMap AI, Insighta, community, and messaging.</li>
                    <li><strong>Diagnostic data:</strong> logs, crash information, performance signals, failed requests, and security events.</li>
                    <li><strong>Cookies and similar technologies:</strong> data used to keep you signed in, remember preferences, secure sessions, and understand product usage.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">1.3 Information from third parties</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li><strong>Authentication providers:</strong> basic profile information if you sign in through an external provider.</li>
                    <li><strong>Payment providers:</strong> payment confirmations, subscription status, and fraud-prevention signals.</li>
                    <li><strong>Service providers:</strong> analytics, email delivery, infrastructure, scheduling, and similar vendors that help us operate the platform.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">2. How We Use Your Information</h2>
              <div className="space-y-4 text-foreground/90">
                <p>We use personal information to operate, secure, and improve the platform, including to:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Create and manage user accounts and profiles.</li>
                  <li>Provide the Startup Development Cycle experience and related tools, including BizMap AI, ICP Builder, Waitlist Maker, PMF Lab, MVP Builder, Tech Stack, GTM Strategist, Directories, Focus Funnel, Prompt Library, and Insighta features.</li>
                  <li>Save your workspace progress, startup materials, and tool outputs.</li>
                  <li>Enable community participation, direct messaging, mentor outreach, co-founder matching, angel discovery, and booking workflows.</li>
                  <li>Process subscriptions, payments, credits, invoices, and refunds.</li>
                  <li>Send service communications such as security alerts, product updates, account notices, booking confirmations, and support replies.</li>
                  <li>Monitor abuse, enforce our Terms of Service, prevent fraud, and protect platform integrity.</li>
                  <li>Analyze usage patterns so we can improve reliability, UX, onboarding, and feature quality.</li>
                  <li>Comply with legal obligations and respond to lawful requests.</li>
                </ul>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">3. Legal Bases for Processing</h2>
              <div className="space-y-4 text-foreground/90">
                <p>Where UK GDPR or EU GDPR applies, we rely on one or more of the following legal bases:</p>
                <ul className="list-disc list-inside space-y-3 pl-4">
                  <li><strong className="text-primary">Contract:</strong> to provide the services you request, maintain your account, process payments, and deliver platform functionality.</li>
                  <li><strong className="text-primary">Legitimate interests:</strong> to improve the product, secure the platform, prevent misuse, support users, and operate our business responsibly.</li>
                  <li><strong className="text-primary">Consent:</strong> where you opt in to marketing or other optional processing.</li>
                  <li><strong className="text-primary">Legal obligation:</strong> where we must keep records, respond to valid legal requests, or satisfy regulatory obligations.</li>
                </ul>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">4. AI, Workspace Content, and Your Startup Information</h2>
              <div className="space-y-4 text-foreground/90">
                <p>
                  Creatives Takeover is built to help founders, indie hackers, and builders move
                  from scratch to execution. That requires us to process the information you enter
                  into the platform so features can work.
                </p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>We process your prompts, files, notes, and tool inputs to generate outputs, save progress, and personalize your experience.</li>
                  <li>Your private workspace content is not made public unless you choose to share it through a public or community feature.</li>
                  <li>Community posts, public profile fields, mentor listings, and similar public-facing materials are visible to other users as part of the service.</li>
                  <li>We do not sell your private startup materials or business ideas to third parties.</li>
                  <li>Because no online system can promise absolute security, you should use reasonable judgment before sharing highly sensitive information that you are not comfortable storing digitally.</li>
                </ul>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">5. When We Share Information</h2>
              <div className="space-y-6 text-foreground/90">
                <p className="font-medium">We do not sell personal information. We share data only in limited situations such as the following:</p>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">5.1 Service providers</h3>
                  <p className="mb-4">We work with vendors that support hosting, authentication, databases, email delivery, payment processing, analytics, AI features, scheduling, and customer support.</p>
                  <p>These providers process information on our behalf under contractual or legal safeguards appropriate to their role.</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">5.2 Public and social features</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Profile details you choose to make visible may be seen by other users.</li>
                    <li>Community posts, comments, co-founder listings, and similar submissions may be visible within the relevant area of the platform.</li>
                    <li>Messages and bookings are shared with the intended recipient or participant as part of the service.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">5.3 Legal and safety reasons</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>To comply with law, court orders, or lawful requests from competent authorities.</li>
                    <li>To investigate suspected abuse, fraud, security incidents, or violations of our Terms.</li>
                    <li>To protect the rights, safety, and property of Creatives Takeover, our users, or others.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">5.4 Business transfers</h3>
                  <p>If we are involved in a merger, acquisition, financing, reorganization, or sale of assets, relevant information may be transferred as part of that transaction, subject to applicable law.</p>
                </div>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">6. Cookies and Similar Technologies</h2>
              <div className="space-y-4 text-foreground/90">
                <p>We use cookies and similar technologies to operate and improve the platform.</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li><strong>Essential cookies:</strong> required for sign-in, session management, security, and core functionality.</li>
                  <li><strong>Functional cookies:</strong> used to remember preferences and improve usability.</li>
                  <li><strong>Analytics technologies:</strong> used to understand feature adoption, performance, and navigation patterns.</li>
                </ul>
                <p>You can manage cookies through your browser settings, but disabling some cookies may reduce or break parts of the service.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">7. Data Security</h2>
              <div className="space-y-4 text-foreground/90">
                <p>We use reasonable technical and organizational safeguards designed to protect personal information, including:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Encryption in transit.</li>
                  <li>Authentication and access controls.</li>
                  <li>Logging, monitoring, and abuse detection.</li>
                  <li>Backups, vendor management, and operational security practices.</li>
                  <li>Restricted internal access based on role and need.</li>
                </ul>
                <p>Even with these measures, no platform can guarantee absolute security.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">8. Data Retention</h2>
              <div className="space-y-4 text-foreground/90">
                <p>We retain information for as long as reasonably necessary to operate the service, comply with law, resolve disputes, and enforce our agreements.</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li><strong>Account and workspace data:</strong> generally retained while your account is active and for a reasonable period afterward unless deletion is required sooner by law.</li>
                  <li><strong>Billing and tax records:</strong> retained for the period required by applicable accounting and tax rules.</li>
                  <li><strong>Security and diagnostic logs:</strong> retained as needed for platform reliability, abuse prevention, and investigations.</li>
                  <li><strong>Public content:</strong> may remain visible until removed by you, by us, or as part of ordinary platform moderation.</li>
                </ul>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">9. International Transfers</h2>
              <div className="space-y-4 text-foreground/90">
                <p>We are based in the United Kingdom and may use service providers in other countries, including the United States and the European Economic Area.</p>
                <p>Where required, we rely on appropriate safeguards for international transfers, such as contractual protections and vendor commitments designed to meet applicable data protection standards.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">10. Your Rights</h2>
              <div className="space-y-4 text-foreground/90">
                <p>Depending on where you live, you may have rights such as the right to access, correct, delete, restrict, object to, or export certain personal information.</p>
                <p>You may also withdraw consent where processing depends on consent. Some rights are subject to legal exceptions.</p>
                <p>To make a request, contact <strong className="text-primary">admin@creatives-takeover.com</strong>.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">11. Children&apos;s Privacy</h2>
              <div className="space-y-4 text-foreground/90">
                <p>The platform is intended for adults and is not directed to children under 18.</p>
                <p>If you believe a child has provided personal information to us, contact us and we will review the matter and take appropriate action.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">12. Third-Party Services</h2>
              <div className="space-y-4 text-foreground/90">
                <p>Our services may integrate with or link to third-party tools and websites, including payment processors, scheduling tools, authentication providers, and external resources.</p>
                <p>Those third parties operate under their own terms and privacy notices. We are not responsible for their independent practices.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">13. Changes to This Privacy Policy</h2>
              <div className="space-y-4 text-foreground/90">
                <p>We may update this Privacy Policy from time to time to reflect changes to the platform, law, or our practices.</p>
                <p>When changes are material, we may notify you by email, in-product notice, or by updating the effective date above.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">14. Contact Information</h2>
              <div className="space-y-4 text-foreground/90">
                <p>If you have questions about this Privacy Policy or would like to exercise your privacy rights, contact us:</p>
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
                <strong className="text-primary">Privacy note:</strong> We built Creatives
                Takeover to help people build startups from scratch, and that requires trust. We
                aim to handle personal information responsibly, keep private workspace content
                private by default, and be clear about where data is used to deliver the service.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default PrivacyPolicy;
