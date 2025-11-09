import React, { useState, useMemo, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  ClipboardCheck,
  ArrowRight,
  CalendarClock,
  Layers
} from "lucide-react";
import { toast } from "sonner";
import { useFundingOpportunities } from "@/hooks/useFundingOpportunities";
import FundingOpportunityCard from "@/components/funding/FundingOpportunityCard";
import FundingFilters from "@/components/funding/FundingFilters";
import { FundingOpportunity, FundingFilters as FundingFiltersType } from "@/types/funding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface FundingOpportunitiesSectionProps {
  filters?: FundingFiltersType;
  onFiltersChange?: (filters: FundingFiltersType) => void;
}

type ApplicationTask = {
  id: string;
  title: string;
  completed: boolean;
};

interface OpportunityDetailProps {
  opportunity: FundingOpportunity;
  onApply: (opportunity: FundingOpportunity) => void;
  tasks: ApplicationTask[] | undefined;
  onToggleTask: (opportunityId: string, taskId: string) => void;
}

const OpportunityDetail = ({ opportunity, onApply, tasks, onToggleTask }: OpportunityDetailProps) => {
  const applicationClose = opportunity.key_dates?.application_close;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-foreground">
              {opportunity.title}
            </h3>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
              {opportunity.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {opportunity.funding_amount && (
              <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                {opportunity.funding_amount}
              </Badge>
            )}
            {applicationClose && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                Apply by {new Date(applicationClose).toLocaleDateString()}
              </Badge>
            )}
            <Button size="sm" variant="outline" onClick={() => window.open(opportunity.url, "_blank", "noopener,noreferrer")}>Visit Opportunity</Button>
          </div>
        </div>

        {opportunity.funding_types.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Layers className="h-4 w-4 text-primary" />
            {opportunity.funding_types.map((type, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {type}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Eligibility Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {opportunity.eligibility.map((item, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-5 w-5 text-primary" /> Key Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span>Applications Open</span>
              <span>{opportunity.key_dates.application_open ? new Date(opportunity.key_dates.application_open).toLocaleDateString() : 'Rolling'}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span>Applications Close</span>
              <span>{opportunity.key_dates.application_close ? new Date(opportunity.key_dates.application_close).toLocaleDateString() : 'Rolling'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Decision Date</span>
              <span>{opportunity.key_dates.decision_date ? new Date(opportunity.key_dates.decision_date).toLocaleDateString() : 'TBD'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-5 w-5 text-primary" /> How to Apply
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-3">
            {opportunity.application_steps.map((step) => (
              <AccordionItem key={step.id} value={step.id} className="border border-border/60 rounded-lg px-4">
                <AccordionTrigger className="text-left text-sm font-semibold py-3">
                  {step.title}
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>{step.description}</p>
                  {step.example && (
                    <div className="bg-muted/50 border border-border/60 rounded-md px-3 py-2 text-xs">
                      <span className="font-semibold text-foreground/80">Example:</span> {step.example}
                    </div>
                  )}
                  {step.resourceLabel && step.resourceUrl && (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => window.open(step.resourceUrl!, "_blank", "noopener,noreferrer")}>
                      <ArrowRight className="h-3.5 w-3.5 mr-1" /> {step.resourceLabel}
                    </Button>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-600">
              <AlertTriangle className="h-5 w-5" /> Common Mistakes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {opportunity.tips.mistakes.map((mistake, index) => (
              <div key={index} className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <span>{mistake}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <Sparkles className="h-5 w-5" /> Winning Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {opportunity.tips.winning.map((tip, index) => (
              <div key={index} className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                <span>{tip}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-5 w-5 text-primary" /> Community Q&A
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {opportunity.community_questions && opportunity.community_questions.length > 0 ? (
            opportunity.community_questions.map((entry, index) => (
              <div key={index} className="border border-border/60 rounded-lg p-3">
                <p className="font-semibold text-foreground flex items-start gap-2">
                  <MessageCircle className="h-4 w-4 text-primary mt-0.5" />
                  {entry.question}
                </p>
                {entry.answers && entry.answers.length > 0 ? (
                  <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-muted-foreground">
                    {entry.answers.map((answer, answerIndex) => (
                      <li key={answerIndex}>{answer}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">No answers yet. Be the first to respond.</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground/80">
              No questions yet. Ask the community or be the first to share what you learned applying to this opportunity.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => toast.success('Mentor feedback request sent!', { description: 'A mentor will reach out within 48 hours.' })}
              className="text-sm"
            >
              Submit for Mentor Feedback
            </Button>
            <Button
              className="text-sm"
              onClick={() => onApply(opportunity)}
            >
              I want to apply
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-5 w-5 text-primary" /> Application To-Do List
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks && tasks.length > 0 ? (
            tasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 text-sm text-muted-foreground">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => onToggleTask(opportunity.id, task.id)}
                  className="mt-0.5"
                />
                <span className={task.completed ? 'line-through text-muted-foreground/70' : ''}>{task.title}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Click "I want to apply" to generate a tailored checklist using the steps above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const FundingOpportunitiesSection = ({
  filters: externalFilters,
  onFiltersChange
}: FundingOpportunitiesSectionProps) => {
  const [internalFilters, setInternalFilters] = useState<FundingFiltersType>({});
  const filterState = externalFilters || internalFilters;
  const handleFiltersChange = onFiltersChange || setInternalFilters;

  const { opportunities, loading, error } = useFundingOpportunities(filterState);
  const { opportunities: allOpportunities } = useFundingOpportunities({});

  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [applicationPlans, setApplicationPlans] = useState<Record<string, ApplicationTask[]>>({});

  useEffect(() => {
    if (opportunities.length === 0) {
      setSelectedOpportunityId(null);
      return;
    }

    if (!selectedOpportunityId || !opportunities.some((opp) => opp.id === selectedOpportunityId)) {
      setSelectedOpportunityId(opportunities[0].id);
    }
  }, [opportunities, selectedOpportunityId]);

  const availableLocations = useMemo(() => {
    const locationsSet = new Set<string>();
    const source = allOpportunities.length > 0 ? allOpportunities : opportunities;
    source.forEach((opp) => {
      opp.location.forEach((loc) => locationsSet.add(loc));
    });
    return Array.from(locationsSet).sort();
  }, [allOpportunities, opportunities]);

  const selectedOpportunity = opportunities.find((opp) => opp.id === selectedOpportunityId) ?? null;

  const generateTasksForOpportunity = (opportunity: FundingOpportunity) => {
    const baseTasks: ApplicationTask[] = opportunity.application_steps.map((step, index) => ({
      id: `${opportunity.id}-step-${index + 1}`,
      title: step.title,
      completed: false
    }));

    const supplementalTasks: ApplicationTask[] = [
      {
        id: `${opportunity.id}-eligibility`,
        title: 'Review every eligibility requirement and confirm your team qualifies',
        completed: false
      },
      {
        id: `${opportunity.id}-deadline`,
        title: opportunity.key_dates.application_close
          ? `Schedule submission ahead of ${new Date(opportunity.key_dates.application_close).toLocaleDateString()}`
          : 'Schedule submission reminder',
        completed: false
      }
    ];

    setApplicationPlans((prev) => ({
      ...prev,
      [opportunity.id]: [...supplementalTasks, ...baseTasks]
    }));
    toast.success('Application checklist ready!', { description: 'Track your progress as you complete each step.' });
  };

  const handleToggleTask = (opportunityId: string, taskId: string) => {
    setApplicationPlans((prev) => {
      const tasks = prev[opportunityId];
      if (!tasks) return prev;

      return {
        ...prev,
        [opportunityId]: tasks.map((task) =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
        )
      };
    });
  };

  if (loading && opportunities.length === 0) {
    return (
      <section className="py-20 px-4 relative overflow-hidden" data-section="opportunities">
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-6">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight pb-2">
                Funding Opportunities
              </h2>
              <span className="text-4xl md:text-5xl">💰</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mt-2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error && opportunities.length === 0) {
    return (
      <section className="py-20 px-4 relative overflow-hidden" data-section="opportunities">
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Unable to load funding opportunities. Please try again later.</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4 relative overflow-hidden" data-section="opportunities">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        <div
          className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(56, 189, 248, 0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(192, 132, 252, 0.35), transparent 55%)',
            animationDuration: '28s'
          }}
        />
        <div className="absolute top-24 left-1/4 w-80 h-80 rounded-full bg-primary/15 blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-20 right-1/5 w-72 h-72 rounded-full bg-secondary/20 blur-3xl animate-pulse" style={{ animationDuration: '7.5s' }} />
        <div className="absolute top-1/3 right-[38%] w-64 h-64 rounded-full bg-accent/15 blur-3xl animate-ping" style={{ animationDuration: '9s' }} />
        <div
          className="absolute inset-0 opacity-20 animate-[spin_32s_linear_infinite]"
          style={{
            backgroundImage:
              'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.12) 25%, transparent 25%, transparent 50%, rgba(99,102,241,0.12) 50%, rgba(99,102,241,0.12) 75%, transparent 75%, transparent)',
            backgroundSize: '220px 220px',
            animationDuration: '32s'
          }}
        />
        <svg className="absolute inset-0 w-full h-full opacity-[0.18]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="funding-dots" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="2" fill="rgba(59,130,246,0.18)">
                <animate attributeName="opacity" values="0.35;0.7;0.35" dur="4s" repeatCount="indefinite" />
              </circle>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#funding-dots)" />
        </svg>
      </div>

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-6">
            <Sparkles className="h-6 w-6 text-primary" />
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight pb-2">
              Funding Opportunities
            </h2>
            <span className="text-4xl md:text-5xl">💰</span>
          </div>
          <p className="text-muted-foreground text-lg mt-4">
            Find grants, accelerators, contests, and microfunds tailored to creative founders ready to launch.
          </p>
        </div>

        <FundingFilters
          filters={filterState}
          onFiltersChange={handleFiltersChange}
          availableLocations={availableLocations}
          resultCount={opportunities.length}
        />

        {opportunities.length > 0 ? (
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4 space-y-4">
              {opportunities.map((opportunity) => (
                <FundingOpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onSelect={(selected) => setSelectedOpportunityId(selected.id)}
                  isActive={opportunity.id === selectedOpportunityId}
                />
              ))}
            </div>

            <div className="lg:col-span-8">
              {selectedOpportunity ? (
                <OpportunityDetail
                  opportunity={selectedOpportunity}
                  onApply={generateTasksForOpportunity}
                  tasks={applicationPlans[selectedOpportunity.id]}
                  onToggleTask={handleToggleTask}
                />
              ) : (
                <Card className="border-dashed border-2 border-border/60">
                  <CardContent className="py-16 text-center text-muted-foreground">
                    Select an opportunity to see tailored application guidance.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-2">No funding opportunities found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters to see more results
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default FundingOpportunitiesSection;
