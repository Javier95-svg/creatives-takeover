import type { ReactNode, RefObject } from "react";

import { Badge } from "@/components/ui/badge";
import type { IcpDraftDocument } from "@/lib/icpBuilderSession";

interface IcpFolioDocumentProps {
  draft: IcpDraftDocument;
  documentRef?: RefObject<HTMLDivElement>;
  topBar?: ReactNode;
  bottomBar?: ReactNode;
  footer?: ReactNode;
  blurred?: boolean;
  className?: string;
  tone?: "folio" | "platformPreview";
}

function FeatureIndex({ index, tone }: { index: number; tone: "folio" | "platformPreview" }) {
  const classes =
    tone === "platformPreview"
      ? "border-border/60 bg-white/70 text-foreground shadow-sm backdrop-blur dark:bg-slate-900/70"
      : "border-slate-300 bg-slate-50 text-slate-900";

  return (
    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-sm font-semibold ${classes}`}>
      {String(index + 1).padStart(2, "0")}
    </div>
  );
}

export function IcpFolioDocument({
  draft,
  documentRef,
  topBar,
  bottomBar,
  footer,
  blurred = false,
  className = "",
  tone = "folio",
}: IcpFolioDocumentProps) {
  const isPlatformPreview = tone === "platformPreview";

  const wrapperClasses = isPlatformPreview
    ? "min-h-[max(42rem,100vh)] bg-transparent px-3 pb-12 pt-6 text-foreground sm:px-6 lg:px-8"
    : "min-h-screen bg-[#f6f7fb] px-4 pb-12 pt-8 text-slate-950 sm:px-6 lg:px-8";

  const contentClasses = blurred ? "pointer-events-none select-none blur-[16px]" : "";
  const sectionClasses = isPlatformPreview
    ? "rounded-[2rem] border border-border/60 bg-white/60 p-6 shadow-[0_28px_90px_-50px_rgba(15,23,42,0.5)] backdrop-blur-xl dark:bg-slate-950/60 sm:p-8"
    : "rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.35)] sm:p-8";
  const sectionLabelClasses = isPlatformPreview ? "text-muted-foreground" : "text-slate-400";
  const headingBodyClasses = isPlatformPreview ? "text-foreground/85" : "text-slate-800";
  const metaClasses = isPlatformPreview ? "text-muted-foreground" : "text-slate-500";
  const insetSurfaceClasses = isPlatformPreview
    ? "rounded-[1.5rem] border border-border/50 bg-white/70 p-5 text-base leading-7 text-muted-foreground backdrop-blur dark:bg-slate-900/70"
    : "rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-base leading-7 text-slate-700";
  const tileClasses = isPlatformPreview
    ? "rounded-[1.4rem] border border-border/50 bg-white/70 p-5 backdrop-blur dark:bg-slate-900/70"
    : "rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5";
  const tileTitleClasses = isPlatformPreview ? "text-foreground" : "text-slate-900";
  const tileBodyClasses = isPlatformPreview ? "text-muted-foreground" : "text-slate-600";
  const mutedTitleClasses = isPlatformPreview ? "text-foreground/85" : "text-slate-900";
  const mutedBodyClasses = isPlatformPreview ? "text-muted-foreground" : "text-slate-600";
  const chipClasses = isPlatformPreview
    ? "rounded-full border-border/60 bg-white/70 px-4 py-2 text-sm font-medium text-foreground/80 backdrop-blur dark:bg-slate-900/70"
    : "rounded-full border-slate-300 px-4 py-2 text-sm font-medium text-slate-700";
  const moatBadgeClasses = isPlatformPreview
    ? "rounded-full bg-[#dff8fb] px-4 py-2 text-sm font-semibold text-[#0f5b64] hover:bg-[#dff8fb] dark:bg-[#0f5b64]/25 dark:text-[#8fe6ef]"
    : "rounded-full bg-[#e6f7fa] px-4 py-2 text-sm font-semibold text-[#0f5b64] hover:bg-[#e6f7fa]";

  return (
    <div className={`${wrapperClasses} ${className}`}>
      <div className={`mx-auto w-full max-w-6xl space-y-6 ${contentClasses}`} ref={documentRef}>
        {topBar}

        <section className={sectionClasses}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#32b8c6]">Your Ideal Customer</p>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-[2rem]">{draft.customer.personaName}</h1>
              <p className={`mt-2 text-lg ${headingBodyClasses}`}>{draft.customer.roleLine}</p>
              {draft.customer.metaLine ? <p className={`mt-1 text-sm ${metaClasses}`}>{draft.customer.metaLine}</p> : null}
            </div>
            <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${sectionLabelClasses}`}>Section 1</p>
          </div>

          <div className={`mt-6 ${insetSurfaceClasses}`}>{draft.customer.summary}</div>

          {draft.customer.whereToFind.length > 0 ? (
            <div className="mt-6 space-y-3">
              <p className={`text-sm font-medium ${metaClasses}`}>Where to find them</p>
              <div className="flex flex-wrap gap-3">
                {draft.customer.whereToFind.map((item) => (
                  <Badge key={item} variant="outline" className={chipClasses}>
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className={sectionClasses}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#32b8c6]">Core Pain Point</p>
              <p className={`mt-5 max-w-4xl text-xl italic leading-8 sm:text-2xl ${headingBodyClasses}`}>"{draft.pain.quote}"</p>
            </div>
            <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${sectionLabelClasses}`}>Section 2</p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className={tileClasses}>
              <p className={`text-sm font-semibold ${tileTitleClasses}`}>Root cause</p>
              <p className={`mt-3 text-sm leading-6 ${tileBodyClasses}`}>{draft.pain.rootCause}</p>
            </div>
            <div className={tileClasses}>
              <p className={`text-sm font-semibold ${tileTitleClasses}`}>Why it hurts</p>
              <p className={`mt-3 text-sm leading-6 ${tileBodyClasses}`}>{draft.pain.whyItHurts}</p>
            </div>
            <div className={tileClasses}>
              <p className={`text-sm font-semibold ${tileTitleClasses}`}>Trigger moment</p>
              <p className={`mt-3 text-sm leading-6 ${tileBodyClasses}`}>{draft.pain.triggerMoment}</p>
            </div>
          </div>
        </section>

        <section className={sectionClasses}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#32b8c6]">What You're Building</p>
              <p className={`mt-5 text-lg font-semibold leading-8 ${mutedTitleClasses}`}>{draft.build.valueProposition}</p>
              {draft.build.replaces.length > 0 ? (
                <p className={`mt-3 text-sm ${metaClasses}`}>Replaces: {draft.build.replaces.join(" + ")}</p>
              ) : null}
            </div>
            <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${sectionLabelClasses}`}>Section 3</p>
          </div>

          <div className="mt-8 space-y-4">
            {draft.build.coreFeatures.map((feature, index) => (
              <div key={`${feature.title}-${index}`} className="flex items-start gap-4">
                <FeatureIndex index={index} tone={tone} />
                <div className="pt-1">
                  <p className={`text-sm font-semibold ${mutedTitleClasses}`}>{feature.title}</p>
                  <p className={`mt-1 text-sm leading-6 ${mutedBodyClasses}`}>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {draft.build.outcome ? <p className={`mt-8 text-sm font-medium ${headingBodyClasses}`}>Outcome: "{draft.build.outcome}"</p> : null}
        </section>

        <section className={sectionClasses}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#32b8c6]">Your Startup Moat</p>
              <div className="mt-5">
                <Badge className={moatBadgeClasses}>{draft.moat.moatType}</Badge>
              </div>
            </div>
            <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${sectionLabelClasses}`}>Section 4</p>
          </div>

          <div className="mt-8 grid gap-6">
            <div>
              <p className={`text-sm font-semibold ${mutedTitleClasses}`}>Your edge</p>
              <p className={`mt-3 text-sm leading-6 ${mutedBodyClasses}`}>{draft.moat.edge}</p>
            </div>
            <div>
              <p className={`text-sm font-semibold ${mutedTitleClasses}`}>Why incumbents miss it</p>
              <p className={`mt-3 text-sm leading-6 ${mutedBodyClasses}`}>{draft.moat.incumbentGap}</p>
            </div>
            {draft.moat.startupsToStudy.length > 0 ? (
              <div>
                <p className={`text-sm font-semibold ${mutedTitleClasses}`}>Startups to study</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {draft.moat.startupsToStudy.map((company) =>
                    company.url ? (
                      <a
                        key={`${company.name}-${company.url}`}
                        href={company.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:border-[#32b8c6] hover:text-[#0f5b64] ${
                          isPlatformPreview ? "border-border/60 bg-white/70 text-foreground/80 backdrop-blur dark:bg-slate-900/70" : "border-slate-300 text-slate-700"
                        }`}
                      >
                        {company.name}
                      </a>
                    ) : (
                      <Badge key={company.name} variant="outline" className={chipClasses}>
                        {company.name}
                      </Badge>
                    ),
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {bottomBar}
        {footer}
      </div>
    </div>
  );
}
