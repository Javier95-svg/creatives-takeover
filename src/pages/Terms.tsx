import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <>
      <Helmet>
        <title>Terms of Service | Creatives Takeover</title>
        <meta name="description" content="Review the Creatives Takeover Terms of Service governing your use of the platform." />
        <link rel="canonical" href="/terms" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-6 py-24">
          <header className="mb-12">
            <h1 className="text-3xl md:text-5xl font-bold">Terms of Service</h1>
            <p className="mt-4 text-muted-foreground max-w-3xl">
              Last updated: August 18, 2025
            </p>
            <p className="mt-2 text-muted-foreground max-w-3xl">
              These Terms of Service ("Terms") govern your use of the Creatives Takeover platform and services.
            </p>
          </header>

          <div className="prose prose-lg max-w-4xl mx-auto">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground mb-4">
                By accessing or using Creatives Takeover ("the Service"), you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground mb-4">
                Creatives Takeover provides business planning tools, AI-powered business mapping, community forums, 
                educational resources, and software solutions designed to help entrepreneurs and creative professionals 
                develop and grow their businesses.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts and Registration</h2>
              <div className="text-muted-foreground space-y-4">
                <p>3.1. You must provide accurate and complete information when creating an account.</p>
                <p>3.2. You are responsible for maintaining the confidentiality of your account credentials.</p>
                <p>3.3. You must be at least 18 years old to use our Service.</p>
                <p>3.4. One person or entity may not maintain multiple accounts.</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. User Conduct and Content</h2>
              <div className="text-muted-foreground space-y-4">
                <p>4.1. You agree not to use the Service for any unlawful purpose or in any way that violates these Terms.</p>
                <p>4.2. You retain ownership of content you create, but grant us a license to use, display, and distribute it on the platform.</p>
                <p>4.3. You agree not to post content that is:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Illegal, harmful, or violates others' rights</li>
                  <li>Spam, fraudulent, or misleading</li>
                  <li>Contains viruses or malicious code</li>
                  <li>Harassing, abusive, or discriminatory</li>
                </ul>
                <p>4.4. We reserve the right to remove content that violates these guidelines.</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property Rights</h2>
              <div className="text-muted-foreground space-y-4">
                <p>5.1. The Service and its original content, features, and functionality are owned by Creatives Takeover and protected by copyright, trademark, and other laws.</p>
                <p>5.2. You may not use our trademarks, logos, or proprietary information without our written consent.</p>
                <p>5.3. Business plans and strategies created using our tools remain your intellectual property.</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Privacy and Data Protection</h2>
              <p className="text-muted-foreground mb-4">
                Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information. 
                By using the Service, you agree to the collection and use of information in accordance with our Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Payment and Billing</h2>
              <div className="text-muted-foreground space-y-4">
                <p>7.1. Some features of the Service may require payment of fees.</p>
                <p>7.2. All fees are non-refundable unless otherwise stated.</p>
                <p>7.3. We reserve the right to change our pricing at any time with reasonable notice.</p>
                <p>7.4. You authorize us to charge your payment method for all fees incurred.</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Service Availability and Modifications</h2>
              <div className="text-muted-foreground space-y-4">
                <p>8.1. We strive to maintain the Service, but cannot guarantee 100% uptime.</p>
                <p>8.2. We reserve the right to modify, suspend, or discontinue the Service at any time.</p>
                <p>8.3. We may update these Terms from time to time and will notify you of significant changes.</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
              <div className="text-muted-foreground space-y-4">
                <p>9.1. The Service is provided "as is" without warranties of any kind.</p>
                <p>9.2. We shall not be liable for any indirect, incidental, special, or consequential damages.</p>
                <p>9.3. Our total liability shall not exceed the amount paid by you for the Service in the past 12 months.</p>
                <p>9.4. Business advice and strategies provided are for informational purposes only and do not guarantee success.</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>
              <div className="text-muted-foreground space-y-4">
                <p>10.1. You may terminate your account at any time by contacting us.</p>
                <p>10.2. We may terminate or suspend your access immediately for violations of these Terms.</p>
                <p>10.3. Upon termination, your right to use the Service ceases, and we may delete your account data.</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Governing Law</h2>
              <p className="text-muted-foreground mb-4">
                These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction]. 
                Any disputes arising from these Terms shall be resolved in the courts of [Your Jurisdiction].
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">12. Contact Information</h2>
              <div className="text-muted-foreground space-y-4">
                <p>If you have any questions about these Terms of Service, please contact us:</p>
                <ul className="list-none space-y-2">
                  <li><strong>Email:</strong> legal@creatives-takeover.com</li>
                  <li><strong>Address:</strong> [Your Business Address]</li>
                  <li><strong>Website:</strong> https://creatives-takeover.com/contact</li>
                </ul>
              </div>
            </section>

            <div className="mt-12 p-6 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Disclaimer:</strong> This Terms of Service document is provided as a template and should be reviewed 
                by qualified legal counsel before implementation. Creatives Takeover recommends consulting with an attorney 
                to ensure compliance with applicable laws and regulations in your jurisdiction.
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
