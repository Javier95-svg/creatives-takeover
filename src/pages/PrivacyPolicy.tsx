import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedBackground from "@/components/AnimatedBackground";

const PrivacyPolicy = () => {
  return (
    <>
      <Helmet>
        <title>Creatives Takeover</title>
        <meta name="description" content="Read the Creatives Takeover Privacy Policy to understand how we collect and use your data." />
        <link rel="canonical" href="/privacy-policy" />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/95" />
        <AnimatedBackground />
        <div className="relative z-10">
          <Navigation />
          <main className="container mx-auto px-6 py-12">
            <header className="mb-16 text-center">
              <h1 className="text-hero font-bold gradient-text creatives-font mb-6">
                Privacy Policy
              </h1>
              <div className="glass-card max-w-3xl mx-auto">
                <p className="text-lg text-muted-foreground mb-2">
                  Last updated: August 18, 2025
                </p>
                <p className="text-foreground/80">
                  This Privacy Policy describes how Creatives Takeover collects, uses, and protects your personal information when you use our services.
                </p>
              </div>
            </header>

            <div className="max-w-4xl mx-auto space-y-8">
              <section className="glass-card hover-lift">
                <h2 className="text-section font-semibold gradient-text mb-6">1. Information We Collect</h2>
                <div className="space-y-6 text-foreground/90">
                  <div>
                    <h3 className="text-subheading font-medium text-primary mb-3">1.1 Personal Information</h3>
                    <p className="mb-4">We collect information you provide directly to us, such as:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>Name, email address, and contact information</li>
                      <li>Account credentials and profile information</li>
                      <li>Business information and industry details</li>
                      <li>Payment and billing information</li>
                      <li>Communication preferences</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-subheading font-medium text-primary mb-3">1.2 Usage Information</h3>
                    <p className="mb-4">We automatically collect certain information when you use our Service:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>Device information (IP address, browser type, operating system)</li>
                      <li>Usage patterns and feature interactions</li>
                      <li>Log files and analytics data</li>
                      <li>Cookies and similar tracking technologies</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-subheading font-medium text-primary mb-3">1.3 Content and Communications</h3>
                    <p className="mb-4">We collect content you create or share through our platform:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>Business plans and strategies</li>
                      <li>Community posts and comments</li>
                      <li>Messages and support communications</li>
                      <li>Files and documents uploaded to our services</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-section font-semibold gradient-text mb-6">2. How We Use Your Information</h2>
                <div className="space-y-4 text-foreground/90">
                  <p>We use the information we collect to:</p>
                  <ul className="list-disc list-inside space-y-3 pl-4">
                    <li><strong className="text-primary">Provide and improve our services:</strong> Deliver requested features, personalize your experience, and enhance our platform</li>
                    <li><strong className="text-primary">Process transactions:</strong> Handle payments, billing, and account management</li>
                    <li><strong className="text-primary">Communicate with you:</strong> Send updates, notifications, and respond to inquiries</li>
                    <li><strong className="text-primary">Ensure security:</strong> Protect against fraud, unauthorized access, and security threats</li>
                    <li><strong className="text-primary">Analytics and research:</strong> Understand usage patterns and improve our services</li>
                    <li><strong className="text-primary">Legal compliance:</strong> Meet legal obligations and enforce our Terms of Service</li>
                    <li><strong className="text-primary">Marketing:</strong> Send promotional content (with your consent)</li>
                  </ul>
                </div>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-section font-semibold gradient-text mb-6">3. Information Sharing and Disclosure</h2>
                <div className="space-y-6 text-foreground/90">
                  <p>We do not sell, trade, or rent your personal information. We may share information in these circumstances:</p>
                  
                  <div>
                    <h3 className="text-subheading font-medium text-primary mb-3">3.1 Service Providers</h3>
                    <p className="mb-4">We share information with trusted third-party service providers who help us operate our platform, such as:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>Cloud hosting and data storage providers</li>
                      <li>Payment processors and billing services</li>
                      <li>Analytics and monitoring tools</li>
                      <li>Customer support platforms</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-subheading font-medium text-primary mb-3">3.2 Legal Requirements</h3>
                    <p className="mb-4">We may disclose information when required by law or to:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>Comply with legal processes or government requests</li>
                      <li>Protect our rights, property, or safety</li>
                      <li>Prevent fraud or security threats</li>
                      <li>Enforce our Terms of Service</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-subheading font-medium text-primary mb-3">3.3 Business Transfers</h3>
                    <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the business transaction.</p>
                  </div>
                </div>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-section font-semibold gradient-text mb-6">4. Cookies and Tracking Technologies</h2>
                <div className="space-y-4 text-foreground/90">
                  <p>We use cookies and similar technologies to:</p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Remember your preferences and settings</li>
                    <li>Analyze website traffic and usage patterns</li>
                    <li>Provide personalized content and recommendations</li>
                    <li>Ensure security and prevent fraud</li>
                  </ul>
                  <p className="mt-4">You can control cookie preferences through your browser settings, though some features may not function properly if cookies are disabled.</p>
                </div>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-section font-semibold gradient-text mb-6">5. Data Security and Storage</h2>
                <div className="space-y-4 text-foreground/90">
                  <p>We implement appropriate technical and organizational measures to protect your information:</p>
                  <ul className="list-disc list-inside space-y-3 pl-4">
                    <li><strong className="text-primary">Encryption:</strong> Data is encrypted in transit and at rest</li>
                    <li><strong className="text-primary">Access controls:</strong> Limited access to personal information on a need-to-know basis</li>
                    <li><strong className="text-primary">Security monitoring:</strong> Regular security assessments and monitoring</li>
                    <li><strong className="text-primary">Data backups:</strong> Regular backups to prevent data loss</li>
                  </ul>
                  <p className="mt-4">While we strive to protect your information, no method of transmission over the internet is 100% secure.</p>
                </div>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-section font-semibold gradient-text mb-6">6. Your Rights and Choices</h2>
                <div className="space-y-6 text-foreground/90">
                  <p>You have the following rights regarding your personal information:</p>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-subheading font-medium text-primary mb-3">6.1 Access and Portability</h3>
                      <p>Request access to your personal information and receive a copy in a portable format.</p>
                    </div>

                    <div>
                      <h3 className="text-subheading font-medium text-primary mb-3">6.2 Correction and Updates</h3>
                      <p>Update or correct inaccurate personal information through your account settings.</p>
                    </div>

                    <div>
                      <h3 className="text-subheading font-medium text-primary mb-3">6.3 Deletion</h3>
                      <p>Request deletion of your personal information, subject to legal and contractual obligations.</p>
                    </div>

                    <div>
                      <h3 className="text-subheading font-medium text-primary mb-3">6.4 Communication Preferences</h3>
                      <p>Opt out of marketing communications at any time through unsubscribe links or account settings.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-section font-semibold gradient-text mb-6">7. International Data Transfers</h2>
                <p className="text-foreground/90">
                  Your information may be transferred to and processed in countries other than your own. We ensure adequate 
                  protection through appropriate safeguards, including standard contractual clauses approved by relevant authorities.
                </p>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-section font-semibold gradient-text mb-6">8. Data Retention</h2>
                <div className="space-y-4 text-foreground/90">
                  <p>We retain your information for as long as necessary to:</p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Provide our services and maintain your account</li>
                    <li>Comply with legal obligations</li>
                    <li>Resolve disputes and enforce agreements</li>
                    <li>Improve our services and security</li>
                  </ul>
                  <p className="mt-4">When information is no longer needed, we securely delete or anonymize it.</p>
                </div>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-section font-semibold gradient-text mb-6">9. Children's Privacy</h2>
                <p className="text-foreground/90">
                  Our services are not intended for children under 18 years of age. We do not knowingly collect personal 
                  information from children. If you are a parent or guardian and believe your child has provided us with 
                  personal information, please contact us to have it removed.
                </p>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-section font-semibold gradient-text mb-6">10. Third-Party Services</h2>
                <p className="text-foreground/90">
                  Our platform may contain links to third-party websites or integrate with third-party services. This Privacy 
                  Policy does not apply to those third parties. We encourage you to review their privacy policies before 
                  providing any personal information.
                </p>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-section font-semibold gradient-text mb-6">11. Changes to This Privacy Policy</h2>
                <p className="text-foreground/90">
                  We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements. 
                  We will notify you of material changes through email or prominent notices on our platform. Your continued 
                  use of our services after changes become effective constitutes acceptance of the updated policy.
                </p>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-section font-semibold gradient-text mb-6">12. Contact Information</h2>
                <div className="space-y-4 text-foreground/90">
                  <p>If you have questions about this Privacy Policy or wish to exercise your rights, contact us:</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p><strong className="text-primary">Email:</strong> privacy@creatives-takeover.com</p>
                      <p><strong className="text-primary">Data Protection Officer:</strong> dpo@creatives-takeover.com</p>
                    </div>
                    <div className="space-y-2">
                      <p><strong className="text-primary">Address:</strong> [Your Business Address]</p>
                      <p><strong className="text-primary">Website:</strong> https://creatives-takeover.com/contact</p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="glass-card bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
                <p className="text-sm text-foreground/80">
                  <strong className="text-primary">Disclaimer:</strong> This Privacy Policy document is provided as a template and should be reviewed 
                  by qualified legal counsel and privacy professionals before implementation. Creatives Takeover recommends 
                  consulting with legal experts to ensure compliance with applicable privacy laws and regulations such as 
                  GDPR, CCPA, and other regional privacy requirements.
                </p>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </>
  )
}

export default PrivacyPolicy;
