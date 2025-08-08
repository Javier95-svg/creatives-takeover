import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";

const HowItWorks = () => {
  return (
    <>
      <Helmet>
        <title>How It Works | Creatives Takeover</title>
        <meta name="description" content="See how Creatives Takeover helps you go from idea to MVP fast with AI workflows and templates." />
        <link rel="canonical" href="/how-it-works" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-6 py-24">
          <header className="mb-8">
            <h1 className="text-3xl md:text-5xl font-bold">How It Works</h1>
            <p className="mt-4 text-muted-foreground max-w-2xl">From idea to launch: use AI workflows, templates, and expert systems to build an MVP in weeks—not months.</p>
          </header>
          {/* ... keep existing code (rest of page content to be built later) */}
        </main>
      </div>
    </>
  )
}

export default HowItWorks;
