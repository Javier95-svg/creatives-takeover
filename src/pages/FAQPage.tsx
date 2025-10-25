import SEO, { createFAQSchema, createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import FAQHero from "@/components/FAQHero";
import SearchableFAQ from "@/components/SearchableFAQ";
import FAQNavigation from "@/components/FAQNavigation";
import AnimatedBackground from "@/components/AnimatedBackground";

const FAQPage = () => {
  // Structured data for FAQ page
  const structuredData = [
    createFAQSchema([
      {
        question: "What is Creatives Takeover?",
        answer: "Creatives Takeover is an AI-powered platform that serves as your co-founder for creative businesses. We help you go from scattered ideas to profitable launch in 30 days through sprint-based planning, accountability partners, and creative-first intelligence."
      },
      {
        question: "How much does it cost?",
        answer: "We offer three pricing tiers: Starter at $29/month for solopreneurs, Elite at $99/month with unlimited design access, and Teams at $299/month for creative agencies. All plans include AI-powered business planning tools."
      },
      {
        question: "Do I need design experience?",
        answer: "No design experience needed! Our platform is built for creative entrepreneurs at any skill level. Our AI co-founder guides you through the entire business planning process with easy-to-follow steps."
      },
      {
        question: "What makes Creatives Takeover different?",
        answer: "Unlike traditional business planning tools, we're built specifically for creative entrepreneurs. We combine AI intelligence with accountability partners, sprint-based execution, and creative-first workflows to help you launch faster."
      },
      {
        question: "Can I try it for free?",
        answer: "Yes! We offer free credits to get started with our AI business planning tools. You can test Dream2Plan and generate your first business report at no cost."
      }
    ]),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'FAQ', url: '/faq' }
    ])
  ];

  return (
    <>
      <SEO
        title="FAQ | Frequently Asked Questions | Creatives Takeover"
        description="Find answers to frequently asked questions about our creative subscription service, pricing, community, and resources. Get help with your creative platform questions."
        keywords="FAQ, frequently asked questions, creative subscription help, platform support, pricing questions, community support"
        url="/faq"
        canonical="https://creatives-takeover.com/faq"
        structuredData={structuredData}
      />
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10">
          <Navigation />
          <FAQHero />
          <SearchableFAQ />
          <FAQNavigation />
        </div>
        <Footer />
      </div>
    </>
  );
};

export default FAQPage;