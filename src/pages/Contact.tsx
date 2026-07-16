import SEO, { createContactPageSchema, createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const Contact = () => {
  // Structured data for Contact page
  const structuredData = [
    createContactPageSchema(),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Contact', url: '/contact' }
    ])
  ];

  return (
    <>
      <SEO
        title="Contact Creatives Takeover | Founder Support"
        description="Contact Creatives Takeover for founder-tool support, product questions, partnerships, or media inquiries."
        keywords="contact Creatives Takeover, founder support, startup tools, partnerships, media inquiries"
        url="/contact"
        canonical="https://creatives-takeover.com/contact"
        image="/og-image.png"
        structuredData={structuredData}
      />
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-6 py-24">
          <header className="mb-8">
            <h1 className="text-3xl md:text-5xl font-bold">Contact</h1>
            <p className="mt-4 text-muted-foreground max-w-2xl">Reach out for product questions, partnerships, or support. We'll get back within 1–2 business days.</p>
          </header>
          <section className="grid gap-6 md:grid-cols-2">
            <article className="p-6 rounded-lg border bg-card">
              <h2 className="text-xl font-semibold">Email</h2>
              <a href="mailto:javier@creatives-takeover.com" className="mt-2 text-muted-foreground hover:text-primary transition-colors duration-200 block">javier@creatives-takeover.com</a>
            </article>
            <article className="p-6 rounded-lg border bg-card">
              <h2 className="text-xl font-semibold">Community</h2>
              <p className="mt-2 text-muted-foreground">
                Join us on{" "}
                <a href="https://www.linkedin.com/company/creatives-takeover" target="_blank" rel="noopener noreferrer"
                   className="underline underline-offset-4 hover:text-foreground transition-colors">LinkedIn</a>{" "}
                to connect with the team and the community.
              </p>
            </article>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}

export default Contact;
