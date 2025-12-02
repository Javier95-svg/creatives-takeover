import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, UserPlus, Sparkles, Save, TrendingUp, Target } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { RedditInsights } from '@/components/RedditInsights';
import { MarketValidationScore } from '@/types/founderOS';

interface ReportDisplayProps {
  report: string;
  onDownloadPDF?: () => void;
  validationScore?: MarketValidationScore | null;
}

export const ReportDisplay = ({ report, onDownloadPDF, validationScore }: ReportDisplayProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignUp = () => {
    // Save progress for restoration after signup
    localStorage.setItem('bizmap_progress', JSON.stringify({
      step: 7,
      timestamp: Date.now()
    }));
    navigate('/signup?source=bizmap-report&return=/bizmap-ai');
  };

  return (
    <div className="w-full animate-fade-in space-y-6">
      {/* Report Card */}
      <Card className="w-full border-primary/20 shadow-2xl">
        {/* Sticky Header */}
        <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm z-10 border-b border-primary/10">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl sm:text-3xl flex items-center gap-3">
                <span className="text-3xl">🚀</span>
                Your Business Launch Report
              </CardTitle>
              <CardDescription>
                Complete business plan generated from your responses
              </CardDescription>
            </div>
            {onDownloadPDF && (
              <Button
                onClick={onDownloadPDF}
                variant="outline"
                size="sm"
                className="hidden sm:flex"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            )}
          </div>
        </CardHeader>
        
        {/* Report Content */}
        <CardContent className="p-6 sm:p-8 lg:p-10">
          <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {report}
            </ReactMarkdown>
          </div>
          
          {/* Reddit Insights Section */}
          {validationScore?.reddit_discussions && validationScore.reddit_discussions.length > 0 && (
            <div className="mt-8">
              <RedditInsights discussions={validationScore.reddit_discussions} />
            </div>
          )}
        </CardContent>
        
        {/* Mobile Download Button */}
        {onDownloadPDF && (
          <div className="px-6 pb-4 sm:hidden">
            <Button
              onClick={onDownloadPDF}
              variant="outline"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        )}

        {/* Non-blocking CTA Footer (only for non-authenticated users) */}
        {!user && (
          <CardFooter className="flex-col gap-6 border-t bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 p-6 sm:p-8">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                Save Your Progress
              </div>
              <h3 className="text-xl font-bold">
                Create a Free Account to Save This Report
              </h3>
              <p className="text-sm text-muted-foreground">
                Don't lose your business plan! Sign up to access it anytime, track progress, and unlock premium features.
              </p>
            </div>
            
            {/* Value Props Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-primary/10">
                <Save className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Save Your Plan</p>
                  <p className="text-xs text-muted-foreground">Never lose your work</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-primary/10">
                <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Track Progress</p>
                  <p className="text-xs text-muted-foreground">Monitor your journey</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-primary/10">
                <Target className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Sprint Planning</p>
                  <p className="text-xs text-muted-foreground">Actionable tasks</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-primary/10">
                <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">AI Insights</p>
                  <p className="text-xs text-muted-foreground">Personalized tips</p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              <Button 
                onClick={handleSignUp}
                size="lg"
                className="sm:min-w-[200px]"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create Free Account
              </Button>
              {onDownloadPDF && (
                <Button 
                  onClick={onDownloadPDF}
                  variant="outline"
                  size="lg"
                  className="sm:min-w-[200px] hidden sm:flex"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              )}
            </div>
            
            <p className="text-xs text-center text-muted-foreground">
              ✨ Free forever • No credit card required • Start building in 30 seconds
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};
