import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import WhatWeAre from "@/components/WhatWeAre";
import WhatWeDo from "@/components/WhatWeDo";
import Pricing from "@/components/Pricing";
import Community from "@/components/Community";
import FreeResources from "@/components/FreeResources";
import FAQ from "@/components/FAQ";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <div id="who-we-are">
        <WhatWeAre />
      </div>
      <div id="what-we-do">
        <WhatWeDo />
      </div>
      <div id="pricing">
        <Pricing />
      </div>
      <div id="community">
        <Community />
      </div>
      <div id="resources">
        <FreeResources />
      </div>
      <div id="faq">
        <FAQ />
      </div>
    </div>
  );
};

export default Index;
