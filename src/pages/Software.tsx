import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const Software = () => {
  return (
    <>
      <Helmet>
        <title>Software | Creatives Takeover</title>
        <meta name="description" content="Explore Creatives Takeover software—templates, AI ops, and marketplace to launch and scale your projects." />
        <link rel="canonical" href="/software" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-6 py-24">
          <header className="mb-8">
            <h1 className="text-3xl md:text-5xl font-bold">Software</h1>
            <p className="mt-4 text-muted-foreground max-w-2xl">All-in-one platform for templates, AI operations, and project marketplace—built for creators and teams.</p>
          </header>
          {/* ... keep existing code (details and showcases will go here) */}
        </main>
        <Footer />
      </div>
    </>
  )
}

export default Software;
