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
        title="Contact Creatives Takeover - Get In Touch"
        description="Contact Creatives Takeover. We're here to help with product questions, partnerships, and support. Reach out and we'll get back within 1-2 business days."
        keywords="contact Creatives Takeover, support, customer service, partnerships, business inquiries, creative platform support"
        url="/contact"
        canonical="https://creatives-takeover.com/contact"
        image="/lovable-uploads/new-favicon.png"
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
              <a href="mailto:javier@admin-creatives-takeover.com" className="mt-2 text-muted-foreground hover:text-primary transition-colors duration-200 block">javier@admin-creatives-takeover.com</a>
            </article>
            <article className="p-6 rounded-lg border bg-card">
              <h2 className="text-xl font-semibold">Community</h2>
              <p className="mt-2 text-muted-foreground">Join us on Discord and LinkedIn to connect with the team and the community.</p>
            </article>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}

export default Contact;
