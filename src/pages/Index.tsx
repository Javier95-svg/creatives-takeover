import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import AIPillars from "@/components/AIPillars";
import ResultsDashboard from "@/components/ResultsDashboard";
import FreeResources from "@/components/FreeResources";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <div id="pillars">
        <AIPillars />
      </div>
      <div id="results">
        <ResultsDashboard />
      </div>
      <div id="resources">
        <FreeResources />
      </div>
    </div>
  );
};

export default Index;
