import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, NotebookPen } from "lucide-react";

export interface FounderMilestone {
  id: string;
  title: string;
  description: string;
  checklist: string[];
  nextAction: string;
  resources: Array<{ label: string; href: string }>;
}

interface FoundersProgressTrackerProps {
  milestones: FounderMilestone[];
  activeMilestoneId?: string | null;
  storageKey?: string;
  onMilestoneChange?: (milestoneId: string) => void;
}

const defaultStorageKey = "bizmap-founder-tracker";

const FoundersProgressTracker = ({
  milestones,
  activeMilestoneId,
  storageKey = defaultStorageKey,
  onMilestoneChange,
}: FoundersProgressTrackerProps) => {
  const [completed, setCompleted] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const activeId =
    activeMilestoneId ??
    completed[completed.length - 1] ??
    milestones[0]?.id;

  const activeIndex = milestones.findIndex((milestone) => milestone.id === activeId);
  const activeMilestone = activeIndex >= 0 ? milestones[activeIndex] : milestones[0];

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed.completed)) {
        setCompleted(parsed.completed);
      }
      if (parsed.notes && typeof parsed.notes === "object") {
        setNotes(parsed.notes);
      }
    } catch (error) {
      console.warn("Failed to parse stored tracker state", error);
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ completed, notes })
    );
  }, [completed, notes, storageKey]);

  const progressPercentage = useMemo(() => {
    if (!milestones.length) return 0;
    return Math.round((completed.length / milestones.length) * 100);
  }, [completed.length, milestones.length]);

  const handleComplete = (milestoneId: string) => {
    if (completed.includes(milestoneId)) return;
    const updated = [...completed, milestoneId];
    setCompleted(updated);
    onMilestoneChange?.(milestoneId);
  };

  const handleResume = () => {
    const next = milestones.find((milestone) => !completed.includes(milestone.id));
    if (next) {
      onMilestoneChange?.(next.id);
    }
  };

  const handleNoteChange = (milestoneId: string, value: string) => {
    setNotes((prev) => ({ ...prev, [milestoneId]: value }));
  };

  if (!activeMilestone) {
    return null;
  }

  return (
    <section
      className="mt-12 sm:mt-16 animate-fade-in"
      aria-labelledby="founder-progress-tracker"
    >
      <Card className="border-primary/20 bg-gradient-to-br from-background via-card/50 to-muted/30 overflow-hidden">
        <CardContent className="p-6 sm:p-8 lg:p-10">
          <header className="text-center mb-8">
            <h2
              id="founder-progress-tracker"
              className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent"
            >
              Founder’s Progress Tracker
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Break your journey into confident moves. Celebrate each milestone, capture your insights, and keep BizMap AI by your side.
            </p>
          </header>

          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Progress value={progressPercentage} className="w-48" />
              <Badge variant={progressPercentage === 100 ? "default" : "secondary"}>
                {progressPercentage === 100 ? "🚀 Momentum Locked In" : `${progressPercentage}% Complete`}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResume}
              disabled={completed.length === milestones.length}
              className="flex items-center gap-2"
            >
              <ChevronRight className="w-4 h-4" />
              {completed.length === milestones.length ? "Tracker Complete" : "Resume Next Milestone"}
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
            <aside className="space-y-2">
              {milestones.map((milestone, index) => {
                const isCompleted = completed.includes(milestone.id);
                const isActive = milestone.id === activeMilestone.id;
                return (
                  <button
                    key={milestone.id}
                    onClick={() => onMilestoneChange?.(milestone.id)}
                    className={`w-full text-left rounded-xl border transition-all duration-300 px-4 py-3 flex items-start gap-3 ${
                      isActive
                        ? "border-primary bg-primary/10 shadow-lg"
                        : "border-border/40 bg-background/60 hover:border-primary/40 hover:bg-primary/5"
                    } ${isCompleted ? "opacity-95" : ""}`}
                  >
                    <div
                      className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center border ${
                        isCompleted
                          ? "bg-primary text-primary-foreground border-primary shadow-primary/30"
                          : "border-primary/50 text-primary"
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                    </div>
                    <div>
                      <p className={`font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>
                        {milestone.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {milestone.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </aside>

            <div className="rounded-2xl border border-border/50 bg-background/90 shadow-inner p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  {activeMilestone.title}
                </h3>
                <p className="text-sm text-muted-foreground">{activeMilestone.description}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Your checklist
                </p>
                <ul className="space-y-2">
                  {activeMilestone.checklist.map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm">
                      <span className="mt-1 text-primary">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                <h4 className="text-sm font-semibold text-primary tracking-wide uppercase">
                  Next action from BizMap AI
                </h4>
                <p className="text-sm text-primary/90">{activeMilestone.nextAction}</p>
                <Button
                  onClick={() => handleComplete(activeMilestone.id)}
                  className="mt-2 w-max gap-2"
                >
                  Mark as Complete
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
                  <NotebookPen className="w-4 h-4" />
                  Personal reflections
                </label>
                <textarea
                  className="w-full rounded-xl border border-border/60 bg-card/60 p-3 text-sm focus-visible:ring-primary"
                  rows={4}
                  placeholder="Capture what you tested, what worked, or what you want to tackle next."
                  value={notes[activeMilestone.id] ?? ""}
                  onChange={(event) => handleNoteChange(activeMilestone.id, event.target.value)}
                />
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Support tools
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeMilestone.resources.map((resource) => (
                    <Button
                      key={resource.href}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => window.open(resource.href, "_blank", "noopener")}
                    >
                      {resource.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default FoundersProgressTracker;

