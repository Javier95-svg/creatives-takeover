import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";

const Contact = () => {
  return (
    <>
      <Helmet>
        <title>Contact | Creatives Takeover</title>
        <meta name="description" content="Contact Creatives Takeover. We're here to help with product questions, partnerships, and support." />
        <link rel="canonical" href="/contact" />
      </Helmet>
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
              <p className="mt-2 text-muted-foreground">hello@creativestakeover.com</p>
            </article>
            <article className="p-6 rounded-lg border bg-card">
              <h2 className="text-xl font-semibold">Community</h2>
              <p className="mt-2 text-muted-foreground">Join us on Discord and LinkedIn to connect with the team and the community.</p>
            </article>
          </section>
        </main>
      </div>
    </>
  )
}

export default Contact;
