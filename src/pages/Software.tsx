import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

const Software = () => {
  return (
    <>
      {/* Placeholder page: a heading, one sentence, and a TODO where the content
          should be. It is crawlable and not disallowed, and it shipped a bare
          duplicate <title> plus a *relative* canonical, which resolves against
          whatever URL is being crawled. Kept noindex until it has real content —
          an empty page in the index is a site-quality liability, not a win. */}
      <Helmet>
        <title>Software | Creatives Takeover</title>
        <meta name="description" content="Explore Creatives Takeover software—templates, AI ops, and marketplace to launch and scale your projects." />
        <meta name="robots" content="noindex,follow" />
        <link rel="canonical" href="https://creatives-takeover.com/software" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-6 py-24">
          <ScrollReveal>
          <header className="mb-8">
            <h1 className="text-3xl md:text-5xl font-bold">Software</h1>
            <p className="mt-4 text-muted-foreground max-w-2xl">All-in-one platform for templates, AI operations, and project marketplace—built for creators and teams.</p>
          </header>
          </ScrollReveal>
          {/* ... keep existing code (details and showcases will go here) */}
        </main>
        <Footer />
      </div>
    </>
  )
}

export default Software;
