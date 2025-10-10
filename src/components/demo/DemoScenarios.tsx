import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { demoScenarios, DemoScenario } from "@/utils/demoDataSeeder";
import { Rocket, Sparkles } from "lucide-react";

interface DemoScenariosProps {
  onSelectScenario: (scenarioId: string) => void;
  currentScenarioId?: string;
}

const DemoScenarios = ({ onSelectScenario, currentScenarioId }: DemoScenariosProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold gradient-text">Choose Your Demo Experience</h2>
        <p className="text-muted-foreground">
          Select a business scenario to see BizMap AI in action
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {demoScenarios.map((scenario) => (
          <Card 
            key={scenario.id}
            className={`glass-card hover-lift cursor-pointer transition-all ${
              currentScenarioId === scenario.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onSelectScenario(scenario.id)}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{scenario.icon}</div>
                  <div>
                    <h3 className="font-semibold text-lg">{scenario.name}</h3>
                    <p className="text-sm text-muted-foreground">{scenario.industry}</p>
                  </div>
                </div>
                {scenario.successScore && (
                  <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">
                      {scenario.successScore}%
                    </span>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                {scenario.description}
              </p>

              <div className="pt-2">
                <Button 
                  className="w-full"
                  variant={currentScenarioId === scenario.id ? "default" : "outline"}
                >
                  <Rocket className="mr-2 h-4 w-4" />
                  {currentScenarioId === scenario.id ? 'Current Demo' : 'Try This Demo'}
                </Button>
              </div>

              {scenario.successScore && (
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Success Likelihood</span>
                    <span className="font-semibold">
                      {scenario.successScore >= 80 ? 'High' : scenario.successScore >= 70 ? 'Good' : 'Moderate'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="text-center pt-4">
        <p className="text-sm text-muted-foreground">
          All scenarios include pre-filled business plans, market analysis, and AI insights
        </p>
      </div>
    </div>
  );
};

export default DemoScenarios;
