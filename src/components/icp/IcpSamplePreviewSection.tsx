import React, { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  CircleHelp,
  Layers3,
  MessageSquareQuote,
  Sparkles,
  Target,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  SAMPLE_ICP_PREVIEW_DATA,
  type IcpSamplePreviewMode,
  type IcpSampleSectionKey,
  type IcpSampleTooltipCopy,
} from "@/components/icp/sampleIcpPreviewData";

interface IcpSamplePreviewSectionProps {
  onSelectFastMode: () => void;
  onSelectGuidedMode: () => void;
  modeSelectorId: string;
}

function FieldExplainer({
  label,
  copy,
  mode,
}: {
  label: string;
  copy: IcpSampleTooltipCopy;
  mode: IcpSamplePreviewMode;
}) {
  const content = (
    <div className="space-y-2 text-left">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#32b8c6]">What it is</p>
        <p className="mt-1 text-sm leading-6">{copy.what}</p>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#32b8c6]">Why it matters</p>
        <p className="mt-1 text-sm leading-6">{copy.why}</p>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#32b8c6]">How this was derived</p>
        <p className="mt-1 text-sm leading-6">{copy.how[mode]}</p>
      </div>
    </div>
  );

  return (
    <span className="inline-flex items-center gap-2">
      <span>{label}</span>
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hidden h-5 w-5 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-[#32b8c6]/40 hover:text-foreground md:inline-flex"
              aria-label={`Explain ${label}`}
            >
              <CircleHelp className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="hidden max-w-sm rounded-2xl border-border/60 bg-background/95 p-4 shadow-xl md:block">
            {content}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-[#32b8c6]/40 hover:text-foreground md:hidden"
            aria-label={`Explain ${label}`}
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl border-border/60 bg-background/95 p-4 shadow-xl">
          {content}
        </PopoverContent>
      </Popover>
    </span>
  );
}

function AnnotationBlock({
  sectionKey,
  mode,
}: {
  sectionKey: IcpSampleSectionKey;
  mode: IcpSamplePreviewMode;
}) {
  const annotation = SAMPLE_ICP_PREVIEW_DATA.sections[sectionKey];

  return (
    <div className="rounded-[1.5rem] border border-[#32b8c6]/20 bg-[#32b8c6]/8 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0f5b64] dark:text-[#8fe6ef]">
        {annotation.eyebrow}
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-foreground">What it is</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{annotation.what}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Why it matters</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{annotation.why}</p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-foreground">How this was derived</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{annotation.how[mode]}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Confidence</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{annotation.confidence[mode]}</p>
        </div>
      </div>
      {annotation.missingSignal?.[mode] ? (
        <div className="mt-3 rounded-[1.15rem] border border-amber-500/25 bg-amber-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Need to sharpen</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{annotation.missingSignal[mode]}</p>
        </div>
      ) : null}
    </div>
  );
}

export function IcpSamplePreviewSection({
  onSelectFastMode,
  onSelectGuidedMode,
  modeSelectorId,
}: IcpSamplePreviewSectionProps) {
  const [mode, setMode] = useState<IcpSamplePreviewMode>("fast");
  const [openSections, setOpenSections] = useState<string[]>(["overview"]);
  const sectionRefs = useRef<Partial<Record<IcpSampleSectionKey, HTMLDivElement | null>>>({});

  const draft = SAMPLE_ICP_PREVIEW_DATA.draftByMode[mode];
  const modeMeta = SAMPLE_ICP_PREVIEW_DATA.modePresentation[mode];

  const sections = useMemo(
    () => [
      {
        key: "overview" as const,
        icon: Building2,
        title: "1. Company Overview / Target Segment",
        summary: draft.customer.summary,
        content: (
          <div className="space-y-5">
            <AnnotationBlock sectionKey="overview" mode={mode} />

            <div className="rounded-[1.5rem] border border-border/60 bg-white/70 p-5 backdrop-blur dark:bg-slate-900/70">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#32b8c6]">Sample company context</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{SAMPLE_ICP_PREVIEW_DATA.companyContext}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[1.5rem] border border-border/60 bg-white/70 p-5 backdrop-blur dark:bg-slate-900/70">
                <p className="text-sm font-semibold text-foreground">
                  <FieldExplainer
                    label="Target segment"
                    copy={SAMPLE_ICP_PREVIEW_DATA.tooltips.targetSegment}
                    mode={mode}
                  />
                </p>
                <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">{draft.customer.personaName}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{draft.customer.roleLine}</p>
                <p className="mt-3 rounded-[1rem] border border-border/50 bg-background/80 px-4 py-3 text-sm leading-6 text-muted-foreground">
                  {draft.customer.metaLine}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-border/60 bg-white/70 p-5 backdrop-blur dark:bg-slate-900/70">
                <p className="text-sm font-semibold text-foreground">
                  <FieldExplainer
                    label="Firmographics"
                    copy={SAMPLE_ICP_PREVIEW_DATA.tooltips.firmographics}
                    mode={mode}
                  />
                </p>
                <div className="mt-3 space-y-3">
                  {SAMPLE_ICP_PREVIEW_DATA.firmographics.map((item) => (
                    <div key={item.label} className="rounded-[1rem] border border-border/50 bg-background/80 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "buyer" as const,
        icon: Target,
        title: "2. Buyer Persona, Motivations, and Channels",
        summary: `${draft.customer.triggerContext} ${draft.customer.actionTrigger}`,
        content: (
          <div className="space-y-5">
            <AnnotationBlock sectionKey="buyer" mode={mode} />

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-[1.5rem] border border-border/60 bg-white/70 p-5 backdrop-blur dark:bg-slate-900/70">
                <p className="text-sm font-semibold text-foreground">
                  <FieldExplainer
                    label="Buyer persona"
                    copy={SAMPLE_ICP_PREVIEW_DATA.tooltips.buyerPersona}
                    mode={mode}
                  />
                </p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  {draft.customer.behaviors.map((item) => (
                    <p key={item}>- {item}</p>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-border/60 bg-white/70 p-5 backdrop-blur dark:bg-slate-900/70">
                <p className="text-sm font-semibold text-foreground">
                  <FieldExplainer
                    label="Psychographics & motivations"
                    copy={SAMPLE_ICP_PREVIEW_DATA.tooltips.psychographics}
                    mode={mode}
                  />
                </p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  {SAMPLE_ICP_PREVIEW_DATA.psychographics.map((item) => (
                    <p key={item}>- {item}</p>
                  ))}
                  {draft.customer.motivations.map((item) => (
                    <p key={item}>- {item}</p>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-[1.5rem] border border-border/60 bg-white/70 p-5 backdrop-blur dark:bg-slate-900/70">
                <p className="text-sm font-semibold text-foreground">
                  <FieldExplainer
                    label="Buying triggers"
                    copy={SAMPLE_ICP_PREVIEW_DATA.tooltips.buyingTriggers}
                    mode={mode}
                  />
                </p>
                <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">Trigger context:</span> {draft.customer.triggerContext}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Why they act now:</span> {draft.customer.actionTrigger}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-border/60 bg-white/70 p-5 backdrop-blur dark:bg-slate-900/70">
                <p className="text-sm font-semibold text-foreground">
                  <FieldExplainer
                    label="Preferred channels"
                    copy={SAMPLE_ICP_PREVIEW_DATA.tooltips.preferredChannels}
                    mode={mode}
                  />
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {draft.customer.whereToFind.map((item) => (
                    <Badge key={item} variant="outline" className="rounded-full border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground/85">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "pain" as const,
        icon: MessageSquareQuote,
        title: "3. Pain Points and Challenges",
        summary: draft.pain.quote,
        content: (
          <div className="space-y-5">
            <AnnotationBlock sectionKey="pain" mode={mode} />

            <div className="rounded-[1.5rem] border border-border/60 bg-white/70 p-5 backdrop-blur dark:bg-slate-900/70">
              <p className="text-sm font-semibold text-foreground">
                <FieldExplainer
                  label="Pain points"
                  copy={SAMPLE_ICP_PREVIEW_DATA.tooltips.painPoints}
                  mode={mode}
                />
              </p>
              <p className="mt-3 text-lg italic leading-8 text-foreground">"{draft.pain.quote}"</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Root cause", value: draft.pain.rootCause },
                { label: "Why it hurts", value: draft.pain.whyItHurts },
                { label: "Trigger moment", value: draft.pain.triggerMoment },
                { label: "Cost of inaction", value: draft.pain.costOfInaction },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.4rem] border border-border/60 bg-white/70 p-5 backdrop-blur dark:bg-slate-900/70">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        key: "value" as const,
        icon: Sparkles,
        title: "4. Goals, Desired Outcomes, and Value",
        summary: draft.build.valueProposition,
        content: (
          <div className="space-y-5">
            <AnnotationBlock sectionKey="value" mode={mode} />

            <div className="rounded-[1.5rem] border border-border/60 bg-white/70 p-5 backdrop-blur dark:bg-slate-900/70">
              <p className="text-sm font-semibold text-foreground">
                <FieldExplainer
                  label="Goals & outcomes"
                  copy={SAMPLE_ICP_PREVIEW_DATA.tooltips.goals}
                  mode={mode}
                />
              </p>
              <p className="mt-3 text-lg leading-8 text-foreground">{draft.build.valueProposition}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                <span className="font-semibold text-foreground">Outcome:</span> {draft.build.outcome}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                <span className="font-semibold text-foreground">Replaces:</span> {draft.build.replaces.join(", ")}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-[1.5rem] border border-border/60 bg-white/70 p-5 backdrop-blur dark:bg-slate-900/70">
                <p className="text-sm font-semibold text-foreground">Recommended build direction</p>
                <div className="mt-4 space-y-4">
                  {draft.build.coreFeatures.map((feature, index) => (
                    <div key={feature.title} className="flex gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/80 text-sm font-semibold text-foreground">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{feature.title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-border/60 bg-white/70 p-5 backdrop-blur dark:bg-slate-900/70">
                <p className="text-sm font-semibold text-foreground">
                  <FieldExplainer
                    label="Success metrics"
                    copy={SAMPLE_ICP_PREVIEW_DATA.tooltips.successMetrics}
                    mode={mode}
                  />
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SAMPLE_ICP_PREVIEW_DATA.successMetrics.map((item) => (
                    <Badge key={item} variant="outline" className="rounded-full border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                      {item}
                    </Badge>
                  ))}
                </div>

                <div className="mt-5 rounded-[1.15rem] border border-border/50 bg-background/80 p-4">
                  <p className="text-sm font-semibold text-foreground">Suggested next moves</p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                    {draft.nextActions.map((action) => (
                      <p key={action.title}>- {action.title}: {action.description}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "competition" as const,
        icon: Layers3,
        title: "5. Competitive Context, Objections, and Barriers",
        summary: draft.competition.exploitableGap,
        content: (
          <div className="space-y-5">
            <AnnotationBlock sectionKey="competition" mode={mode} />

            <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
              <div className="space-y-4 rounded-[1.5rem] border border-border/60 bg-white/70 p-5 backdrop-blur dark:bg-slate-900/70">
                <p className="text-sm font-semibold text-foreground">Competitive landscape</p>
                <p className="text-sm leading-6 text-muted-foreground">{draft.competition.summary}</p>
                {draft.competition.directCompetitors.map((competitor) => (
                  <div key={competitor.name} className="rounded-[1rem] border border-border/50 bg-background/80 p-4">
                    <p className="text-sm font-semibold text-foreground">{competitor.name}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      <span className="font-semibold text-foreground">What they do well:</span> {competitor.doesWell}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      <span className="font-semibold text-foreground">Gap:</span> {competitor.gap}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-border/60 bg-white/70 p-5 backdrop-blur dark:bg-slate-900/70">
                  <p className="text-sm font-semibold text-foreground">
                    <FieldExplainer
                      label="Objections & barriers"
                      copy={SAMPLE_ICP_PREVIEW_DATA.tooltips.objections}
                      mode={mode}
                    />
                  </p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                    {SAMPLE_ICP_PREVIEW_DATA.objections.map((item) => (
                      <p key={item}>- {item}</p>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-border/60 bg-white/70 p-5 backdrop-blur dark:bg-slate-900/70">
                  <p className="text-sm font-semibold text-foreground">Why this can still win</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{draft.moat.edge}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    <span className="font-semibold text-foreground">Gap to exploit:</span> {draft.competition.exploitableGap}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    <span className="font-semibold text-foreground">Why incumbents miss it:</span> {draft.moat.incumbentGap}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
      },
    ],
    [draft, mode],
  );

  const handleJumpToSection = (sectionKey: IcpSampleSectionKey) => {
    setOpenSections((current) =>
      current.includes(sectionKey) ? current : [...current, sectionKey],
    );

    window.requestAnimationFrame(() => {
      sectionRefs.current[sectionKey]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleScrollToModeSelector = () => {
    document.getElementById(modeSelectorId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <section className="mt-14 sm:mt-16" aria-labelledby="sample-icp-preview-heading">
      <div className="rounded-[2.5rem] border border-border/60 bg-white/80 p-6 shadow-[0_34px_120px_-70px_rgba(15,23,42,0.4)] backdrop-blur-xl dark:bg-slate-950/70 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full bg-[#dff8fb] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0f5b64] hover:bg-[#dff8fb] dark:bg-[#0f5b64]/25 dark:text-[#8fe6ef]">
                Sample ICP Preview
              </Badge>
              <Badge variant="outline" className="rounded-full border-border/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Illustrative
              </Badge>
            </div>
            <h2 id="sample-icp-preview-heading" className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              See the kind of draft you'll walk away with
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              Explore a realistic ICP before you choose Fast or Guided. Every section is fully visible so you know exactly what this tool produces.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-border/60 bg-background/75 p-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              {(["fast", "guided"] as IcpSamplePreviewMode[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={cn(
                    "rounded-[1rem] px-4 py-3 text-left transition-colors",
                    mode === value
                      ? "bg-[#32b8c6] text-white shadow-sm"
                      : "bg-transparent text-foreground hover:bg-muted/60",
                  )}
                  aria-pressed={mode === value}
                >
                  <p className="text-sm font-semibold">{SAMPLE_ICP_PREVIEW_DATA.modePresentation[value].title}</p>
                  <p className={cn("mt-1 text-xs leading-5", mode === value ? "text-white/85" : "text-muted-foreground")}>
                    {SAMPLE_ICP_PREVIEW_DATA.modePresentation[value].helper}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] border border-border/60 bg-background/55 p-4 shadow-inner sm:p-6">
          <div className="grid gap-6 xl:grid-cols-[16rem_minmax(0,1fr)]">
            <aside className="hidden xl:block">
              <div className="sticky top-28 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#32b8c6]">Guided reading order</p>
                {SAMPLE_ICP_PREVIEW_DATA.callouts.map((callout) => (
                  <TooltipProvider key={callout.id} delayDuration={120}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleJumpToSection(callout.sectionKey)}
                          className="w-full rounded-[1.25rem] border border-border/60 bg-white/70 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-[#32b8c6]/40 hover:bg-white/90 dark:bg-slate-900/70"
                        >
                          {callout.label}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs rounded-2xl border-border/60 bg-background/95 p-4 shadow-xl">
                        <p className="text-sm leading-6">{callout.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </aside>

            <div className="space-y-6">
              <div className="xl:hidden">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#32b8c6]">Guided reading order</p>
                <div className="mt-3 flex flex-col gap-2">
                  {SAMPLE_ICP_PREVIEW_DATA.callouts.map((callout) => (
                    <button
                      key={callout.id}
                      type="button"
                      onClick={() => handleJumpToSection(callout.sectionKey)}
                      className="rounded-[1.15rem] border border-border/60 bg-white/70 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-[#32b8c6]/40 hover:bg-white/90 dark:bg-slate-900/70"
                    >
                      {callout.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-border/60 bg-white/70 p-5 shadow-[0_28px_90px_-50px_rgba(15,23,42,0.35)] backdrop-blur dark:bg-slate-950/70 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full bg-[#dff8fb] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0f5b64] hover:bg-[#dff8fb] dark:bg-[#0f5b64]/25 dark:text-[#8fe6ef]">
                        Live document preview
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-border/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {modeMeta.confidenceBadge}
                      </Badge>
                    </div>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#32b8c6]">Your Ideal Customer</p>
                    <h3 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{draft.customer.personaName}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{draft.customer.roleLine}</p>
                  </div>

                  <div className="rounded-[1.35rem] border border-border/60 bg-background/80 px-4 py-3 text-sm leading-6 text-muted-foreground lg:max-w-xs">
                    <p className="font-semibold text-foreground">{modeMeta.title}</p>
                    <p className="mt-1">{modeMeta.helper}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#32b8c6]">
                      {draft.confidence.summary}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-border/60 bg-background/80 p-5">
                  <p className="text-sm font-semibold text-foreground">Compact summary view</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{draft.customer.summary}</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[1rem] border border-border/50 bg-white/70 px-4 py-3 dark:bg-slate-900/70">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Core pain</p>
                      <p className="mt-1 text-sm leading-6 text-foreground">{draft.pain.quote}</p>
                    </div>
                    <div className="rounded-[1rem] border border-border/50 bg-white/70 px-4 py-3 dark:bg-slate-900/70">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Product angle</p>
                      <p className="mt-1 text-sm leading-6 text-foreground">{draft.build.valueProposition}</p>
                    </div>
                    <div className="rounded-[1rem] border border-border/50 bg-white/70 px-4 py-3 dark:bg-slate-900/70">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Next move</p>
                      <p className="mt-1 text-sm leading-6 text-foreground">{draft.nextActions[0]?.title}</p>
                    </div>
                  </div>
                </div>

                <Accordion
                  type="multiple"
                  value={openSections}
                  onValueChange={setOpenSections}
                  className="mt-6 space-y-4"
                >
                  {sections.map((section) => {
                    const Icon = section.icon;

                    return (
                      <AccordionItem
                        key={section.key}
                        value={section.key}
                        className="overflow-hidden rounded-[1.5rem] border border-border/60 bg-white/70 px-5 backdrop-blur dark:bg-slate-900/70"
                      >
                        <div ref={(node) => {
                          sectionRefs.current[section.key] = node;
                        }}>
                          <AccordionTrigger className="group py-5">
                            <div className="flex min-w-0 items-start gap-4 pr-4 text-left">
                              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/85 text-foreground">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">{section.title}</p>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">{section.summary}</p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-5">
                            {section.content}
                          </AccordionContent>
                        </div>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] border border-border/60 bg-[#0f172a] px-6 py-6 text-white shadow-[0_28px_90px_-55px_rgba(15,23,42,0.6)] sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fe6ef]">This is what you'll build</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight">Choose the path that matches how clearly you can describe your idea right now.</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Fast mode is better when you already have the startup described. Guided mode is better when you want the tool to pull the customer and pain out of you step by step.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end">
              <Button type="button" className="h-12 min-w-[200px] bg-white text-slate-950 hover:bg-white/90" onClick={onSelectFastMode}>
                Build mine in Fast Mode
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" className="h-12 min-w-[200px] border-white/20 bg-white/10 text-white hover:bg-white/15" onClick={onSelectGuidedMode}>
                Build mine in Guided Mode
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={handleScrollToModeSelector}
                className="inline-flex h-12 items-center justify-center rounded-full px-4 text-sm font-medium text-slate-200 transition-opacity hover:opacity-80"
              >
                Back to mode selector
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
