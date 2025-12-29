/**
 * Step 2: Business Context Collection
 * 30-second step to gather industry, business model, and startup details
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { INDUSTRY_OPTIONS, BUSINESS_MODEL_OPTIONS } from "@/data/assessmentQuestions";

interface ContextBusinessStepProps {
  industry?: string;
  businessModel?: string;
  primaryLocation?: string;
  fundingAmountNeeded?: number;
  pitchSummary?: string;
  onIndustryChange: (value: string) => void;
  onBusinessModelChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onFundingAmountChange: (value: number | undefined) => void;
  onPitchSummaryChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export const ContextBusinessStep: React.FC<ContextBusinessStepProps> = ({
  industry,
  businessModel,
  primaryLocation,
  fundingAmountNeeded,
  pitchSummary,
  onIndustryChange,
  onBusinessModelChange,
  onLocationChange,
  onFundingAmountChange,
  onPitchSummaryChange,
  onBack,
  onContinue
}) => {
  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Tell us about your startup</CardTitle>
        <CardDescription>
          This helps us provide personalized insights (30 seconds)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Industry */}
        <div className="space-y-2">
          <Label htmlFor="industry" className="text-base font-semibold">
            Industry <span className="text-destructive">*</span>
          </Label>
          <Select value={industry} onValueChange={onIndustryChange}>
            <SelectTrigger id="industry">
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Business Model */}
        <div className="space-y-2">
          <Label htmlFor="business-model" className="text-base font-semibold">
            Business Model <span className="text-destructive">*</span>
          </Label>
          <Select value={businessModel} onValueChange={onBusinessModelChange}>
            <SelectTrigger id="business-model">
              <SelectValue placeholder="Select your business model" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_MODEL_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Primary Location */}
        <div className="space-y-2">
          <Label htmlFor="location" className="text-base">
            Primary Location <span className="text-muted-foreground text-sm">(Optional)</span>
          </Label>
          <Input
            id="location"
            type="text"
            placeholder="e.g., San Francisco, London, Remote"
            value={primaryLocation || ''}
            onChange={(e) => onLocationChange(e.target.value)}
          />
        </div>

        {/* Funding Amount Seeking */}
        <div className="space-y-2">
          <Label htmlFor="funding-amount" className="text-base">
            Funding Seeking <span className="text-muted-foreground text-sm">(Optional)</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="funding-amount"
              type="number"
              placeholder="e.g., 500000"
              value={fundingAmountNeeded || ''}
              onChange={(e) => onFundingAmountChange(e.target.value ? parseInt(e.target.value) : undefined)}
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground">Enter the amount in USD (e.g., 500000 for $500K)</p>
        </div>

        {/* Pitch Summary */}
        <div className="space-y-2">
          <Label htmlFor="pitch-summary" className="text-base">
            Brief Description <span className="text-muted-foreground text-sm">(Optional, 2-3 sentences)</span>
          </Label>
          <Textarea
            id="pitch-summary"
            placeholder="What problem are you solving and how?"
            value={pitchSummary || ''}
            onChange={(e) => onPitchSummaryChange(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">
            {pitchSummary?.length || 0}/500 characters
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={onBack}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            size="lg"
            onClick={onContinue}
            disabled={!industry || !businessModel}
            className="min-w-[180px]"
          >
            Begin Assessment
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
