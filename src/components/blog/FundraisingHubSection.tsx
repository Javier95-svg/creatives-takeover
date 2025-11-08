import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target } from "lucide-react";
import InvestorTracker from "./fundraising/InvestorTracker";
import PitchDeck from "./fundraising/PitchDeck";
import InvestorDatabase from "./fundraising/InvestorDatabase";

const FundraisingHubSection = () => {
  const [activeTab, setActiveTab] = useState("tracker");

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-muted/30 to-background relative overflow-hidden" data-section="fundraising">
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute top-10 left-10 w-64 h-64 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-secondary rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-6">
            <Target className="h-6 w-6 text-primary" />
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight pb-2">
              Fundraising Hub
            </h2>
            <span className="text-4xl md:text-5xl">🎯</span>
          </div>
          <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
            Track investors, manage your pitch materials, and access our curated investor database
          </p>
        </div>

        <div className="bg-background/80 backdrop-blur-sm rounded-2xl border shadow-xl p-6 md:p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 h-auto">
              <TabsTrigger value="tracker" className="py-3">
                <span className="hidden sm:inline">Investor Tracker</span>
                <span className="sm:hidden">Tracker</span>
              </TabsTrigger>
              <TabsTrigger value="pitch" className="py-3">
                <span className="hidden sm:inline">Pitch Deck</span>
                <span className="sm:hidden">Pitch</span>
              </TabsTrigger>
              <TabsTrigger value="database" className="py-3">
                <span className="hidden sm:inline">Investor Database</span>
                <span className="sm:hidden">Database</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tracker" className="space-y-4 mt-0">
              <InvestorTracker />
            </TabsContent>

            <TabsContent value="pitch" className="space-y-4 mt-0">
              <PitchDeck />
            </TabsContent>

            <TabsContent value="database" className="space-y-4 mt-0">
              <InvestorDatabase />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};

export default FundraisingHubSection;
