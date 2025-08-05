import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import FAQHero from "@/components/FAQHero";
import SearchableFAQ from "@/components/SearchableFAQ";
import FAQNavigation from "@/components/FAQNavigation";

const FAQPage = () => {
  return (
    <>
      <Helmet>
        <title>FAQ | Frequently Asked Questions | Creatives Takeover</title>
        <meta 
          name="description" 
          content="Find answers to frequently asked questions about our creative subscription service, pricing, community, and resources. Get help with your creative platform questions." 
        />
        <meta name="keywords" content="FAQ, frequently asked questions, creative subscription help, platform support, pricing questions, community support" />
        <meta property="og:title" content="FAQ | Get Answers to Your Creative Platform Questions" />
        <meta property="og:description" content="Find quick answers to common questions about our creative subscription service, features, and community." />
        <link rel="canonical" href="/faq" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <FAQHero />
        <SearchableFAQ />
        <FAQNavigation />
      </div>
    </>
  );
};

export default FAQPage;