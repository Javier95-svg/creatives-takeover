import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import SimpleBizMapGuide from "@/components/SimpleBizMapGuide";
import Benefits from "@/components/Benefits";
import { Helmet } from "react-helmet-async";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Creatives Takeover - From Idea to Execution | AI-Powered Business Plans</title>
        <meta name="description" content="Transform your business ideas into comprehensive, actionable business plans in minutes with Creatives Takeover. Get GPT-5 powered analysis, validation experiments, and custom execution strategies." />
        <meta name="keywords" content="business plan, AI business planning, startup planning, business ideas, entrepreneurship, Creatives Takeover, GPT-5" />
      </Helmet>
      <Navigation />
      <main>
        <Hero />
        <SimpleBizMapGuide />
        <Benefits />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
