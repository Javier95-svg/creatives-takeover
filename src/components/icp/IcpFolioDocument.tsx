import type { RefObject, ReactNode } from "react";

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
}

function FeatureIndex({ index }: { index: number }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 text-sm font-semibold text-slate-900">
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
}: IcpFolioDocumentProps) {
  return (
    <div className={`min-h-screen bg-[#f6f7fb] px-4 pb-12 pt-8 text-slate-950 sm:px-6 lg:px-8 ${className}`}>
      <div className={`mx-auto w-full max-w-6xl space-y-6 ${blurred ? "select-none pointer-events-none blur-[14px]" : ""}`} ref={documentRef}>
        {topBar}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.35)] sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#32b8c6]">Your Ideal Customer</p>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-[2rem]">{draft.customer.personaName}</h1>
              <p className="mt-2 text-lg text-slate-800">{draft.customer.roleLine}</p>
              {draft.customer.metaLine ? (
                <p className="mt-1 text-sm text-slate-500">{draft.customer.metaLine}</p>
              ) : null}
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Section 1</p>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-base leading-7 text-slate-700">
            {draft.customer.summary}
          </div>

          {draft.customer.whereToFind.length > 0 ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm font-medium text-slate-600">Where to find them</p>
              <div className="flex flex-wrap gap-3">
                {draft.customer.whereToFind.map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="rounded-full border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.35)] sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#32b8c6]">Core Pain Point</p>
              <p className="mt-5 max-w-4xl text-xl italic leading-8 text-slate-800 sm:text-2xl">"{draft.pain.quote}"</p>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Section 2</p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Root cause</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{draft.pain.rootCause}</p>
            </div>
            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Why it hurts</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{draft.pain.whyItHurts}</p>
            </div>
            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Trigger moment</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{draft.pain.triggerMoment}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.35)] sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#32b8c6]">What You're Building</p>
              <p className="mt-5 text-lg font-semibold leading-8 text-slate-900">{draft.build.valueProposition}</p>
              {draft.build.replaces.length > 0 ? (
                <p className="mt-3 text-sm text-slate-500">Replaces: {draft.build.replaces.join(" + ")}</p>
              ) : null}
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Section 3</p>
          </div>

          <div className="mt-8 space-y-4">
            {draft.build.coreFeatures.map((feature, index) => (
              <div key={`${feature.title}-${index}`} className="flex items-start gap-4">
                <FeatureIndex index={index} />
                <div className="pt-1">
                  <p className="text-sm font-semibold text-slate-900">{feature.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {draft.build.outcome ? (
            <p className="mt-8 text-sm font-medium text-slate-700">Outcome: "{draft.build.outcome}"</p>
          ) : null}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.35)] sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#32b8c6]">Your Startup Moat</p>
              <div className="mt-5">
                <Badge className="rounded-full bg-[#e6f7fa] px-4 py-2 text-sm font-semibold text-[#0f5b64] hover:bg-[#e6f7fa]">
                  {draft.moat.moatType}
                </Badge>
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Section 4</p>
          </div>

          <div className="mt-8 grid gap-6">
            <div>
              <p className="text-sm font-semibold text-slate-900">Your edge</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{draft.moat.edge}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Why incumbents miss it</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{draft.moat.incumbentGap}</p>
            </div>
            {draft.moat.startupsToStudy.length > 0 ? (
              <div>
                <p className="text-sm font-semibold text-slate-900">Startups to study</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {draft.moat.startupsToStudy.map((company) =>
                    company.url ? (
                      <a
                        key={`${company.name}-${company.url}`}
                        href={company.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#32b8c6] hover:text-[#0f5b64]"
                      >
                        {company.name}
                      </a>
                    ) : (
                      <Badge
                        key={company.name}
                        variant="outline"
                        className="rounded-full border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                      >
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
