import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";

const Terms = () => {
  return (
    <>
      <Helmet>
        <title>Terms of Service | Creatives Takeover</title>
        <meta name="description" content="Review the Creatives Takeover Terms of Service governing your use of our business planning platform, AI tools, and community features." />
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
            <div className="glass-card max-w-3xl mx-auto">
              <p className="text-lg text-muted-foreground mb-2">
                Last updated: January 25, 2026
              </p>
              <p className="text-foreground/80">
                These Terms of Service ("Terms") constitute a legally binding agreement between you and Creatives Takeover Ltd ("Company", "we", "us", or "our") governing your access to and use of the Creatives Takeover platform, including all associated services, features, and applications.
              </p>
            </div>
          </header>

          <div className="max-w-4xl mx-auto space-y-8">
            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">1. Acceptance of Terms</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">1.1.</span> By accessing, browsing, or using the Creatives Takeover platform ("the Service"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service, our Privacy Policy, and any additional guidelines or rules posted on the Service.</p>
                <p><span className="text-primary font-medium">1.2.</span> If you do not agree to these Terms, you must immediately cease using the Service. Your continued use of the Service constitutes ongoing acceptance of these Terms as they may be amended from time to time.</p>
                <p><span className="text-primary font-medium">1.3.</span> If you are using the Service on behalf of a company, organization, or other legal entity, you represent and warrant that you have the authority to bind such entity to these Terms, in which case "you" or "your" shall refer to such entity.</p>
                <p><span className="text-primary font-medium">1.4.</span> We reserve the right to modify these Terms at any time. Material changes will be communicated via email or prominent notice on the platform. Your continued use after such changes constitutes acceptance of the modified Terms.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">2. Description of Service</h2>
              <div className="text-foreground/90 space-y-4">
                <p>Creatives Takeover is a comprehensive business planning and entrepreneurship platform that provides:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li><strong className="text-primary">BizMap AI:</strong> AI-powered business planning assistant offering conversational guidance, business strategy development, and actionable insights</li>
                  <li><strong className="text-primary">Insighta Suite:</strong> Comprehensive assessment tools including the Insighta Test (fundraising readiness assessment), Investor Matchmaker, and Pitch Deck Analyzer</li>
                  <li><strong className="text-primary">Product-Market Fit Lab:</strong> Tools for analyzing and validating product-market fit</li>
                  <li><strong className="text-primary">Tech Stack Generator:</strong> AI-powered recommendations for technology solutions</li>
                  <li><strong className="text-primary">Community Features:</strong> Networking, discussions, stories, and knowledge sharing with other entrepreneurs</li>
                  <li><strong className="text-primary">Mentor Marketplace:</strong> Access to experienced mentors and advisors for guidance and coaching</li>
                  <li><strong className="text-primary">Prompt Library:</strong> Curated collection of AI prompts for various business tasks</li>
                  <li><strong className="text-primary">Focus Funnel:</strong> Task management and productivity tools for founders</li>
                  <li><strong className="text-primary">Stories:</strong> Educational content and founder success stories</li>
                </ul>
                <p className="mt-4"><span className="text-primary font-medium">2.1.</span> The Service is provided on an "as is" and "as available" basis. We may modify, suspend, or discontinue any aspect of the Service at any time without notice.</p>
                <p><span className="text-primary font-medium">2.2.</span> Certain features may require a paid subscription or credit purchase. Feature availability may vary by subscription tier.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">3. User Accounts and Registration</h2>
              <div className="text-foreground/90 space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">3.1 Account Creation</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>You must provide accurate, current, and complete information during registration</li>
                    <li>You agree to update your information to keep it accurate and current</li>
                    <li>You may not use false or misleading information or impersonate another person</li>
                    <li>You may create only one account unless expressly permitted by us</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">3.2 Account Security</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>You are solely responsible for maintaining the confidentiality of your account credentials</li>
                    <li>You must immediately notify us of any unauthorized access or security breach</li>
                    <li>You are liable for all activities that occur under your account</li>
                    <li>We recommend using strong, unique passwords and enabling two-factor authentication</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">3.3 Eligibility</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>You must be at least 18 years old to create an account and use the Service</li>
                    <li>You must have the legal capacity to enter into binding agreements</li>
                    <li>The Service is not available to users previously suspended or removed by us</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">4. User Conduct and Acceptable Use</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">4.1.</span> You agree to use the Service only for lawful purposes and in accordance with these Terms. You shall not:</p>

                <div className="grid md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <h3 className="text-lg font-medium text-primary mb-3">Prohibited Activities</h3>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>Violate any applicable laws, regulations, or third-party rights</li>
                      <li>Engage in fraud, deception, or misrepresentation</li>
                      <li>Harass, threaten, abuse, or harm other users</li>
                      <li>Post hate speech, discriminatory, or offensive content</li>
                      <li>Distribute spam, malware, or unsolicited communications</li>
                      <li>Attempt to gain unauthorized access to the Service or other systems</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-primary mb-3">Technical Restrictions</h3>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
                      <li>Scrape, crawl, or use automated tools to access the Service</li>
                      <li>Interfere with or disrupt the Service or servers</li>
                      <li>Circumvent security measures or access restrictions</li>
                      <li>Use the Service for competitive intelligence without authorization</li>
                      <li>Resell or redistribute access to the Service</li>
                    </ul>
                  </div>
                </div>

                <p className="mt-4"><span className="text-primary font-medium">4.2.</span> We reserve the right to investigate and take appropriate action against any violations, including warning, suspension, or termination of accounts, and reporting to law enforcement authorities.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">5. User Content and Intellectual Property</h2>
              <div className="text-foreground/90 space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">5.1 Your Content</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>You retain full ownership of all content you create, upload, or share on the platform ("User Content")</li>
                    <li>This includes business plans, strategies, documents, posts, comments, and any other materials you contribute</li>
                    <li>You are solely responsible for your User Content and any consequences of posting it</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">5.2 License Grant</h3>
                  <p className="mb-2">By submitting User Content, you grant Creatives Takeover a worldwide, non-exclusive, royalty-free license to:</p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Host, store, and backup your content for service delivery</li>
                    <li>Display and distribute content you choose to make public (e.g., community posts)</li>
                    <li>Use anonymized, aggregated data for analytics and service improvement</li>
                    <li>Process content through AI systems to provide features (with confidentiality)</li>
                  </ul>
                  <p className="mt-2 text-sm text-muted-foreground">This license terminates when you delete your content or account, except for content shared publicly or where retention is required for legal purposes.</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">5.3 Our Intellectual Property</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>The Service, including its design, features, code, and content, is owned by Creatives Takeover and protected by intellectual property laws</li>
                    <li>The Creatives Takeover name, logo, and branding are our trademarks</li>
                    <li>You may not use our intellectual property without written permission</li>
                    <li>AI-generated content and recommendations are provided for your use but remain based on our proprietary systems</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">5.4 Content Guidelines</h3>
                  <p className="mb-2">User Content must not:</p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Infringe any third-party intellectual property rights</li>
                    <li>Contain confidential information you do not have rights to share</li>
                    <li>Include illegal, harmful, defamatory, or misleading material</li>
                    <li>Violate any person's privacy or publicity rights</li>
                    <li>Contain viruses, malware, or other harmful code</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">6. Subscription and Payment Terms</h2>
              <div className="text-foreground/90 space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">6.1 Subscription Plans</h3>
                  <p className="mb-2">We offer three subscription tiers designed to support founders at different stages:</p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li><strong>Rookie (Free):</strong> 25 credits per month, BizMap AI access, PMF Lab (read-only), Prompt Library (view only), VC Search (5 views/month), limited community access, and basic Insighta Test</li>
                    <li><strong>Rising (Creator):</strong> $32.99/month or $300/year - 50 credits per month, full BizMap AI, PMF Lab full access, Pitch Deck Analyzer, AI Email Templates, VC Search (25 views/month), full community access, and priority support</li>
                    <li><strong>Pro (Professional):</strong> $74.99/month or $750/year - 150 credits per month, unlimited BizMap AI, unlimited VC searches, advanced Pitch Deck Analyzer, custom email templates, featured community profile, 24h priority support, and early access to new features</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">6.2 Billing and Payment</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Subscriptions are billed in advance on a monthly or annual basis</li>
                    <li>Payment is processed securely through Stripe</li>
                    <li>You authorize us to charge your payment method for all fees incurred</li>
                    <li>Prices are displayed in USD ($) and may be subject to applicable taxes based on your location</li>
                    <li>Annual subscriptions offer savings of up to 24% compared to monthly billing</li>
                    <li>You are responsible for providing accurate and up-to-date payment information</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">6.3 Credits System</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Certain features consume credits based on usage</li>
                    <li>Monthly credit allocations reset on your billing date</li>
                    <li>Unused credits do not roll over to the next billing period</li>
                    <li>Additional credits may be available for purchase</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">6.4 Cancellation and Refunds</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>You may cancel your subscription at any time through your account settings</li>
                    <li>Cancellation takes effect at the end of the current billing period</li>
                    <li>No refunds are provided for partial billing periods unless required by law</li>
                    <li>Refund requests may be considered on a case-by-case basis within 14 days of purchase</li>
                    <li>We reserve the right to terminate subscriptions for violations of these Terms</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">6.5 Price Changes</h3>
                  <p>We reserve the right to modify pricing at any time. Existing subscribers will receive at least 30 days' notice before any price increase takes effect on their next billing cycle.</p>
                </div>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">7. AI Services and Disclaimers</h2>
              <div className="text-foreground/90 space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">7.1 Nature of AI Assistance</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Our AI features (BizMap AI, Insighta Test, PMF Lab, etc.) provide guidance, suggestions, and analysis based on the information you provide</li>
                    <li>AI outputs are generated by machine learning models and may contain errors or inaccuracies</li>
                    <li>AI recommendations should be used as one input among many in your decision-making process</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">7.2 Not Professional Advice</h3>
                  <p className="mb-2">The Service does not provide and should not be considered as:</p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Legal, financial, investment, or tax advice</li>
                    <li>Professional business consulting or accounting services</li>
                    <li>Guarantees of business success or fundraising outcomes</li>
                    <li>Verified or authenticated information about third parties (investors, companies)</li>
                  </ul>
                  <p className="mt-2">Always consult qualified professionals for important business, legal, and financial decisions.</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">7.3 Confidentiality of AI Inputs</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Information you share with AI features is processed to provide the service</li>
                    <li>We implement security measures to protect your data</li>
                    <li>Aggregated, anonymized data may be used to improve AI models</li>
                    <li>Review our Privacy Policy for detailed information on data handling</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">8. Community and Mentor Services</h2>
              <div className="text-foreground/90 space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">8.1 Community Guidelines</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Treat all community members with respect and professionalism</li>
                    <li>Share knowledge and support fellow entrepreneurs constructively</li>
                    <li>Do not promote unrelated products, services, or spam</li>
                    <li>Report inappropriate content or behavior to our moderation team</li>
                    <li>We reserve the right to remove content and users who violate guidelines</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">8.2 Mentor Services</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Mentors are independent contractors, not employees of Creatives Takeover</li>
                    <li>We facilitate connections but are not responsible for mentor advice or conduct</li>
                    <li>Discovery calls and coaching arrangements are between you and the mentor</li>
                    <li>Mentor availability, scheduling, and pricing are determined by individual mentors</li>
                    <li>We encourage you to verify mentor credentials independently</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">9. Privacy and Data Protection</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">9.1.</span> Your privacy is important to us. Our collection, use, and protection of your personal information is governed by our Privacy Policy, which is incorporated by reference into these Terms.</p>
                <p><span className="text-primary font-medium">9.2.</span> By using the Service, you consent to the collection and use of your information as described in the Privacy Policy.</p>
                <p><span className="text-primary font-medium">9.3.</span> We comply with applicable data protection laws, including the UK GDPR and EU GDPR, and provide you with rights regarding your personal data.</p>
                <p><span className="text-primary font-medium">9.4.</span> You are responsible for maintaining the confidentiality of any sensitive business information you share on the platform.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">10. Third-Party Services and Links</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">10.1.</span> The Service may integrate with or link to third-party services, including:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Payment processors (Stripe)</li>
                  <li>Authentication providers (Google OAuth)</li>
                  <li>Scheduling tools (Calendly)</li>
                  <li>Social media platforms</li>
                  <li>External websites and resources</li>
                </ul>
                <p className="mt-4"><span className="text-primary font-medium">10.2.</span> These third-party services are governed by their own terms and privacy policies. We are not responsible for their content, practices, or availability.</p>
                <p><span className="text-primary font-medium">10.3.</span> Your interactions with third parties, including payments for mentor services, are solely between you and that third party.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">11. Service Availability and Modifications</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">11.1.</span> We strive to maintain high availability of the Service but cannot guarantee uninterrupted access. The Service may be temporarily unavailable due to:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Scheduled maintenance and updates</li>
                  <li>Technical issues or emergencies</li>
                  <li>Factors beyond our reasonable control</li>
                </ul>
                <p className="mt-4"><span className="text-primary font-medium">11.2.</span> We reserve the right to modify, update, or discontinue any aspect of the Service at any time. We will provide reasonable notice for material changes where practicable.</p>
                <p><span className="text-primary font-medium">11.3.</span> We may introduce, modify, or remove features without prior notice. Continued use of the Service constitutes acceptance of such changes.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">12. Disclaimer of Warranties</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">12.1.</span> THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>WARRANTIES OF MERCHANTABILITY</li>
                  <li>FITNESS FOR A PARTICULAR PURPOSE</li>
                  <li>NON-INFRINGEMENT</li>
                  <li>ACCURACY, RELIABILITY, OR COMPLETENESS OF CONTENT</li>
                </ul>
                <p className="mt-4"><span className="text-primary font-medium">12.2.</span> We do not warrant that:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>The Service will meet your specific requirements or expectations</li>
                  <li>The Service will be uninterrupted, timely, secure, or error-free</li>
                  <li>Results obtained from the Service will be accurate or reliable</li>
                  <li>Any errors in the Service will be corrected</li>
                  <li>AI-generated content will be free from errors or inaccuracies</li>
                </ul>
                <p className="mt-4"><span className="text-primary font-medium">12.3.</span> Business advice, strategies, and assessments provided through the Service do not guarantee business success, funding, or any particular outcome.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">13. Limitation of Liability</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">13.1.</span> TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, CREATIVES TAKEOVER AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND AFFILIATES SHALL NOT BE LIABLE FOR:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                  <li>Loss of profits, revenue, data, or business opportunities</li>
                  <li>Business interruption or damage to reputation</li>
                  <li>Cost of procurement of substitute services</li>
                </ul>
                <p className="mt-4"><span className="text-primary font-medium">13.2.</span> OUR TOTAL AGGREGATE LIABILITY FOR ANY CLAIMS ARISING FROM OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>The amount paid by you for the Service in the 12 months preceding the claim, or</li>
                  <li>One hundred pounds sterling (£100)</li>
                </ul>
                <p className="mt-4"><span className="text-primary font-medium">13.3.</span> These limitations apply regardless of the legal theory upon which the claim is based, whether in contract, tort, negligence, strict liability, or otherwise.</p>
                <p><span className="text-primary font-medium">13.4.</span> Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability, so some of the above limitations may not apply to you.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">14. Indemnification</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">14.1.</span> You agree to indemnify, defend, and hold harmless Creatives Takeover and its officers, directors, employees, agents, and affiliates from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising from:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Your use of the Service or violation of these Terms</li>
                  <li>Your User Content or business activities</li>
                  <li>Your violation of any third-party rights</li>
                  <li>Your violation of applicable laws or regulations</li>
                  <li>Any dispute between you and another user or third party</li>
                </ul>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">15. Termination</h2>
              <div className="text-foreground/90 space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">15.1 Termination by You</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>You may terminate your account at any time through your account settings or by contacting us</li>
                    <li>You may export your data before termination where such functionality is available</li>
                    <li>Termination does not entitle you to refunds for prepaid services</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">15.2 Termination by Us</h3>
                  <p className="mb-2">We may suspend or terminate your access immediately, without prior notice, if:</p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>You breach any provision of these Terms</li>
                    <li>You engage in fraudulent, illegal, or harmful activity</li>
                    <li>Your account remains inactive for an extended period</li>
                    <li>We are required to do so by law</li>
                    <li>We discontinue the Service</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">15.3 Effect of Termination</h3>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Your right to access and use the Service ceases immediately</li>
                    <li>We may delete your account data in accordance with our Privacy Policy</li>
                    <li>Sections that by their nature should survive termination will remain in effect</li>
                    <li>Outstanding payment obligations remain due</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">16. Governing Law and Dispute Resolution</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">16.1.</span> These Terms shall be governed by and construed in accordance with the laws of England and Wales, without regard to its conflict of law provisions.</p>
                <p><span className="text-primary font-medium">16.2.</span> Any disputes arising from or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
                <p><span className="text-primary font-medium">16.3.</span> Before initiating legal proceedings, you agree to attempt to resolve disputes through good-faith negotiation by contacting us at admin@creatives-takeover.com.</p>
                <p><span className="text-primary font-medium">16.4.</span> If you are a consumer in the European Union, you may be entitled to use the European Commission's Online Dispute Resolution platform (https://ec.europa.eu/odr).</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">17. General Provisions</h2>
              <div className="text-foreground/90 space-y-4">
                <p><span className="text-primary font-medium">17.1 Entire Agreement:</span> These Terms, together with the Privacy Policy and any other referenced policies, constitute the entire agreement between you and Creatives Takeover regarding the Service.</p>
                <p><span className="text-primary font-medium">17.2 Severability:</span> If any provision of these Terms is found to be unenforceable, the remaining provisions shall continue in full force and effect.</p>
                <p><span className="text-primary font-medium">17.3 Waiver:</span> Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.</p>
                <p><span className="text-primary font-medium">17.4 Assignment:</span> You may not assign or transfer these Terms without our prior written consent. We may assign our rights and obligations without restriction.</p>
                <p><span className="text-primary font-medium">17.5 Force Majeure:</span> We shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control.</p>
                <p><span className="text-primary font-medium">17.6 Headings:</span> Section headings are for convenience only and shall not affect the interpretation of these Terms.</p>
              </div>
            </section>

            <section className="glass-card hover-lift">
              <h2 className="text-2xl font-semibold gradient-text mb-6">18. Contact Information</h2>
              <div className="space-y-4 text-foreground/90">
                <p>If you have any questions about these Terms of Service, please contact us:</p>
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
              </div>
            </section>

            <div className="glass-card bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
              <p className="text-sm text-foreground/80">
                <strong className="text-primary">Acknowledgment:</strong> By creating an account or using the Creatives Takeover platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree to these Terms, please do not use our Service. We encourage you to review these Terms periodically for any updates.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}

export default Terms;
