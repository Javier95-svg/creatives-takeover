import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | Creatives Takeover</title>
        <meta name="description" content="Read the Creatives Takeover Privacy Policy to understand how we collect and use your data." />
        <link rel="canonical" href="/privacy-policy" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-6 py-24">
          <header className="mb-12">
            <h1 className="text-3xl md:text-5xl font-bold">Privacy Policy</h1>
            <p className="mt-4 text-muted-foreground max-w-3xl">
              Last updated: August 18, 2025
            </p>
            <p className="mt-2 text-muted-foreground max-w-3xl">
              This Privacy Policy describes how Creatives Takeover collects, uses, and protects your personal information when you use our services.
            </p>
          </header>

          <div className="prose prose-lg max-w-4xl mx-auto">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
              <div className="text-muted-foreground space-y-4">
                <h3 className="text-lg font-medium">1.1 Personal Information</h3>
                <p>We collect information you provide directly to us, such as:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Name, email address, and contact information</li>
                  <li>Account credentials and profile information</li>
                  <li>Business information and industry details</li>
                  <li>Payment and billing information</li>
                  <li>Communication preferences</li>
                </ul>

                <h3 className="text-lg font-medium mt-6">1.2 Usage Information</h3>
                <p>We automatically collect certain information when you use our Service:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Device information (IP address, browser type, operating system)</li>
                  <li>Usage patterns and feature interactions</li>
                  <li>Log files and analytics data</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>

                <h3 className="text-lg font-medium mt-6">1.3 Content and Communications</h3>
                <p>We collect content you create or share through our platform:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Business plans and strategies</li>
                  <li>Community posts and comments</li>
                  <li>Messages and support communications</li>
                  <li>Files and documents uploaded to our services</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
              <div className="text-muted-foreground space-y-4">
                <p>We use the information we collect to:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong>Provide and improve our services:</strong> Deliver requested features, personalize your experience, and enhance our platform</li>
                  <li><strong>Process transactions:</strong> Handle payments, billing, and account management</li>
                  <li><strong>Communicate with you:</strong> Send updates, notifications, and respond to inquiries</li>
                  <li><strong>Ensure security:</strong> Protect against fraud, unauthorized access, and security threats</li>
                  <li><strong>Analytics and research:</strong> Understand usage patterns and improve our services</li>
                  <li><strong>Legal compliance:</strong> Meet legal obligations and enforce our Terms of Service</li>
                  <li><strong>Marketing:</strong> Send promotional content (with your consent)</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Information Sharing and Disclosure</h2>
              <div className="text-muted-foreground space-y-4">
                <p>We do not sell, trade, or rent your personal information. We may share information in these circumstances:</p>
                
                <h3 className="text-lg font-medium">3.1 Service Providers</h3>
                <p>We share information with trusted third-party service providers who help us operate our platform, such as:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Cloud hosting and data storage providers</li>
                  <li>Payment processors and billing services</li>
                  <li>Analytics and monitoring tools</li>
                  <li>Customer support platforms</li>
                </ul>

                <h3 className="text-lg font-medium mt-6">3.2 Legal Requirements</h3>
                <p>We may disclose information when required by law or to:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Comply with legal processes or government requests</li>
                  <li>Protect our rights, property, or safety</li>
                  <li>Prevent fraud or security threats</li>
                  <li>Enforce our Terms of Service</li>
                </ul>

                <h3 className="text-lg font-medium mt-6">3.3 Business Transfers</h3>
                <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the business transaction.</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Cookies and Tracking Technologies</h2>
              <div className="text-muted-foreground space-y-4">
                <p>We use cookies and similar technologies to:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Remember your preferences and settings</li>
                  <li>Analyze website traffic and usage patterns</li>
                  <li>Provide personalized content and recommendations</li>
                  <li>Ensure security and prevent fraud</li>
                </ul>
                <p>You can control cookie preferences through your browser settings, though some features may not function properly if cookies are disabled.</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Data Security and Storage</h2>
              <div className="text-muted-foreground space-y-4">
                <p>We implement appropriate technical and organizational measures to protect your information:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong>Encryption:</strong> Data is encrypted in transit and at rest</li>
                  <li><strong>Access controls:</strong> Limited access to personal information on a need-to-know basis</li>
                  <li><strong>Security monitoring:</strong> Regular security assessments and monitoring</li>
                  <li><strong>Data backups:</strong> Regular backups to prevent data loss</li>
                </ul>
                <p>While we strive to protect your information, no method of transmission over the internet is 100% secure.</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Your Rights and Choices</h2>
              <div className="text-muted-foreground space-y-4">
                <p>You have the following rights regarding your personal information:</p>
                
                <h3 className="text-lg font-medium">6.1 Access and Portability</h3>
                <p>Request access to your personal information and receive a copy in a portable format.</p>

                <h3 className="text-lg font-medium">6.2 Correction and Updates</h3>
                <p>Update or correct inaccurate personal information through your account settings.</p>

                <h3 className="text-lg font-medium">6.3 Deletion</h3>
                <p>Request deletion of your personal information, subject to legal and contractual obligations.</p>

                <h3 className="text-lg font-medium">6.4 Communication Preferences</h3>
                <p>Opt out of marketing communications at any time through unsubscribe links or account settings.</p>

                <h3 className="text-lg font-medium">6.5 Data Processing Restrictions</h3>
                <p>Request restrictions on how we process your personal information in certain circumstances.</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. International Data Transfers</h2>
              <p className="text-muted-foreground mb-4">
                Your information may be transferred to and processed in countries other than your own. We ensure adequate 
                protection through appropriate safeguards, including standard contractual clauses approved by relevant authorities.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Data Retention</h2>
              <div className="text-muted-foreground space-y-4">
                <p>We retain your information for as long as necessary to:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Provide our services and maintain your account</li>
                  <li>Comply with legal obligations</li>
                  <li>Resolve disputes and enforce agreements</li>
                  <li>Improve our services and security</li>
                </ul>
                <p>When information is no longer needed, we securely delete or anonymize it.</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
              <p className="text-muted-foreground mb-4">
                Our services are not intended for children under 18 years of age. We do not knowingly collect personal 
                information from children. If you are a parent or guardian and believe your child has provided us with 
                personal information, please contact us to have it removed.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Third-Party Services</h2>
              <p className="text-muted-foreground mb-4">
                Our platform may contain links to third-party websites or integrate with third-party services. This Privacy 
                Policy does not apply to those third parties. We encourage you to review their privacy policies before 
                providing any personal information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground mb-4">
                We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements. 
                We will notify you of material changes through email or prominent notices on our platform. Your continued 
                use of our services after changes become effective constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">12. Contact Information</h2>
              <div className="text-muted-foreground space-y-4">
                <p>If you have questions about this Privacy Policy or wish to exercise your rights, contact us:</p>
                <ul className="list-none space-y-2">
                  <li><strong>Email:</strong> privacy@creatives-takeover.com</li>
                  <li><strong>Data Protection Officer:</strong> dpo@creatives-takeover.com</li>
                  <li><strong>Address:</strong> [Your Business Address]</li>
                  <li><strong>Website:</strong> https://creatives-takeover.com/contact</li>
                </ul>
              </div>
            </section>

            <div className="mt-12 p-6 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Disclaimer:</strong> This Privacy Policy document is provided as a template and should be reviewed 
                by qualified legal counsel and privacy professionals before implementation. Creatives Takeover recommends 
                consulting with legal experts to ensure compliance with applicable privacy laws and regulations such as 
                GDPR, CCPA, and other regional privacy requirements.
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
