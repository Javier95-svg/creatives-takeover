import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";

const DataPrivacy = () => {
  return (
    <>
      <Helmet>
        <title>Data Privacy Policy | Creatives Takeover</title>
        <meta
          name="description"
          content="A plain-language guide to how Creatives Takeover collects, uses, shares, retains, and protects founder data across BizMap AI, Insighta, and startup tools."
        />
        <link rel="canonical" href="/data-privacy" />
      </Helmet>
      <HomeWallpaper />
      <div className="relative min-h-screen">
        <Navigation />
        <main className="container mx-auto px-6 py-24">
          <header className="mb-16 text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Last updated: May 25, 2026
            </p>
            <h1 className="text-4xl md:text-6xl font-bold gradient-text creatives-font leading-tight pb-2 overflow-visible mb-6">
              Data Privacy Policy
            </h1>
            <p className="mx-auto max-w-3xl text-base md:text-lg text-foreground/80">
              Creatives Takeover handles founder and startup data carefully because trust affects
              whether people feel safe signing up, testing ideas, and sharing early-stage work. This
              page explains what we collect, why we use it, who helps us process it, and how you can
              ask us to access, correct, export, or delete your data.
            </p>
          </header>

          <div className="mx-auto max-w-4xl space-y-8">
            <section className="glass-card hover-lift">
              <h2 className="mb-6 text-2xl font-semibold gradient-text">What data we collect</h2>
              <div className="space-y-4 text-foreground/90">
                <p>
                  We collect the data needed to run a founder workspace, improve the product, keep
                  accounts secure, and support users when something goes wrong.
                </p>
                <ul className="list-disc list-inside space-y-3 pl-4">
                  <li>
                    <strong className="text-primary">Account information:</strong> name, email
                    address, username, password or authentication details, profile details,
                    subscription status, and plan history.
                  </li>
                  <li>
                    <strong className="text-primary">Founder and workspace inputs:</strong> startup
                    ideas, ICP drafts, validation notes, MVP scope, go-to-market plans, AI prompts,
                    saved outputs, uploaded files, fundraising prep, and other work you choose to
                    add to BizMap AI, Insighta, or related tools.
                  </li>
                  <li>
                    <strong className="text-primary">Usage and device data:</strong> pages visited,
                    features used, searches, clicks, credits, browser type, device details, IP
                    address, approximate location, logs, errors, and performance signals.
                  </li>
                  <li>
                    <strong className="text-primary">Cookies and similar technologies:</strong>
                    data that keeps you signed in, remembers preferences, protects sessions, and
                    helps us understand product usage.
                  </li>
                  <li>
                    <strong className="text-primary">Payments, support, and messages:</strong>
                    billing records, transaction status, support emails, feedback, quiz responses,
                    scheduling details, and other messages you send us.
                  </li>
                  <li>
                    <strong className="text-primary">Third-party integrations:</strong> information
                    from services you use to sign in, pay, schedule, submit forms, connect accounts,
                    or share public/community content.
                  </li>
                </ul>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="mb-6 text-2xl font-semibold gradient-text">How and why we use it</h2>
              <div className="space-y-4 text-foreground/90">
                <p>
                  We use data to provide the service you asked for and to make Creatives Takeover
                  more useful, reliable, and secure for founders.
                </p>
                <ul className="list-disc list-inside space-y-3 pl-4">
                  <li>To create accounts, keep users signed in, and manage profile settings.</li>
                  <li>
                    To power BizMap AI, Insighta, saved founder progress, startup guides, prompts,
                    workspace history, and related product features.
                  </li>
                  <li>To process subscriptions, credits, invoices, refunds, and payment support.</li>
                  <li>
                    To understand which features are useful, find bugs, improve onboarding, and make
                    product decisions with analytics.
                  </li>
                  <li>
                    To send account notices, security alerts, product updates, support replies, and
                    optional marketing when you have not opted out.
                  </li>
                  <li>
                    To detect abuse, prevent fraud, secure the platform, enforce our terms, and meet
                    legal obligations.
                  </li>
                </ul>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="mb-6 text-2xl font-semibold gradient-text">Who we share it with</h2>
              <div className="space-y-4 text-foreground/90">
                <p className="font-medium">
                  We do not sell your private startup work, founder notes, business ideas, or
                  workspace content.
                </p>
                <p>
                  We share data only when it is needed to operate the platform, when you choose to
                  make something public, or when we have a legal or safety reason to do so.
                </p>
                <ul className="list-disc list-inside space-y-3 pl-4">
                  <li>
                    <strong className="text-primary">Processors and service providers:</strong>
                    hosting, authentication, databases, payments, analytics, AI infrastructure,
                    email delivery, support, scheduling, forms, monitoring, and security tools.
                    These providers process data for service delivery and are expected to protect it.
                  </li>
                  <li>
                    <strong className="text-primary">Partners and community features:</strong>
                    profile fields, posts, messages, mentor interactions, public pages, or other
                    materials are shared only when you choose to use features that make them visible
                    to others.
                  </li>
                  <li>
                    <strong className="text-primary">Legal, safety, and business changes:</strong>
                    we may share information if required by law, to protect users or the platform,
                    to investigate abuse, or as part of a merger, acquisition, financing, or sale of
                    assets.
                  </li>
                </ul>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="mb-6 text-2xl font-semibold gradient-text">How long we keep data</h2>
              <div className="space-y-4 text-foreground/90">
                <p>
                  We keep data only as long as it is useful for the purposes described on this page
                  or as long as we need it for legal, accounting, security, or operational reasons.
                </p>
                <ul className="list-disc list-inside space-y-3 pl-4">
                  <li>Account and workspace data usually stays while your account is active.</li>
                  <li>
                    If you request deletion, we delete or anonymize eligible account and workspace
                    data within a reasonable period, subject to backups and legal requirements.
                  </li>
                  <li>
                    Billing, tax, fraud-prevention, and compliance records may be kept longer where
                    required by law or needed for legitimate business records.
                  </li>
                  <li>
                    Logs, diagnostics, and analytics data may be kept for shorter operational
                    periods, or longer in aggregated or anonymized form.
                  </li>
                  <li>
                    Public or community content may remain visible until removed by you, moderated by
                    us, or deleted through an account request where applicable.
                  </li>
                </ul>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="mb-6 text-2xl font-semibold gradient-text">Your rights and choices</h2>
              <div className="space-y-4 text-foreground/90">
                <p>
                  Depending on where you live, you may have privacy rights over your personal data.
                  Even when a law does not require every option, we try to handle requests in a
                  practical and respectful way.
                </p>
                <ul className="list-disc list-inside space-y-3 pl-4">
                  <li>Ask for a copy of the personal data we hold about you.</li>
                  <li>Ask us to correct data that is inaccurate or incomplete.</li>
                  <li>Ask us to delete eligible account or workspace data.</li>
                  <li>Ask for a portable export of data where technically feasible.</li>
                  <li>Withdraw consent or unsubscribe from marketing communications.</li>
                  <li>Object to or restrict certain processing where applicable law gives you that right.</li>
                </ul>
                <p>
                  To protect accounts, we may need to verify your identity before completing a
                  privacy request. Some data may need to be retained for legal, billing, security, or
                  fraud-prevention reasons.
                </p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="mb-6 text-2xl font-semibold gradient-text">Cookies and opt-out options</h2>
              <div className="space-y-4 text-foreground/90">
                <p>
                  Cookies help the platform work. Some are essential; others help us remember
                  preferences or understand how the product is used.
                </p>
                <ul className="list-disc list-inside space-y-3 pl-4">
                  <li>
                    <strong className="text-primary">Essential cookies:</strong> keep you signed in,
                    secure sessions, prevent fraud, and make core platform features work.
                  </li>
                  <li>
                    <strong className="text-primary">Preference cookies:</strong> remember settings
                    such as theme choices or product preferences.
                  </li>
                  <li>
                    <strong className="text-primary">Analytics cookies:</strong> help us see which
                    pages and features are useful, where users get stuck, and how to improve the
                    experience.
                  </li>
                </ul>
                <p>
                  You can control cookies through your browser settings, device privacy settings,
                  email unsubscribe links, and any consent tools we make available. Blocking
                  essential cookies may prevent sign-in or core features from working. You can also
                  contact us to ask about analytics opt-out options for your account.
                </p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="mb-6 text-2xl font-semibold gradient-text">How we protect data</h2>
              <div className="space-y-4 text-foreground/90">
                <p>
                  We use a mix of technical, organizational, and vendor controls to protect personal
                  and workspace data. No online service can guarantee perfect security, but we design
                  the platform with care.
                </p>
                <ul className="list-disc list-inside space-y-3 pl-4">
                  <li>Encrypted connections for data in transit.</li>
                  <li>Access controls, authentication safeguards, and least-privilege internal access.</li>
                  <li>Monitoring, logs, backups, and operational checks for reliability and security.</li>
                  <li>Vendor review and service-provider controls for tools that process data for us.</li>
                  <li>Internal handling practices that limit access to people who need it for support, security, or operations.</li>
                </ul>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="mb-6 text-2xl font-semibold gradient-text">Policy updates and versioning</h2>
              <div className="space-y-4 text-foreground/90">
                <p>
                  We update this page when our product, data practices, vendors, or legal obligations
                  change. The date at the top shows the latest version.
                </p>
                <p>
                  If a change is material, we will provide notice when appropriate, such as through
                  email, an in-product message, or another reasonable channel. Older versions are
                  available on request.
                </p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="mb-6 text-2xl font-semibold gradient-text">Contact us</h2>
              <div className="space-y-4 text-foreground/90">
                <p>
                  For privacy requests, use the subject line &quot;Data privacy request&quot; so we can
                  route your message quickly.
                </p>
                <ul className="list-disc list-inside space-y-3 pl-4">
                  <li>
                    Privacy inbox:{" "}
                    <a className="text-primary underline-offset-4 hover:underline" href="mailto:admin@creatives-takeover.com">
                      admin@creatives-takeover.com
                    </a>
                  </li>
                  <li>
                    Founder contact:{" "}
                    <a className="text-primary underline-offset-4 hover:underline" href="mailto:javier@creatives-takeover.com">
                      javier@creatives-takeover.com
                    </a>
                  </li>
                  <li>
                    Registered office: Creatives Takeover Ltd, Company No. 16741912, 71-75 Shelton
                    Street, Covent Garden, London WC2H 9JQ, United Kingdom.
                  </li>
                </ul>
              </div>
            </section>

            <div className="glass-card border-primary/20 bg-gradient-to-r from-primary/10 to-secondary/10">
              <p className="text-sm text-foreground/80">
                <strong className="text-primary">Plain-English promise:</strong> we use data to run
                the product, improve the founder experience, protect the platform, and support users.
                We do not sell private startup work.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default DataPrivacy;
