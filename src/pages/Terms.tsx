import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";

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
          <header className="mb-8">
            <h1 className="text-3xl md:text-5xl font-bold">Terms of Service</h1>
            <p className="mt-4 text-muted-foreground max-w-3xl">These terms govern the use of Creatives Takeover. This is placeholder content and not legal advice.</p>
          </header>
          {/* ... keep existing code (full terms content to be added later) */}
        </main>
      </div>
    </>
  )
}

export default Terms;
