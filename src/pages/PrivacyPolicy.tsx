import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";

const PrivacyPolicy = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | Creatives Takeover</title>
        <meta name="description" content="Read the Creatives Takeover Privacy Policy to understand how we collect and use your data." />
        <link rel="canonical" href="/privacy-policy" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-6 py-24">
          <header className="mb-8">
            <h1 className="text-3xl md:text-5xl font-bold">Privacy Policy</h1>
            <p className="mt-4 text-muted-foreground max-w-3xl">This policy explains what data we collect, how we use it, and your rights. This is a placeholder and not legal advice.</p>
          </header>
          {/* ... keep existing code (full policy content to be added later) */}
        </main>
      </div>
    </>
  )
}

export default PrivacyPolicy;
