import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MatchRequest, InvestmentStage } from '@/types/investor';
import { Search } from 'lucide-react';

interface MatchContextFormProps {
  onSubmit: (matchRequest: MatchRequest) => void;
  initialData?: Partial<MatchRequest>;
  isLoading?: boolean;
}

const industries = [
  'SaaS',
  'AI/ML',
  'Fintech',
  'E-commerce',
  'Healthcare',
  'Technology',
  'B2B',
  'Marketplace',
  'D2C',
  'Enterprise Software'
];

const businessModels = [
  'B2B SaaS',
  'B2C',
  'Marketplace',
  'D2C',
  'Enterprise',
  'Freemium',
  'Subscription',
  'Transaction-based'
];

const stages: InvestmentStage[] = ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c+'];

const commonLocations = [
  'San Francisco',
  'New York',
  'Boston',
  'Los Angeles',
  'Chicago',
  'Seattle',
  'Austin',
  'Miami',
  'Remote',
  'US',
  'Europe',
  'Global'
];

export const MatchContextForm: React.FC<MatchContextFormProps> = ({
  onSubmit,
  initialData,
  isLoading = false
}) => {
  const [industry, setIndustry] = useState(initialData?.industry || '');
  const [fundingAmount, setFundingAmount] = useState(initialData?.funding_amount?.toString() || '');
  const [businessStage, setBusinessStage] = useState<InvestmentStage | undefined>(initialData?.business_stage);
  const [businessModel, setBusinessModel] = useState(initialData?.business_model || '');
  const [locations, setLocations] = useState<string[]>(initialData?.locations || []);
  const [businessSummary, setBusinessSummary] = useState(initialData?.business_summary || '');
  const [locationInput, setLocationInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!industry || !fundingAmount) {
      return; // Validation handled by required fields
    }

    const matchRequest: MatchRequest = {
      industry,
      funding_amount: parseInt(fundingAmount.replace(/[^0-9]/g, ''), 10),
      business_stage: businessStage,
      business_model: businessModel || undefined,
      locations: locations.length > 0 ? locations : undefined,
      business_summary: businessSummary || undefined,
      readiness_scores: initialData?.readiness_scores,
      verdict: initialData?.verdict,
      strengths: initialData?.strengths,
      critical_gaps: initialData?.critical_gaps
    };

    onSubmit(matchRequest);
  };

  const addLocation = () => {
    if (locationInput.trim() && !locations.includes(locationInput.trim())) {
      setLocations([...locations, locationInput.trim()]);
      setLocationInput('');
    }
  };

  const removeLocation = (location: string) => {
    setLocations(locations.filter(loc => loc !== location));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Industry - Required */}
        <div className="space-y-2">
          <Label htmlFor="industry">
            Industry <span className="text-destructive">*</span>
          </Label>
          <Select value={industry} onValueChange={setIndustry} required>
            <SelectTrigger id="industry">
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {industries.map(ind => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Funding Amount - Required */}
        <div className="space-y-2">
          <Label htmlFor="fundingAmount">
            Funding Amount (USD) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="fundingAmount"
            type="text"
            placeholder="e.g., 500000 or $500K"
            value={fundingAmount}
            onChange={(e) => setFundingAmount(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Enter the amount you're seeking (e.g., 500000 or $500K)
          </p>
        </div>

        {/* Business Stage */}
        <div className="space-y-2">
          <Label htmlFor="businessStage">Business Stage</Label>
          <Select
            value={businessStage || ''}
            onValueChange={(value) => setBusinessStage(value as InvestmentStage)}
          >
            <SelectTrigger id="businessStage">
              <SelectValue placeholder="Select your stage" />
            </SelectTrigger>
            <SelectContent>
              {stages.map(stage => (
                <SelectItem key={stage} value={stage}>
                  {stage.charAt(0).toUpperCase() + stage.slice(1).replace('-', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Business Model */}
        <div className="space-y-2">
          <Label htmlFor="businessModel">Business Model</Label>
          <Select value={businessModel} onValueChange={setBusinessModel}>
            <SelectTrigger id="businessModel">
              <SelectValue placeholder="Select your model" />
            </SelectTrigger>
            <SelectContent>
              {businessModels.map(model => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Locations */}
      <div className="space-y-2">
        <Label htmlFor="locations">Locations</Label>
        <div className="flex gap-2">
          <Input
            id="locations"
            type="text"
            placeholder="Add location (e.g., San Francisco)"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addLocation();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addLocation}
            disabled={!locationInput.trim()}
          >
            Add
          </Button>
        </div>
        {locations.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {locations.map(location => (
              <span
                key={location}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-sm"
              >
                {location}
                <button
                  type="button"
                  onClick={() => removeLocation(location)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Quick add: {commonLocations.slice(0, 6).map(loc => (
            <button
              key={loc}
              type="button"
              onClick={() => {
                if (!locations.includes(loc)) {
                  setLocations([...locations, loc]);
                }
              }}
              className="underline mr-2 hover:text-primary"
            >
              {loc}
            </button>
          ))}
        </p>
      </div>

      {/* Business Summary */}
      <div className="space-y-2">
        <Label htmlFor="businessSummary">Business Summary (Optional)</Label>
        <Textarea
          id="businessSummary"
          placeholder="Briefly describe your business (2-3 sentences)..."
          value={businessSummary}
          onChange={(e) => setBusinessSummary(e.target.value)}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Help us find better matches by describing your business
        </p>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!industry || !fundingAmount || isLoading}
      >
        {isLoading ? (
          <>
            <Search className="mr-2 h-5 w-5 animate-spin" />
            Finding Matches...
          </>
        ) : (
          <>
            <Search className="mr-2 h-5 w-5" />
            Find My Investors
          </>
        )}
      </Button>
    </form>
  );
};

