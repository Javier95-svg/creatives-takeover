import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";

const PrivacyPolicy = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | Creatives Takeover</title>
        <meta name="description" content="Read the Creatives Takeover Privacy Policy to understand how we collect, use, and protect your personal data in compliance with GDPR and data protection regulations." />
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
            <div className="glass-card max-w-3xl mx-auto">
              <p className="text-lg text-muted-foreground mb-2">
                Last updated: January 25, 2026
              </p>
              <p className="text-foreground/80">
                This Privacy Policy describes how Creatives Takeover Ltd ("we", "us", or "our") collects, uses, stores, and protects your personal information when you use our platform, services, and applications. We are committed to safeguarding your privacy and ensuring transparency in our data practices.
              </p>
            </div>
          </header>

          <div className="max-w-4xl mx-auto space-y-8">
            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">1. Information We Collect</h2>
              <div className="space-y-6 text-foreground/90">
                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">1.1 Personal Information You Provide</h3>
                  <p className="mb-4">When you create an account, subscribe to our services, or interact with our platform, we collect information you voluntarily provide, including:</p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li><strong>Identity Information:</strong> Full name, username, profile picture, and professional title</li>
                    <li><strong>Contact Information:</strong> Email address, phone number, and mailing address</li>
                    <li><strong>Account Credentials:</strong> Password (encrypted), security questions, and authentication tokens</li>
                    <li><strong>Business Information:</strong> Company name, industry sector, business stage, target market, and business goals</li>
                    <li><strong>Financial Information:</strong> Payment card details (processed securely via Stripe), billing address, and transaction history</li>
                    <li><strong>Communication Data:</strong> Messages sent through our platform, support tickets, and feedback submissions</li>
                    <li><strong>Social Media:</strong> LinkedIn profile URL, Twitter/X handle, and website URL (if provided)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">1.2 Information Collected Automatically</h3>
                  <p className="mb-4">When you access our platform, we automatically collect certain technical and usage information:</p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li><strong>Device Information:</strong> IP address, device type, operating system, browser type and version, screen resolution, and unique device identifiers</li>
                    <li><strong>Usage Analytics:</strong> Pages visited, features used, time spent on platform, click patterns, search queries, and navigation paths</li>
                    <li><strong>Session Data:</strong> Login timestamps, session duration, error logs, and performance metrics</li>
                    <li><strong>Location Data:</strong> Approximate geographic location based on IP address (country, region, city)</li>
                    <li><strong>Referral Information:</strong> How you found our platform (search engine, social media, referral link)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">1.3 Content and User-Generated Data</h3>
                  <p className="mb-4">We store content you create or share through our platform, which may include:</p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li><strong>Business Plans:</strong> Documents created using BizMap AI, including business strategies, market analysis, and financial projections</li>
                    <li><strong>Community Content:</strong> Posts, comments, stories, and discussions shared in the community section</li>
                    <li><strong>AI Conversations:</strong> Chat history with our AI assistants (BizMap AI, Insighta)</li>
                    <li><strong>Uploaded Files:</strong> Documents, images, pitch decks, and other files you upload for analysis or storage</li>
                    <li><strong>Assessment Data:</strong> Results from Insighta Test, PMF Lab analysis, and other diagnostic tools</li>
                    <li><strong>Saved Prompts:</strong> Custom prompts and templates saved in the Prompt Library</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">1.4 Information from Third Parties</h3>
                  <p className="mb-4">We may receive information about you from external sources:</p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li><strong>Authentication Providers:</strong> If you sign in via Google or other OAuth providers, we receive your basic profile information</li>
                    <li><strong>Payment Processors:</strong> Stripe provides transaction confirmations and fraud detection signals</li>
                    <li><strong>Analytics Partners:</strong> Aggregated insights from analytics services to understand platform performance</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">2. Legal Basis for Processing (GDPR)</h2>
              <div className="space-y-4 text-foreground/90">
                <p>Under the General Data Protection Regulation (GDPR), we process your personal data based on the following legal grounds:</p>
                <ul className="list-disc list-inside space-y-3 pl-4">
                  <li><strong className="text-primary">Contractual Necessity:</strong> Processing required to provide our services and fulfill our agreement with you (account management, service delivery, payment processing)</li>
                  <li><strong className="text-primary">Legitimate Interests:</strong> Processing necessary for our legitimate business interests, such as improving services, fraud prevention, and platform security, where these interests do not override your rights</li>
                  <li><strong className="text-primary">Consent:</strong> Processing based on your explicit consent for specific purposes, such as marketing communications, which you can withdraw at any time</li>
                  <li><strong className="text-primary">Legal Obligation:</strong> Processing required to comply with applicable laws, regulations, and legal requests</li>
                </ul>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">3. How We Use Your Information</h2>
              <div className="space-y-4 text-foreground/90">
                <p>We use the information we collect for the following purposes:</p>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-primary mb-2">3.1 Service Delivery and Personalization</h3>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>Create and manage your account</li>
                      <li>Provide AI-powered business planning tools and personalized recommendations</li>
                      <li>Enable community features and mentor connections</li>
                      <li>Customize your dashboard and content recommendations</li>
                      <li>Track your progress and credit usage</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-primary mb-2">3.2 Transaction Processing</h3>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>Process subscription payments and renewals</li>
                      <li>Manage billing, invoicing, and refunds</li>
                      <li>Handle credit purchases and consumption tracking</li>
                      <li>Send payment confirmations and receipts</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-primary mb-2">3.3 Communication</h3>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>Send essential service notifications (account updates, security alerts, feature changes)</li>
                      <li>Respond to your support inquiries and feedback</li>
                      <li>Deliver newsletters and product updates (with consent)</li>
                      <li>Facilitate mentor-user communications</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-primary mb-2">3.4 Security and Fraud Prevention</h3>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>Detect and prevent unauthorized access, fraud, and abuse</li>
                      <li>Monitor for suspicious activity and security threats</li>
                      <li>Verify user identity and enforce Terms of Service</li>
                      <li>Protect the integrity of our platform and users</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-primary mb-2">3.5 Analytics and Improvement</h3>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>Analyze usage patterns to improve features and user experience</li>
                      <li>Conduct research to develop new products and services</li>
                      <li>Test and optimize platform performance</li>
                      <li>Generate aggregated, anonymized insights</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">4. Information Sharing and Disclosure</h2>
              <div className="space-y-6 text-foreground/90">
                <p className="font-medium">We do not sell, trade, or rent your personal information to third parties for marketing purposes. We may share information only in the following circumstances:</p>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">4.1 Service Providers and Partners</h3>
                  <p className="mb-4">We engage trusted third-party service providers who process data on our behalf:</p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li><strong>Cloud Infrastructure:</strong> Supabase (database hosting, authentication), Vercel (application hosting)</li>
                    <li><strong>Payment Processing:</strong> Stripe (secure payment handling - they operate under their own privacy policy)</li>
                    <li><strong>AI Services:</strong> OpenAI, Anthropic (AI model providers for BizMap AI features)</li>
                    <li><strong>Analytics:</strong> Privacy-focused analytics to understand platform usage</li>
                    <li><strong>Email Delivery:</strong> Transactional email services for notifications</li>
                    <li><strong>Customer Support:</strong> Help desk tools for support ticket management</li>
                  </ul>
                  <p className="mt-4 text-sm text-muted-foreground">All service providers are bound by data processing agreements and are required to protect your information in accordance with applicable law.</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">4.2 Community and Public Features</h3>
                  <p className="mb-4">Certain information may be visible to other users based on your privacy settings:</p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Community posts, comments, and stories are visible to other community members</li>
                    <li>Your public profile information (name, profile picture, bio) may be visible to mentors and other users</li>
                    <li>Mentor profiles are publicly visible on the platform</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">4.3 Legal Requirements</h3>
                  <p className="mb-4">We may disclose information when required by law or to:</p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Comply with valid legal processes, court orders, or government requests</li>
                    <li>Protect the rights, property, or safety of Creatives Takeover, our users, or the public</li>
                    <li>Investigate potential violations of our Terms of Service</li>
                    <li>Detect and address fraud, security issues, or technical problems</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">4.4 Business Transfers</h3>
                  <p>In the event of a merger, acquisition, reorganization, bankruptcy, or sale of assets, your information may be transferred to the acquiring entity. We will notify you of any such change and provide options regarding your data.</p>
                </div>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">5. Cookies and Tracking Technologies</h2>
              <div className="space-y-4 text-foreground/90">
                <p>We use cookies and similar technologies to enhance your experience:</p>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-primary mb-2">5.1 Essential Cookies</h3>
                    <p>Required for basic platform functionality, including authentication, session management, and security. These cannot be disabled.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-primary mb-2">5.2 Functional Cookies</h3>
                    <p>Remember your preferences (theme, language, display settings) to provide a personalized experience.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-primary mb-2">5.3 Analytics Cookies</h3>
                    <p>Help us understand how users interact with our platform, which pages are popular, and where improvements are needed. Data is aggregated and anonymized.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-primary mb-2">5.4 Managing Cookie Preferences</h3>
                    <p>You can control cookies through your browser settings. Please note that disabling certain cookies may affect platform functionality. Most browsers allow you to:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4 mt-2">
                      <li>View and delete existing cookies</li>
                      <li>Block cookies from specific or all websites</li>
                      <li>Set preferences for first-party vs. third-party cookies</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">6. Data Security</h2>
              <div className="space-y-4 text-foreground/90">
                <p>We implement comprehensive security measures to protect your information:</p>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-primary mb-2">Technical Safeguards</h3>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>TLS/SSL encryption for all data in transit</li>
                      <li>AES-256 encryption for sensitive data at rest</li>
                      <li>Secure password hashing (bcrypt)</li>
                      <li>Regular security audits and penetration testing</li>
                      <li>Web Application Firewall (WAF) protection</li>
                      <li>DDoS mitigation services</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-primary mb-2">Organizational Measures</h3>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>Strict access controls (principle of least privilege)</li>
                      <li>Employee security awareness training</li>
                      <li>Incident response procedures</li>
                      <li>Regular security reviews and updates</li>
                      <li>Vendor security assessments</li>
                      <li>Data backup and disaster recovery plans</li>
                    </ul>
                  </div>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">While we implement robust security measures, no system is completely immune to threats. We encourage you to use strong, unique passwords and enable two-factor authentication when available.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">7. Your Rights and Choices</h2>
              <div className="space-y-6 text-foreground/90">
                <p>Depending on your location, you have certain rights regarding your personal information:</p>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-primary mb-3">7.1 Right of Access</h3>
                    <p>Request a copy of the personal information we hold about you, along with details about how we process it.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-primary mb-3">7.2 Right to Rectification</h3>
                    <p>Request correction of inaccurate or incomplete personal information. You can update most information directly in your account settings.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-primary mb-3">7.3 Right to Erasure</h3>
                    <p>Request deletion of your personal information in certain circumstances. Note that some data may be retained for legal or legitimate business purposes.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-primary mb-3">7.4 Right to Data Portability</h3>
                    <p>Receive your personal data in a structured, commonly used, machine-readable format and transfer it to another service.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-primary mb-3">7.5 Right to Restrict Processing</h3>
                    <p>Request that we limit how we use your data in certain circumstances, such as while we verify the accuracy of information.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-primary mb-3">7.6 Right to Object</h3>
                    <p>Object to processing of your data for direct marketing purposes or based on legitimate interests.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-primary mb-3">7.7 Right to Withdraw Consent</h3>
                    <p>Where processing is based on consent, you can withdraw it at any time without affecting the lawfulness of prior processing.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-primary mb-3">7.8 Right to Lodge a Complaint</h3>
                    <p>If you believe your rights have been violated, you have the right to lodge a complaint with your local data protection authority.</p>
                  </div>
                </div>

                <p className="mt-4">To exercise any of these rights, please contact us at <strong className="text-primary">admin@creatives-takeover.com</strong>. We will respond within 30 days (or as required by applicable law).</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">8. International Data Transfers</h2>
              <div className="space-y-4 text-foreground/90">
                <p>Creatives Takeover Ltd is registered in the United Kingdom. Your information may be transferred to and processed in countries outside your country of residence, including:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>United Kingdom (primary operations)</li>
                  <li>European Economic Area (EEA)</li>
                  <li>United States (certain service providers)</li>
                </ul>
                <p className="mt-4">When transferring data internationally, we ensure appropriate safeguards are in place:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li><strong>UK GDPR and EU GDPR compliance:</strong> We adhere to data protection requirements</li>
                  <li><strong>Standard Contractual Clauses:</strong> We use SCCs approved by the UK ICO and European Commission</li>
                  <li><strong>Data Processing Agreements:</strong> All vendors handling personal data are contractually bound to protect it</li>
                  <li><strong>Adequacy decisions:</strong> Where applicable, we rely on adequacy decisions recognizing equivalent data protection</li>
                </ul>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">9. Data Retention</h2>
              <div className="space-y-4 text-foreground/90">
                <p>We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy:</p>
                <ul className="list-disc list-inside space-y-3 pl-4">
                  <li><strong className="text-primary">Account Data:</strong> Retained while your account is active and for 2 years after account deletion (for legal and dispute resolution purposes)</li>
                  <li><strong className="text-primary">Transaction Records:</strong> Retained for 7 years as required by UK tax and accounting regulations</li>
                  <li><strong className="text-primary">Communication Records:</strong> Support tickets retained for 3 years; marketing consent records retained indefinitely for compliance</li>
                  <li><strong className="text-primary">Usage Logs:</strong> Retained for 12 months for security and analytics purposes</li>
                  <li><strong className="text-primary">AI Conversation History:</strong> Retained while your account is active; deleted upon account deletion</li>
                </ul>
                <p className="mt-4">When information is no longer needed, we securely delete or anonymize it. Anonymized, aggregated data may be retained indefinitely for research and analytics.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">10. Children's Privacy</h2>
              <div className="space-y-4 text-foreground/90">
                <p>Creatives Takeover is designed for business professionals and entrepreneurs. Our services are not intended for individuals under 18 years of age.</p>
                <p>We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at <strong className="text-primary">admin@creatives-takeover.com</strong>.</p>
                <p>Upon verification, we will promptly delete such information from our systems.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">11. Third-Party Links and Services</h2>
              <div className="space-y-4 text-foreground/90">
                <p>Our platform may contain links to third-party websites, services, or integrations, including:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Social media platforms (LinkedIn, Twitter/X)</li>
                  <li>Payment processors (Stripe)</li>
                  <li>Scheduling tools (Calendly)</li>
                  <li>External resources and partner websites</li>
                </ul>
                <p className="mt-4">These third parties have their own privacy policies, which we encourage you to review. We are not responsible for the privacy practices of external sites or services. Any information you provide to third parties is governed by their respective privacy policies.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">12. AI and Automated Decision-Making</h2>
              <div className="space-y-4 text-foreground/90">
                <p>Our platform uses artificial intelligence to enhance your experience:</p>
                <ul className="list-disc list-inside space-y-3 pl-4">
                  <li><strong className="text-primary">BizMap AI:</strong> Provides business planning guidance and recommendations based on your inputs</li>
                  <li><strong className="text-primary">Insighta Test:</strong> Analyzes your responses to provide fundraising readiness assessments</li>
                  <li><strong className="text-primary">PMF Lab:</strong> Evaluates product-market fit based on provided information</li>
                  <li><strong className="text-primary">Investor Matchmaker:</strong> Suggests potential investors based on your business profile</li>
                </ul>
                <p className="mt-4">These AI features provide suggestions and analysis to assist your decision-making. They do not make decisions that have legal or similarly significant effects on you. You always have the final say in how you use the information provided.</p>
                <p>If you have concerns about automated processing, you can contact us to request human review of any AI-generated recommendations.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">13. Changes to This Privacy Policy</h2>
              <div className="space-y-4 text-foreground/90">
                <p>We may update this Privacy Policy from time to time to reflect changes in our practices, technologies, legal requirements, or other factors.</p>
                <p>When we make changes:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li><strong>Minor changes:</strong> We will update the "Last updated" date at the top of this policy</li>
                  <li><strong>Material changes:</strong> We will notify you via email or a prominent notice on our platform before changes take effect</li>
                </ul>
                <p className="mt-4">We encourage you to review this policy periodically. Your continued use of our services after changes become effective constitutes acceptance of the updated policy.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">14. Contact Information</h2>
              <div className="space-y-4 text-foreground/90">
                <p>If you have questions about this Privacy Policy, wish to exercise your rights, or have concerns about how we handle your data, please contact us:</p>
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
                  <h3 className="text-lg font-medium text-primary">Registered Address</h3>
                  <p>
                    Creatives Takeover Ltd<br />
                    Company Number: 15827341<br />
                    71-75 Shelton Street<br />
                    Covent Garden<br />
                    London WC2H 9JQ<br />
                    United Kingdom
                  </p>
                </div>
                <p className="mt-6">We aim to respond to all inquiries within 30 days. If you are not satisfied with our response, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) in the UK or your local data protection authority.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">15. Supervisory Authority</h2>
              <div className="space-y-4 text-foreground/90">
                <p>For users in the United Kingdom, the supervisory authority for data protection matters is:</p>
                <div className="mt-4 space-y-2">
                  <p><strong>Information Commissioner's Office (ICO)</strong></p>
                  <p>Wycliffe House, Water Lane<br />Wilmslow, Cheshire SK9 5AF<br />United Kingdom</p>
                  <p><strong>Website:</strong> https://ico.org.uk</p>
                  <p><strong>Helpline:</strong> 0303 123 1113</p>
                </div>
              </div>
            </section>

            <div className="glass-card bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
              <p className="text-sm text-foreground/80">
                <strong className="text-primary">Commitment to Privacy:</strong> At Creatives Takeover, we believe in transparency and respect for your privacy. We are committed to protecting your personal information and maintaining your trust. This Privacy Policy reflects our dedication to handling your data responsibly and in compliance with applicable data protection laws, including the UK GDPR and EU GDPR.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}

export default PrivacyPolicy;
