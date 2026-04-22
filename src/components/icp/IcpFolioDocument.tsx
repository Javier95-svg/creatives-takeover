import {
  type MutableRefObject,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

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
import type { IcpDraftDocument } from "@/lib/icpBuilderSession";

type IcpFolioTone = "folio" | "platformPreview" | "landingPreview";
type IcpFolioSectionKey = "customer" | "pain" | "build" | "moat";

interface IcpSectionExplainer {
  what: string;
  why: string;
  how: string;
}

interface IcpFolioDocumentProps {
  draft: IcpDraftDocument;
  documentRef?: RefObject<HTMLDivElement>;
  topBar?: ReactNode;
  bottomBar?: ReactNode;
  footer?: ReactNode;
  blurred?: boolean;
  className?: string;
  tone?: IcpFolioTone;
  layout?: "page" | "embedded";
  sectionExplainers?: Partial<Record<IcpFolioSectionKey, IcpSectionExplainer>>;
}

const VIEWPORT_MARGIN = 16;

function setExternalDocumentRef(
  ref: RefObject<HTMLDivElement> | undefined,
  value: HTMLDivElement | null,
) {
  if (!ref) return;
  (ref as MutableRefObject<HTMLDivElement | null>).current = value;
}

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const sync = (event?: MediaQueryListEvent) => {
      setIsMobile(event ? event.matches : mediaQuery.matches);
    };

    sync();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", sync);
      return () => mediaQuery.removeEventListener("change", sync);
    }

    mediaQuery.addListener(sync);
    return () => mediaQuery.removeListener(sync);
  }, []);

  return isMobile;
}

