/**
 * Step 1: Founder Journey Stage & Experience Collection
 * Quick 15-second step to understand founder's current stage
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowRight } from "lucide-react";
import { FounderStage, FounderExperience } from "@/types/fundraisingAssessment";

interface ContextStageStepProps {
  founderStage: FounderStage;
  founderExperience: FounderExperience;
  onStageChange: (stage: FounderStage) => void;
  onExperienceChange: (experience: FounderExperience) => void;
  onContinue: () => void;
}

export const ContextStageStep: React.FC<ContextStageStepProps> = ({
  founderStage,
  founderExperience,
  onStageChange,
  onExperienceChange,
  onContinue
}) => {
  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Before we assess your readiness...</CardTitle>
        <CardDescription>
          Help us tailor the assessment to your specific situation (15 seconds)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Founder Journey Stage */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Where are you in your journey?</Label>
          <RadioGroup value={founderStage} onValueChange={(value) => onStageChange(value as FounderStage)}>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-4 rounded-lg border hover:border-primary cursor-pointer transition-colors">
                <RadioGroupItem value="ideation" id="stage-ideation" />
                <Label htmlFor="stage-ideation" className="cursor-pointer flex-1">
                  <div className="font-medium">Ideation</div>
                  <div className="text-sm text-muted-foreground">Validating idea, no product yet</div>
                </Label>
              </div>

              <div className="flex items-start space-x-3 p-4 rounded-lg border hover:border-primary cursor-pointer transition-colors">
                <RadioGroupItem value="validation" id="stage-validation" />
                <Label htmlFor="stage-validation" className="cursor-pointer flex-1">
                  <div className="font-medium">Validation</div>
                  <div className="text-sm text-muted-foreground">Early prototype, first users</div>
                </Label>
              </div>

              <div className="flex items-start space-x-3 p-4 rounded-lg border hover:border-primary cursor-pointer transition-colors">
                <RadioGroupItem value="building" id="stage-building" />
                <Label htmlFor="stage-building" className="cursor-pointer flex-1">
                  <div className="font-medium">Building</div>
                  <div className="text-sm text-muted-foreground">Building MVP, finding product-market fit</div>
                </Label>
              </div>

              <div className="flex items-start space-x-3 p-4 rounded-lg border hover:border-primary cursor-pointer transition-colors">
                <RadioGroupItem value="launching" id="stage-launching" />
                <Label htmlFor="stage-launching" className="cursor-pointer flex-1">
                  <div className="font-medium">Launching</div>
                  <div className="text-sm text-muted-foreground">Product live, acquiring customers</div>
                </Label>
              </div>

              <div className="flex items-start space-x-3 p-4 rounded-lg border hover:border-primary cursor-pointer transition-colors">
                <RadioGroupItem value="scaling" id="stage-scaling" />
                <Label htmlFor="stage-scaling" className="cursor-pointer flex-1">
                  <div className="font-medium">Scaling</div>
                  <div className="text-sm text-muted-foreground">Proven model, scaling operations</div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Founder Experience */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Founder Experience</Label>
          <RadioGroup value={founderExperience} onValueChange={(value) => onExperienceChange(value as FounderExperience)}>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:border-primary cursor-pointer transition-colors">
                <RadioGroupItem value="first-time" id="exp-first" />
                <Label htmlFor="exp-first" className="cursor-pointer flex-1">First-time founder</Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:border-primary cursor-pointer transition-colors">
                <RadioGroupItem value="second-time" id="exp-second" />
                <Label htmlFor="exp-second" className="cursor-pointer flex-1">Second-time founder</Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:border-primary cursor-pointer transition-colors">
                <RadioGroupItem value="experienced" id="exp-experienced" />
                <Label htmlFor="exp-experienced" className="cursor-pointer flex-1">Experienced (3+ startups)</Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Continue Button */}
        <div className="flex justify-end pt-4">
          <Button
            size="lg"
            onClick={onContinue}
            className="min-w-[150px]"
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
