import { useState, useEffect } from "react";
import GuideLayout from "@/components/guides/GuideLayout";
import GuideSection from "@/components/guides/GuideSection";
import { CheckSquare, Target, FileText, Search, Calendar, Handshake, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ChecklistItem {
  id: string;
  task: string;
  description: string;
}

interface ChecklistPhase {
  phase: string;
  icon: any;
  estimatedTime: string;
  items: ChecklistItem[];
}

const FundraisingChecklistGuide = () => {
  const checklistPhases: ChecklistPhase[] = [
    {
      phase: "Define Funding Need",
      icon: Target,
      estimatedTime: "1-2 weeks",
      items: [
        {
          id: "funding-1",
          task: "Calculate how much capital you need",
          description: "Include 18-24 months of runway plus growth initiatives",
        },
        {
          id: "funding-2",
          task: "Determine what you'll use the funds for",
          description: "Break down allocation: hiring, marketing, product, operations",
        },
        {
          id: "funding-3",
          task: "Decide what type of funding makes sense",
          description: "Equity vs. non-dilutive, stage-appropriate sources",
        },
        {
          id: "funding-4",
          task: "Set fundraising goal and timeline",
          description: "Target close date and milestones along the way",
        },
      ],
    },
    {
      phase: "Build Pitch & Story",
      icon: FileText,
      estimatedTime: "2-3 weeks",
      items: [
        {
          id: "pitch-1",
          task: "Create compelling pitch deck (10-15 slides)",
          description: "Problem, solution, market, traction, team, ask",
        },
        {
          id: "pitch-2",
          task: "Develop 30-second elevator pitch",
          description: "Memorize crisp version for quick intros",
        },
        {
          id: "pitch-3",
          task: "Write executive summary / one-pager",
          description: "1-page PDF overview of your company and opportunity",
        },
        {
          id: "pitch-4",
          task: "Build financial model with projections",
          description: "3-5 year forecast with assumptions documented",
        },
        {
          id: "pitch-5",
          task: "Practice pitch with mentors/advisors",
          description: "Get feedback and refine messaging",
        },
      ],
    },
    {
      phase: "Prepare Documents",
      icon: FileText,
      estimatedTime: "1-2 weeks",
      items: [
        {
          id: "docs-1",
          task: "Set up data room (Google Drive or Dropbox)",
          description: "Organized folders for due diligence materials",
        },
        {
          id: "docs-2",
          task: "Gather incorporation documents",
          description: "Certificate of incorporation, bylaws, cap table",
        },
        {
          id: "docs-3",
          task: "Compile financial statements",
          description: "P&L, balance sheet, cash flow (if applicable)",
        },
        {
          id: "docs-4",
          task: "Document IP and legal agreements",
          description: "Patents, trademarks, customer contracts, employee agreements",
        },
        {
          id: "docs-5",
          task: "Prepare product demo or screenshots",
          description: "Show your product in action",
        },
      ],
    },
    {
      phase: "Research & Connect with Investors",
      icon: Search,
      estimatedTime: "3-4 weeks",
      items: [
        {
          id: "research-1",
          task: "Build target list of 50-100 investors",
          description: "VCs, angels, syndicates relevant to your stage/sector",
        },
        {
          id: "research-2",
          task: "Research each investor's portfolio and thesis",
          description: "Ensure good fit before reaching out",
        },
        {
          id: "research-3",
          task: "Identify warm introduction paths",
          description: "Find mutual connections via LinkedIn, advisors, portfolio founders",
        },
        {
          id: "research-4",
          task: "Draft personalized outreach emails",
          description: "Customize for each investor showing you've done homework",
        },
        {
          id: "research-5",
          task: "Send intro requests and cold emails",
          description: "Batch outreach to 10-20 investors per week",
        },
      ],
    },
    {
      phase: "Schedule Meetings & Follow-ups",
      icon: Calendar,
      estimatedTime: "4-8 weeks",
      items: [
        {
          id: "meetings-1",
          task: "Book first calls with interested investors",
          description: "Aim for 15-20 minute intro calls",
        },
        {
          id: "meetings-2",
          task: "Deliver pitch in first meetings",
          description: "2-minute pitch + Q&A, listen to their concerns",
        },
        {
          id: "meetings-3",
          task: "Send follow-up materials promptly",
          description: "Deck, one-pager, answers to their questions",
        },
        {
          id: "meetings-4",
          task: "Secure partner meetings",
          description: "Present to full partnership or investment committee",
        },
        {
          id: "meetings-5",
          task: "Track all conversations in spreadsheet",
          description: "Status, next steps, interest level for each investor",
        },
        {
          id: "meetings-6",
          task: "Keep momentum with weekly updates",
          description: "Share traction milestones to maintain interest",
        },
      ],
    },
    {
      phase: "Negotiate & Close Deal",
      icon: Handshake,
      estimatedTime: "3-6 weeks",
      items: [
        {
          id: "close-1",
          task: "Receive and review term sheets",
          description: "Compare valuation, terms, investor fit",
        },
        {
          id: "close-2",
          task: "Negotiate key terms with lawyer",
          description: "Valuation, board seats, liquidation preference, etc.",
        },
        {
          id: "close-3",
          task: "Sign term sheet with lead investor",
          description: "Non-binding agreement on key terms",
        },
        {
          id: "close-4",
          task: "Complete due diligence requests",
          description: "Provide documents, references, answer deep questions",
        },
        {
          id: "close-5",
          task: "Review and sign legal documents",
          description: "Stock purchase agreement, investor rights, etc.",
        },
        {
          id: "close-6",
          task: "Receive wire transfer and announce funding",
          description: "Celebrate, share news, get back to building!",
        },
      ],
    },
  ];

  const [completedTasks, setCompletedTasks] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("fundraising-checklist");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    localStorage.setItem("fundraising-checklist", JSON.stringify([...completedTasks]));
  }, [completedTasks]);

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const resetChecklist = () => {
    if (confirm("Are you sure you want to reset your entire checklist? This cannot be undone.")) {
      setCompletedTasks(new Set());
      localStorage.removeItem("fundraising-checklist");
    }
  };

  const totalTasks = checklistPhases.reduce((sum, phase) => sum + phase.items.length, 0);
  const completedCount = completedTasks.size;
  const progressPercentage = (completedCount / totalTasks) * 100;

  return (
    <GuideLayout
      title="Fundraising Checklist & Roadmap"
      description="A step-by-step interactive checklist to guide you from defining your funding needs to closing your deal."
      breadcrumbs={[{ name: "Fundraising Checklist", url: "/insighta/fundraising-checklist" }]}
      seoKeywords="fundraising checklist, startup fundraising, raise capital, funding roadmap"
    >
      {/* Progress Overview */}
      <div className="mb-8 p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold">Your Progress</h3>
            <p className="text-muted-foreground">
              {completedCount} of {totalTasks} tasks completed
            </p>
          </div>
          <Button onClick={resetChecklist} variant="outline" size="sm" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
        <Progress value={progressPercentage} className="h-3" />
        <p className="text-sm text-muted-foreground mt-2">
          {progressPercentage.toFixed(0)}% complete
        </p>
      </div>

      <GuideSection id="overview" title="How to Use This Checklist" icon={CheckSquare}>
        <p className="mb-4">
          This interactive checklist breaks down the fundraising process into 6 phases with actionable 
          tasks. Check off items as you complete them—your progress is saved automatically.
        </p>
        <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 p-4">
          <p className="text-sm">
            <strong>💡 Tip:</strong> Fundraising typically takes 3-6 months. Be patient, stay organized, 
            and don't let it distract from building your business.
          </p>
        </div>
      </GuideSection>

      {/* Checklist Phases */}
      <div className="space-y-8 mt-12">
        {checklistPhases.map((phase, phaseIndex) => {
          const Icon = phase.icon;
          const phaseCompleted = phase.items.filter((item) => completedTasks.has(item.id)).length;
          const phaseProgress = (phaseCompleted / phase.items.length) * 100;

          return (
            <Card key={phaseIndex} className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">
                        Phase {phaseIndex + 1}: {phase.phase}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Estimated time: {phase.estimatedTime}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {phaseCompleted}/{phase.items.length}
                    </p>
                    <p className="text-xs text-muted-foreground">completed</p>
                  </div>
                </div>
                <Progress value={phaseProgress} className="mt-4 h-2" />
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {phase.items.map((item) => {
                    const isCompleted = completedTasks.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                          isCompleted
                            ? "bg-primary/5 border-primary/20"
                            : "bg-background hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={() => toggleTask(item.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p
                            className={`font-semibold ${
                              isCompleted ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {item.task}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Completion Message */}
      {completedCount === totalTasks && (
        <div className="mt-12 p-8 bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/20 rounded-lg text-center">
          <h3 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
            🎉 Congratulations!
          </h3>
          <p className="text-lg mb-4">
            You've completed all fundraising checklist tasks. You're ready to close your round!
          </p>
          <p className="text-sm text-muted-foreground">
            Don't forget to celebrate this milestone with your team. Now get back to building!
          </p>
        </div>
      )}
    </GuideLayout>
  );
};

export default FundraisingChecklistGuide;