function formatConfidenceLabel(confidence: IcpDraftDocument["customer"]["evidence"]["confidence"]) {
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

function SectionExplainerContent({
  explainer,
}: {
  explainer: IcpSectionExplainer;
}) {
  return (
    <div className="space-y-4 text-left">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          What this section is
        </p>
        <p className="mt-1.5 text-sm leading-6 text-slate-700">{explainer.what}</p>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Why it matters
        </p>
        <p className="mt-1.5 text-sm leading-6 text-slate-700">{explainer.why}</p>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          How the Builder generates it
        </p>
        <p className="mt-1.5 text-sm leading-6 text-slate-700">{explainer.how}</p>
      </div>
    </div>
  );
}

function SectionEvidenceNote({
  evidence,
  title = "Evidence",
}: {
  evidence: IcpDraftDocument["customer"]["evidence"];
  title?: string;
}) {
  return (
    <div className="mt-8 border-t border-slate-200 pt-5">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-sm leading-7 text-slate-600">{evidence.evidence}</p>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          Confidence: {formatConfidenceLabel(evidence.confidence)}
        </p>
        {evidence.missingSignalPrompt ? (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-semibold text-slate-900">Need to validate</p>
            <p className="text-sm leading-7 text-slate-600">{evidence.missingSignalPrompt}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DocumentSingleColumnTable({
  columnLabel,
  items,
  emptyText,
}: {
  columnLabel: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="mt-3 overflow-hidden border border-slate-200">
      <table className="w-full border-collapse text-left text-sm text-slate-600">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="w-14 px-3 py-2 font-medium text-slate-500">#</th>
            <th className="px-3 py-2 font-medium text-slate-500">{columnLabel}</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map((item, index) => (
              <tr
                key={`${columnLabel}-${item}-${index}`}
                className="border-b border-slate-200 last:border-b-0"
              >
                <td className="px-3 py-3 align-top font-medium text-slate-400">
                  {String(index + 1).padStart(2, "0")}
                </td>
                <td className="px-3 py-3 leading-7 text-slate-700">{item}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={2} className="px-3 py-3 leading-7 text-slate-500">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DocumentDetailTable({
  rows,
  emptyText,
}: {
  rows: Array<{ label: string; value: string }>;
  emptyText?: string;
}) {
  const populatedRows = rows.filter((row) => row.value.trim().length > 0);

  return (
    <div className="mt-3 overflow-hidden border border-slate-200">
      <table className="w-full border-collapse text-left text-sm text-slate-600">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="w-40 px-3 py-2 font-medium text-slate-500">Type</th>
            <th className="px-3 py-2 font-medium text-slate-500">Detail</th>
          </tr>
        </thead>
        <tbody>
          {populatedRows.length > 0 ? (
            populatedRows.map((row, index) => (
              <tr
                key={`${row.label}-${index}`}
                className="border-b border-slate-200 last:border-b-0"
              >
                <td className="px-3 py-3 align-top font-medium text-slate-900">{row.label}</td>
                <td className="px-3 py-3 leading-7 text-slate-700">{row.value}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={2} className="px-3 py-3 leading-7 text-slate-500">
                {emptyText ?? "Additional detail still needs sharper founder evidence."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DocumentSection({
  sectionKey,
  explainer,
  isMobile,
  children,
}: {
  sectionKey: IcpFolioSectionKey;
  explainer?: IcpSectionExplainer;
  isMobile: boolean;
  children: ReactNode;
}) {
  const section = (
    <section
      className={explainer ? "cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300" : undefined}
      tabIndex={explainer ? 0 : undefined}
      aria-label={explainer ? `Explain ${sectionKey} section` : undefined}
    >
      {children}
    </section>
  );

  if (!explainer) {
    return section;
  }

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>{section}</PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="center"
          sideOffset={12}
          collisionPadding={VIEWPORT_MARGIN}
          className="w-[min(24rem,calc(100vw-2rem))] rounded-2xl border-slate-200 bg-white p-4 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] md:hidden"
        >
          <SectionExplainerContent explainer={explainer} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{section}</TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        sideOffset={12}
        collisionPadding={VIEWPORT_MARGIN}
        className="hidden max-w-sm rounded-2xl border-slate-200 bg-white p-4 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] md:block"
      >
        <SectionExplainerContent explainer={explainer} />
      </TooltipContent>
    </Tooltip>
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
  layout = "page",
  sectionExplainers,
}: IcpFolioDocumentProps) {
  const articleRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobileViewport();

  useEffect(() => {
    setExternalDocumentRef(documentRef, articleRef.current);
  }, [documentRef]);

  const wrapperClasses =
    layout === "embedded"
      ? "px-0 pb-0 pt-0"
      : tone === "platformPreview"
        ? "px-4 pb-12 pt-6 sm:px-6 lg:px-8"
        : "px-4 pb-12 pt-8 sm:px-6 lg:px-8";

  const surfaceBlurClasses = blurred ? "pointer-events-none select-none blur-[14px]" : "";

  return (
    <div className={`${wrapperClasses} ${className}`}>
      <TooltipProvider delayDuration={120}>
        <div className="mx-auto w-full max-w-4xl">
          {topBar ? <div className="mb-6">{topBar}</div> : null}

          <div className={surfaceBlurClasses}>
            <article
              ref={articleRef}
              className="relative bg-white px-6 py-8 text-slate-950 sm:px-10 sm:py-10"
            >
            <DocumentSection
              sectionKey="customer"
              explainer={sectionExplainers?.customer}
              isMobile={isMobile}
            >
              <div>
                <p className="text-sm font-medium text-slate-500">Creatives Takeover: ICP Draft</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
                  {draft.customer.personaName}
                </h1>
                <p className="mt-3 text-lg leading-8 text-slate-800">{draft.customer.roleLine}</p>
                {draft.customer.metaLine ? (
                  <p className="mt-2 text-sm leading-6 text-slate-500">{draft.customer.metaLine}</p>
                ) : null}

                <p className="mt-8 text-[1.02rem] leading-8 text-slate-700">
                  {draft.customer.summary}
                </p>

                <div className="mt-8 grid gap-8 sm:grid-cols-2">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Behavior signals</h2>
                    <DocumentSingleColumnTable
                      columnLabel="Observed behavior"
                      items={draft.customer.behaviors}
                      emptyText="Behavior patterns still need sharper evidence."
                    />
                  </div>

                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Motivations and trigger
                    </h2>
                    <DocumentDetailTable
                      rows={[
                        ...draft.customer.motivations.map((item) => ({
                          label: "Motivation",
                          value: item,
                        })),
                        {
                          label: "Context",
                          value: draft.customer.triggerContext,
                        },
                        {
                          label: "Why they act now",
                          value: draft.customer.actionTrigger,
                        },
                      ]}
                      emptyText="Motivations still need sharper founder evidence."
                    />
                  </div>
                </div>

                {draft.customer.whereToFind.length > 0 ? (
                  <div className="mt-8">
                    <h2 className="text-sm font-semibold text-slate-900">Where to find them</h2>
                    <DocumentSingleColumnTable
                      columnLabel="Channel or environment"
                      items={draft.customer.whereToFind}
                      emptyText="Distribution channels still need clearer validation."
                    />
                  </div>
                ) : null}

                <SectionEvidenceNote evidence={draft.customer.evidence} />
              </div>
            </DocumentSection>

            <DocumentSection
              sectionKey="pain"
              explainer={sectionExplainers?.pain}
              isMobile={isMobile}
            >
              <div className="border-t border-slate-200 pt-10">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Core pain point
                </h2>
                <blockquote className="mt-6 border-l border-slate-300 pl-5 text-xl italic leading-9 text-slate-800 sm:text-2xl">
                  "{draft.pain.quote}"
                </blockquote>

                <dl className="mt-8 grid gap-6 sm:grid-cols-2">
                  {[
                    { label: "Root cause", value: draft.pain.rootCause },
                    { label: "Why it hurts", value: draft.pain.whyItHurts },
                    { label: "Trigger moment", value: draft.pain.triggerMoment },
                    { label: "Cost of inaction", value: draft.pain.costOfInaction },
                  ].map((item) => (
                    <div key={item.label}>
                      <dt className="text-sm font-semibold text-slate-900">{item.label}</dt>
                      <dd className="mt-2 text-sm leading-7 text-slate-600">{item.value}</dd>
                    </div>
                  ))}
                </dl>

                <SectionEvidenceNote evidence={draft.pain.evidence} />
              </div>
            </DocumentSection>

            <DocumentSection
              sectionKey="build"
              explainer={sectionExplainers?.build}
              isMobile={isMobile}
            >
              <div className="border-t border-slate-200 pt-10">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  What you&apos;re building
                </h2>
                <p className="mt-6 text-lg leading-8 text-slate-900">
                  {draft.build.valueProposition}
                </p>

                {draft.build.replaces.length > 0 ? (
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    <span className="font-medium text-slate-900">Replaces:</span>{" "}
                    {draft.build.replaces.join(", ")}
                  </p>
                ) : null}

                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-slate-900">Core features</h3>
                  <ol className="mt-3 list-decimal space-y-4 pl-5 text-sm leading-7 text-slate-600">
                    {draft.build.coreFeatures.map((feature) => (
                      <li key={feature.title}>
                        <span className="font-semibold text-slate-900">{feature.title}.</span>{" "}
                        {feature.description}
                      </li>
                    ))}
                  </ol>
                </div>

                {draft.build.outcome ? (
                  <p className="mt-8 text-sm leading-7 text-slate-600">
                    <span className="font-medium text-slate-900">Outcome:</span>{" "}
                    {draft.build.outcome}
                  </p>
                ) : null}

                <SectionEvidenceNote evidence={draft.build.evidence} />
              </div>
            </DocumentSection>

            <DocumentSection
              sectionKey="moat"
              explainer={sectionExplainers?.moat}
              isMobile={isMobile}
            >
              <div className="border-t border-slate-200 pt-10">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Moat and competitive landscape
                </h2>

                <div className="mt-8 space-y-8">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Moat</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      <span className="font-medium text-slate-900">Moat type:</span>{" "}
                      {draft.moat.moatType}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      <span className="font-medium text-slate-900">Your edge:</span>{" "}
                      {draft.moat.edge}
                    </p>
                  </div>

                  <dl className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-semibold text-slate-900">Source of advantage</dt>
                      <dd className="mt-2 text-sm leading-7 text-slate-600">
                        {draft.moat.edgeSource}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-semibold text-slate-900">Why it is hard to copy</dt>
                      <dd className="mt-2 text-sm leading-7 text-slate-600">
                        {draft.moat.whyHardToCopy}
                      </dd>
                    </div>
                  </dl>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Why incumbents miss it
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {draft.moat.incumbentGap}
                    </p>
                  </div>

                  {draft.moat.startupsToStudy.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Startups to study</h3>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
                        {draft.moat.startupsToStudy.map((company) => (
                          <li key={`${company.name}-${company.url ?? "no-url"}`}>
                            {company.url ? (
                              <a
                                href={company.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-700 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-slate-950"
                              >
                                {company.name}
                              </a>
                            ) : (
                              company.name
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <SectionEvidenceNote evidence={draft.moat.evidence} title="Moat evidence" />

                  <div className="border-t border-slate-200 pt-8">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Competitive summary
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {draft.competition.summary}
                    </p>
                  </div>

                  {draft.competition.directCompetitors.length > 0 ? (
                    <div className="space-y-6">
                      {draft.competition.directCompetitors.map((competitor) => (
                        <div key={`${competitor.name}-${competitor.url ?? "no-url"}`}>
                          <h4 className="text-sm font-semibold text-slate-900">
                            {competitor.url ? (
                              <a
                                href={competitor.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-900 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-slate-700"
                              >
                                {competitor.name}
                              </a>
                            ) : (
                              competitor.name
                            )}
                          </h4>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            <span className="font-medium text-slate-900">What they do well:</span>{" "}
                            {competitor.doesWell}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            <span className="font-medium text-slate-900">Gap:</span>{" "}
                            {competitor.gap}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Gap to exploit</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {draft.competition.exploitableGap}
                    </p>
                  </div>

                  <SectionEvidenceNote
                    evidence={draft.competition.evidence}
                    title="Competitive evidence"
                  />
                </div>
              </div>
            </DocumentSection>
            </article>
          </div>

          {bottomBar ? <div className="mt-6">{bottomBar}</div> : null}
          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>
      </TooltipProvider>
    </div>
  );
}
