import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { InvestorMatch, MatchRequest } from '@/types/investor';
import { ExternalLink, MapPin, DollarSign, TrendingUp, CheckCircle2, Mail, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmailPreview } from './EmailPreview';
import { useOutreachGenerator } from '@/hooks/useOutreachGenerator';

interface InvestorMatchCardProps {
  match: InvestorMatch;
  isTopMatch?: boolean;
  onViewProfile?: (investorId: string) => void;
  matchRequest?: MatchRequest; // Pass match request for email generation
}

export const InvestorMatchCard: React.FC<InvestorMatchCardProps> = ({
  match,
  isTopMatch = false,
  onViewProfile,
  matchRequest
}) => {
  const { investor, match_score, match_reasons, match_breakdown } = match;
  const { generateEmail, loading: generatingEmail } = useOutreachGenerator();
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<{
    subject: string;
    subject_variations: string[];
    body: string;
  } | null>(null);

  const handleGenerateEmail = async () => {
    if (!matchRequest) {
      return;
    }

    const email = await generateEmail(investor.id, matchRequest, investor);
    if (email) {
      setGeneratedEmail(email);
      setEmailPreviewOpen(true);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-lg",
        isTopMatch && "border-primary border-2 shadow-md"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{investor.name}</h3>
              {isTopMatch && (
                <Badge variant="default" className="bg-primary">
                  Top Match
                </Badge>
              )}
              {investor.is_featured && (
                <Badge variant="outline" className="border-primary">
                  Featured
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{investor.firm_name}</p>
          </div>
          <div className="text-right">
            <div className={cn("text-2xl font-bold", getScoreColor(match_score))}>
              {match_score}%
            </div>
            <div className="text-xs text-muted-foreground">Match Score</div>
          </div>
        </div>

        {/* Match Score Progress Bar */}
        <div className="mt-3">
          <Progress value={match_score} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Match Reasons */}
        {match_reasons.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Why This Match
            </h4>
            <ul className="space-y-1">
              {match_reasons.map((reason, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Investment Details */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              Check Size
            </div>
            <div className="text-sm font-medium">
              {investor.typical_check_size_min && investor.typical_check_size_max
                ? `$${(investor.typical_check_size_min / 1000).toFixed(0)}K - $${(investor.typical_check_size_max / 1000).toFixed(0)}K`
                : investor.typical_check_size_min
                ? `$${(investor.typical_check_size_min / 1000).toFixed(0)}K+`
                : 'Not specified'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              Stages
            </div>
            <div className="text-sm font-medium">
              {investor.investment_stages.slice(0, 2).join(', ')}
              {investor.investment_stages.length > 2 && '...'}
            </div>
          </div>

          <div className="space-y-1 col-span-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              Location
            </div>
            <div className="text-sm font-medium">
              {investor.locations.slice(0, 2).join(', ')}
              {investor.locations.length > 2 && ` +${investor.locations.length - 2} more`}
              {investor.remote_friendly && ' • Remote-friendly'}
            </div>
          </div>
        </div>

        {/* Industries */}
        <div className="flex flex-wrap gap-1 pt-2 border-t">
          {investor.industries.slice(0, 4).map((industry, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {industry}
            </Badge>
          ))}
          {investor.industries.length > 4 && (
            <Badge variant="secondary" className="text-xs">
              +{investor.industries.length - 4} more
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t">
          <div className="flex gap-2">
            {matchRequest && (
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={handleGenerateEmail}
                disabled={generatingEmail}
              >
                {generatingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-3 w-3" />
                    Generate Email
                  </>
                )}
              </Button>
            )}
            {onViewProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewProfile(investor.id)}
              >
                View Profile
              </Button>
            )}
          </div>
          {investor.firm_website && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="w-full"
            >
              <a
                href={investor.firm_website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1"
              >
                Website
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>

        {/* Match Breakdown (Collapsible) */}
        <details className="pt-2 border-t">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            View detailed match breakdown
          </summary>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stage Alignment:</span>
              <span className="font-medium">{match_breakdown.stage_alignment}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Industry Focus:</span>
              <span className="font-medium">{match_breakdown.industry_focus}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Geographic:</span>
              <span className="font-medium">{match_breakdown.geographic_preference}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Check Size:</span>
              <span className="font-medium">{match_breakdown.check_size_compatibility}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Portfolio Similarity:</span>
              <span className="font-medium">{match_breakdown.portfolio_similarity}%</span>
            </div>
          </div>
        </details>
      </CardContent>

      {/* Email Preview Dialog */}
      {generatedEmail && (
        <EmailPreview
          isOpen={emailPreviewOpen}
          onClose={() => setEmailPreviewOpen(false)}
          email={generatedEmail}
          investorName={investor.name}
          investorEmail={investor.email}
        />
      )}
    </Card>
  );
};

