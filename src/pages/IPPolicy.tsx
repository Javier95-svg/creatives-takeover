import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const IPPolicy = () => {
  return (
    <>
      <Helmet>
        <title>IP Policy | Creatives Takeover</title>
        <meta name="description" content="Learn about our Intellectual Property Policy, including content ownership and usage guidelines." />
        <link rel="canonical" href="/ip-policy" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-6 py-24">
          <header className="mb-8">
            <h1 className="text-3xl md:text-5xl font-bold">Intellectual Property Policy</h1>
            <p className="mt-4 text-muted-foreground max-w-3xl">Information about content ownership, licensing, and takedown procedures. Placeholder content.</p>
          </header>
          {/* ... keep existing code (full IP policy content to be added later) */}
        </main>
        <Footer />
      </div>
    </>
  )
}

export default IPPolicy;
