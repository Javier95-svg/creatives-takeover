import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Target, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OutcomeTrackerProps {
  analysisId: string;
  predictedScore?: number;
  predictedVerdict?: string;
  onOutcomeSubmitted?: () => void;
}

const OUTCOME_OPTIONS = [
  { value: 'launched', label: 'Launched - Product is live' },
  { value: 'pivoted', label: 'Pivoted - Changed direction' },
  { value: 'abandoned', label: 'Abandoned - Stopped working on it' },
  { value: 'funded', label: 'Funded - Received investment' },
  { value: 'in_progress', label: 'In Progress - Still developing' },
  { value: 'unknown', label: 'Unknown - Not sure yet' },
];

const OutcomeTracker: React.FC<OutcomeTrackerProps> = ({
  analysisId,
  predictedScore,
  predictedVerdict,
  onOutcomeSubmitted
}) => {
  const { toast } = useToast();
  const [outcome, setOutcome] = useState<string>('');
  const [outcomeDate, setOutcomeDate] = useState<string>('');
  const [revenue, setRevenue] = useState<string>('');
  const [customers, setCustomers] = useState<string>('');
  const [fundingAmount, setFundingAmount] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!outcome) {
      toast({
        title: "Please select an outcome",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const outcomeDetails: any = {};
      if (revenue) outcomeDetails.revenue = parseFloat(revenue);
      if (customers) outcomeDetails.customerCount = parseInt(customers);
      if (fundingAmount) outcomeDetails.fundingAmount = parseFloat(fundingAmount);
      if (additionalNotes) outcomeDetails.notes = additionalNotes;
      if (predictedScore !== undefined) outcomeDetails.predictedScore = predictedScore;
      if (predictedVerdict) outcomeDetails.predictedVerdict = predictedVerdict;

      const { error } = await supabase
        .from('pmf_analysis_results')
        .update({
          actual_outcome: outcome,
          outcome_date: outcomeDate || new Date().toISOString(),
          outcome_details: outcomeDetails
        })
        .eq('id', analysisId);

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Outcome recorded!",
        description: "Thank you for helping us improve PMF analysis accuracy.",
      });

      if (onOutcomeSubmitted) {
        onOutcomeSubmitted();
      }
    } catch (error) {
      console.error('Error submitting outcome:', error);
      toast({
        title: "Failed to submit outcome",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                Outcome Recorded
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Thank you for sharing your outcome! This helps us improve the accuracy of future PMF analyses.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-4 h-4" />
          Track Your Outcome
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Help us improve PMF analysis accuracy by sharing what happened with your idea. 
            {predictedScore !== undefined && (
              <span className="block mt-1">
                Your predicted score was <strong>{predictedScore}/100</strong> ({predictedVerdict}).
              </span>
            )}
          </p>

          <div className="space-y-2">
            <Label htmlFor="outcome">
              What happened? <span className="text-destructive">*</span>
            </Label>
            <Select value={outcome} onValueChange={setOutcome} required>
              <SelectTrigger id="outcome">
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="outcomeDate" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              When did this happen?
            </Label>
            <Input
              id="outcomeDate"
              type="date"
              value={outcomeDate}
              onChange={(e) => setOutcomeDate(e.target.value)}
            />
          </div>

          {(outcome === 'launched' || outcome === 'funded') && (
            <div className="space-y-4 pt-2 border-t">
              {outcome === 'launched' && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="revenue">Revenue (USD, optional)</Label>
                      <Input
                        id="revenue"
                        type="number"
                        value={revenue}
                        onChange={(e) => setRevenue(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customers">Number of Customers (optional)</Label>
                      <Input
                        id="customers"
                        type="number"
                        value={customers}
                        onChange={(e) => setCustomers(e.target.value)}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>
                </>
              )}

              {outcome === 'funded' && (
                <div className="space-y-2">
                  <Label htmlFor="fundingAmount">Funding Amount (USD, optional)</Label>
                  <Input
                    id="fundingAmount"
                    type="number"
                    value={fundingAmount}
                    onChange={(e) => setFundingAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="additionalNotes">Additional Notes (optional)</Label>
            <Textarea
              id="additionalNotes"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any additional context about the outcome..."
              rows={3}
              className="resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={!outcome || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Outcome'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default OutcomeTracker;

