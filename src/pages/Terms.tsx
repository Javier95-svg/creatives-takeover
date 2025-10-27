import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedBackground from "@/components/AnimatedBackground";

const Terms = () => {
  return (
    <>
      <Helmet>
        <title>Creatives Takeover</title>
        <meta name="description" content="Review the Creatives Takeover Terms of Service governing your use of the platform." />
        <link rel="canonical" href="/terms" />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/95" />
        <AnimatedBackground />
        <div className="relative z-10">
          <Navigation />
          <main className="container mx-auto px-6 py-24">
            <header className="mb-16 text-center">
              <h1 className="text-4xl md:text-6xl font-bold gradient-text creatives-font mb-6">
                Terms of Service
              </h1>
              <div className="glass-card max-w-3xl mx-auto">
                <p className="text-lg text-muted-foreground mb-2">
                  Last updated: August 18, 2025
                </p>
                <p className="text-foreground/80">
                  These Terms of Service ("Terms") govern your use of the Creatives Takeover platform and services.
                </p>
              </div>
            </header>

            <div className="max-w-4xl mx-auto space-y-8">
              <section className="glass-card hover-lift">
                <h2 className="text-2xl font-semibold gradient-text mb-6">1. Acceptance of Terms</h2>
                <p className="text-foreground/90">
                  By accessing or using Creatives Takeover ("the Service"), you agree to be bound by these Terms of Service. 
                  If you do not agree to these terms, please do not use our Service.
                </p>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-2xl font-semibold gradient-text mb-6">2. Description of Service</h2>
                <p className="text-foreground/90">
                  Creatives Takeover provides business planning tools, AI-powered business mapping, community forums, 
                  educational resources, and software solutions designed to help entrepreneurs and creative professionals 
                  develop and grow their businesses.
                </p>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-2xl font-semibold gradient-text mb-6">3. User Accounts and Registration</h2>
                <div className="text-foreground/90 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <p><span className="text-primary font-medium">3.1.</span> You must provide accurate and complete information when creating an account.</p>
                      <p><span className="text-primary font-medium">3.2.</span> You are responsible for maintaining the confidentiality of your account credentials.</p>
                    </div>
                    <div className="space-y-3">
                      <p><span className="text-primary font-medium">3.3.</span> You must be at least 18 years old to use our Service.</p>
                      <p><span className="text-primary font-medium">3.4.</span> One person or entity may not maintain multiple accounts.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-2xl font-semibold gradient-text mb-6">4. User Conduct and Content</h2>
                <div className="text-foreground/90 space-y-4">
                  <p><span className="text-primary font-medium">4.1.</span> You agree not to use the Service for any unlawful purpose or in any way that violates these Terms.</p>
                  <p><span className="text-primary font-medium">4.2.</span> You retain ownership of content you create, but grant us a license to use, display, and distribute it on the platform.</p>
                  <p><span className="text-primary font-medium">4.3.</span> You agree not to post content that is:</p>
                  <ul className="list-disc list-inside space-y-2 pl-6">
                    <li>Illegal, harmful, or violates others' rights</li>
                    <li>Spam, fraudulent, or misleading</li>
                    <li>Contains viruses or malicious code</li>
                    <li>Harassing, abusive, or discriminatory</li>
                  </ul>
                  <p><span className="text-primary font-medium">4.4.</span> We reserve the right to remove content that violates these guidelines.</p>
                </div>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-2xl font-semibold gradient-text mb-6">5. Intellectual Property Rights</h2>
                <div className="text-foreground/90 space-y-4">
                  <p><span className="text-primary font-medium">5.1.</span> The Service and its original content, features, and functionality are owned by Creatives Takeover and protected by copyright, trademark, and other laws.</p>
                  <p><span className="text-primary font-medium">5.2.</span> You may not use our trademarks, logos, or proprietary information without our written consent.</p>
                  <p><span className="text-primary font-medium">5.3.</span> Business plans and strategies created using our tools remain your intellectual property.</p>
                </div>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-2xl font-semibold gradient-text mb-6">6. Privacy and Data Protection</h2>
                <p className="text-foreground/90">
                  Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information. 
                  By using the Service, you agree to the collection and use of information in accordance with our Privacy Policy.
                </p>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-2xl font-semibold gradient-text mb-6">7. Payment and Billing</h2>
                <div className="text-foreground/90 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <p><span className="text-primary font-medium">7.1.</span> Some features of the Service may require payment of fees.</p>
                      <p><span className="text-primary font-medium">7.2.</span> All fees are non-refundable unless otherwise stated.</p>
                    </div>
                    <div className="space-y-3">
                      <p><span className="text-primary font-medium">7.3.</span> We reserve the right to change our pricing at any time with reasonable notice.</p>
                      <p><span className="text-primary font-medium">7.4.</span> You authorize us to charge your payment method for all fees incurred.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-2xl font-semibold gradient-text mb-6">8. Service Availability and Modifications</h2>
                <div className="text-foreground/90 space-y-4">
                  <p><span className="text-primary font-medium">8.1.</span> We strive to maintain the Service, but cannot guarantee 100% uptime.</p>
                  <p><span className="text-primary font-medium">8.2.</span> We reserve the right to modify, suspend, or discontinue the Service at any time.</p>
                  <p><span className="text-primary font-medium">8.3.</span> We may update these Terms from time to time and will notify you of significant changes.</p>
                </div>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-2xl font-semibold gradient-text mb-6">9. Limitation of Liability</h2>
                <div className="text-foreground/90 space-y-4">
                  <p><span className="text-primary font-medium">9.1.</span> The Service is provided "as is" without warranties of any kind.</p>
                  <p><span className="text-primary font-medium">9.2.</span> We shall not be liable for any indirect, incidental, special, or consequential damages.</p>
                  <p><span className="text-primary font-medium">9.3.</span> Our total liability shall not exceed the amount paid by you for the Service in the past 12 months.</p>
                  <p><span className="text-primary font-medium">9.4.</span> Business advice and strategies provided are for informational purposes only and do not guarantee success.</p>
                </div>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-2xl font-semibold gradient-text mb-6">10. Termination</h2>
                <div className="text-foreground/90 space-y-4">
                  <p><span className="text-primary font-medium">10.1.</span> You may terminate your account at any time by contacting us.</p>
                  <p><span className="text-primary font-medium">10.2.</span> We may terminate or suspend your access immediately for violations of these Terms.</p>
                  <p><span className="text-primary font-medium">10.3.</span> Upon termination, your right to use the Service ceases, and we may delete your account data.</p>
                </div>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-2xl font-semibold gradient-text mb-6">11. Governing Law</h2>
                <p className="text-foreground/90">
                  These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction]. 
                  Any disputes arising from these Terms shall be resolved in the courts of [Your Jurisdiction].
                </p>
              </section>

              <section className="glass-card hover-lift">
                <h2 className="text-2xl font-semibold gradient-text mb-6">12. Contact Information</h2>
                <div className="space-y-4 text-foreground/90">
                  <p>If you have any questions about these Terms of Service, please contact us:</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p><strong className="text-primary">Email:</strong> legal@creatives-takeover.com</p>
                      <p><strong className="text-primary">Address:</strong> [Your Business Address]</p>
                    </div>
                    <div className="space-y-2">
                      <p><strong className="text-primary">Website:</strong> https://creatives-takeover.com/contact</p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="glass-card bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
                <p className="text-sm text-foreground/80">
                  <strong className="text-primary">Disclaimer:</strong> This Terms of Service document is provided as a template and should be reviewed 
                  by qualified legal counsel before implementation. Creatives Takeover recommends consulting with an attorney 
                  to ensure compliance with applicable laws and regulations in your jurisdiction.
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

export default Terms;