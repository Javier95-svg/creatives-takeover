import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import WhatWeAre from "@/components/WhatWeAre";
import WhatWeDo from "@/components/WhatWeDo";
import AIPillars from "@/components/AIPillars";
import FreeResources from "@/components/FreeResources";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <div id="what-we-are">
        <WhatWeAre />
      </div>
      <div id="what-we-do">
        <WhatWeDo />
      </div>
      <div id="pillars">
        <AIPillars />
      </div>
      <div id="resources">
        <FreeResources />
      </div>
    </div>
  );
};

export default Index;
