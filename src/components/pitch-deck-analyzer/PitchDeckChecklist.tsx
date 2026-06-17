import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, AlertTriangle, XCircle } from "lucide-react";

interface DeckSlide {
  title: string;
  cover: string;
  want: string;
}

// The slide order investors expect, with the one thing they're actually scanning
// for on each slide. Written to double as a build-it checklist.
const SLIDES: DeckSlide[] = [
  {
    title: "Problem",
    cover: "The specific, painful problem you solve — and exactly who has it.",
    want: "A real problem they recognize in seconds, not a vague 'market gap.'",
  },
  {
    title: "Solution",
    cover: "How you solve it, in one sentence a non-expert could repeat back.",
    want: "Clarity. If they can't explain it after one slide, it's too complex.",
  },
  {
    title: "Market Size",
    cover: "How big this gets — TAM / SAM / SOM, built bottom-up where you can.",
    want: "A credible path to a huge market, not 'just 1% of a $50B market.'",
  },
  {
    title: "Product",
    cover: "What it actually does — a screenshot, short demo, or how-it-works.",
    want: "Proof it's real and people would use it. Show, don't describe.",
  },
  {
    title: "Business Model",
    cover: "How you make money — pricing and who pays.",
    want: "A model that scales, with margins that make sense.",
  },
  {
    title: "Traction",
    cover: "Proof people want this — revenue, users, growth, retention, signed LOIs.",
    want: "Evidence over promises. A chart going up and to the right beats adjectives.",
  },
  {
    title: "Competition & Why Now",
    cover: "Who else solves this, your real edge, and why this moment matters.",
    want: "Honest positioning plus a defensible reason you win — starting now.",
  },
  {
    title: "Team",
    cover: "Who you are and why you're the ones to build this.",
    want: "Founder–market fit: why you, why this, why you won't quit.",
  },
  {
    title: "Financials",
    cover: "Where you are today and a simple 18–36 month projection.",
    want: "Realistic numbers that show you understand your own economics.",
  },
  {
    title: "The Ask",
    cover: "How much you're raising and exactly what it buys.",
    want: "A clear number tied to milestones — what this round actually unlocks.",
  },
];

const MISTAKES: string[] = [
  "Burying the problem — investors should get it in the first 30 seconds.",
  "No traction slide, or hiding weak numbers inside a wall of text.",
  "Top-down market math ('we only need 1% of a giant market').",
  "Too many words per slide — if they're reading, they've stopped listening.",
  "A vague ask with no clear use of funds.",
  "Big claims with zero evidence — one unbacked number sinks your credibility.",
];

export function PitchDeckChecklist() {
  return (
    <section aria-labelledby="pitch-deck-checklist-heading" className="mt-12">
      <Card className="border-2 border-primary/10">
        <CardHeader>
          <CardTitle id="pitch-deck-checklist-heading" className="text-2xl flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            What should you include in your pitch deck?
          </CardTitle>
          <CardDescription>
            The 10 slides investors expect, in order. Use it as a checklist while you build —
            most decks get rejected for what's missing, not what's wrong.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {SLIDES.map((slide, index) => (
            <div
              key={slide.title}
              className="flex gap-3 rounded-xl border border-border/60 bg-card p-4"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {index + 1}
              </div>
              <div className="space-y-1">
                <p className="font-semibold">{slide.title}</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Cover:</span> {slide.cover}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Investors want:</span> {slide.want}
                </p>
              </div>
            </div>
          ))}

          <div className="mt-4 rounded-xl border border-warning bg-warning-subtle p-4 dark:bg-warning/20">
            <p className="flex items-center gap-2 font-semibold text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Common mistakes that get decks rejected
            </p>
            <ul className="mt-2 space-y-1.5">
              {MISTAKES.map((mistake) => (
                <li key={mistake} className="flex gap-2 text-sm text-muted-foreground">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <span>{mistake}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
