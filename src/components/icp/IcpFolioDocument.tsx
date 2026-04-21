import {
  type MutableRefObject,
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

interface ExplainerPosition {
  left: number;
  top: number;
  width: number;
}

const SECTION_KEYS: IcpFolioSectionKey[] = ["customer", "pain", "build", "moat"];
const EXPLAINER_MAX_WIDTH = 320;
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

function DocumentSection({
  sectionKey,
  explainer,
  registerSection,
  isMobile,
  onActivate,
  onDeactivate,
  onToggle,
  children,
}: {
  sectionKey: IcpFolioSectionKey;
  explainer?: IcpSectionExplainer;
  registerSection: (key: IcpFolioSectionKey, node: HTMLElement | null) => void;
  isMobile: boolean;
  onActivate: (key: IcpFolioSectionKey) => void;
  onDeactivate: () => void;
  onToggle: (key: IcpFolioSectionKey) => void;
  children: ReactNode;
}) {
  const isInteractive = Boolean(explainer);

  return (
    <section
      ref={(node) => registerSection(sectionKey, node)}
      className={isInteractive ? "cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onMouseEnter={isInteractive && !isMobile ? () => onActivate(sectionKey) : undefined}
      onMouseLeave={isInteractive && !isMobile ? onDeactivate : undefined}
      onFocus={isInteractive ? () => onActivate(sectionKey) : undefined}
      onBlur={
        isInteractive
          ? (event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                onDeactivate();
              }
            }
          : undefined
      }
      onClick={isInteractive && isMobile ? () => onToggle(sectionKey) : undefined}
      onKeyDown={
        isInteractive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                if (isMobile) {
                  onToggle(sectionKey);
                } else {
                  onActivate(sectionKey);
                }
              }

              if (event.key === "Escape") {
                onDeactivate();
              }
            }
          : undefined
      }
    >
      {children}
    </section>
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
  const closeTimeoutRef = useRef<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<IcpFolioSectionKey, HTMLElement | null>>({
    customer: null,
    pain: null,
    build: null,
    moat: null,
  });

  const [activeSection, setActiveSection] = useState<IcpFolioSectionKey | null>(null);
  const [explainerPosition, setExplainerPosition] = useState<ExplainerPosition | null>(null);
  const isMobile = useIsMobileViewport();

  const hasExplainers = useMemo(
    () =>
      Boolean(
        sectionExplainers &&
          SECTION_KEYS.some((key) => Boolean(sectionExplainers[key])),
      ),
    [sectionExplainers],
  );

  useEffect(() => {
    setExternalDocumentRef(documentRef, articleRef.current);
  }, [documentRef]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasExplainers || blurred) {
      setActiveSection(null);
    }
  }, [blurred, hasExplainers]);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const closeExplainer = () => {
    clearCloseTimeout();
    setActiveSection(null);
  };

  const queueCloseExplainer = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = window.setTimeout(() => {
      setActiveSection(null);
      closeTimeoutRef.current = null;
    }, 80);
  };

  const openExplainer = (sectionKey: IcpFolioSectionKey) => {
    if (!hasExplainers || blurred || !sectionExplainers?.[sectionKey]) return;
    clearCloseTimeout();
    setActiveSection(sectionKey);
  };

  const toggleExplainer = (sectionKey: IcpFolioSectionKey) => {
    if (!hasExplainers || blurred || !sectionExplainers?.[sectionKey]) return;
    clearCloseTimeout();
    setActiveSection((current) => (current === sectionKey ? null : sectionKey));
  };

  const registerSection = (key: IcpFolioSectionKey, node: HTMLElement | null) => {
    sectionRefs.current[key] = node;
  };

  useEffect(() => {
    if (!activeSection || !sectionExplainers?.[activeSection]) {
      setExplainerPosition(null);
      return;
    }

    const updatePosition = () => {
      const activeElement = sectionRefs.current[activeSection];
      if (!activeElement) return;

      const rect = activeElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const width = Math.min(EXPLAINER_MAX_WIDTH, viewportWidth - VIEWPORT_MARGIN * 2);

      const nextLeft = isMobile
        ? Math.min(
            Math.max(rect.left + rect.width / 2 - width / 2, VIEWPORT_MARGIN),
            viewportWidth - width - VIEWPORT_MARGIN,
          )
        : Math.min(
            Math.max(rect.right + 18, VIEWPORT_MARGIN),
            viewportWidth - width - VIEWPORT_MARGIN,
          );

      const nextTop = isMobile
        ? rect.bottom + 12
        : Math.max(rect.top - 8, VIEWPORT_MARGIN);

      setExplainerPosition({
        left: nextLeft,
        top: nextTop,
        width,
      });
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [activeSection, isMobile, sectionExplainers]);

  useEffect(() => {
    if (!activeSection || !isMobile) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (overlayRef.current?.contains(target)) return;
      if (sectionRefs.current[activeSection]?.contains(target)) return;

      setActiveSection(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [activeSection, isMobile]);

  const wrapperClasses =
    layout === "embedded"
      ? "px-0 pb-0 pt-0"
      : tone === "platformPreview"
        ? "px-4 pb-12 pt-6 sm:px-6 lg:px-8"
        : "px-4 pb-12 pt-8 sm:px-6 lg:px-8";

  const surfaceBlurClasses = blurred ? "pointer-events-none select-none blur-[14px]" : "";

  return (
    <div className={`${wrapperClasses} ${className}`}>
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
              registerSection={registerSection}
              isMobile={isMobile}
              onActivate={openExplainer}
              onDeactivate={queueCloseExplainer}
              onToggle={toggleExplainer}
            >
              <div>
                <p className="text-sm font-medium text-slate-500">Ideal customer profile</p>
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
                    {draft.customer.behaviors.length > 0 ? (
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
                        {draft.customer.behaviors.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        Behavior patterns still need sharper evidence.
                      </p>
                    )}
                  </div>

                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Motivations and trigger
                    </h2>
                    <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
                      {draft.customer.motivations.length > 0 ? (
                        <ul className="list-disc space-y-2 pl-5">
                          {draft.customer.motivations.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>Motivations still need sharper founder evidence.</p>
                      )}
                      <p>
                        <span className="font-medium text-slate-900">Context:</span>{" "}
                        {draft.customer.triggerContext}
                      </p>
                      <p>
                        <span className="font-medium text-slate-900">Why they act now:</span>{" "}
                        {draft.customer.actionTrigger}
                      </p>
                    </div>
                  </div>
                </div>

                {draft.customer.whereToFind.length > 0 ? (
                  <div className="mt-8">
                    <h2 className="text-sm font-semibold text-slate-900">Where to find them</h2>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
                      {draft.customer.whereToFind.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <SectionEvidenceNote evidence={draft.customer.evidence} />
              </div>
            </DocumentSection>

            <DocumentSection
              sectionKey="pain"
              explainer={sectionExplainers?.pain}
              registerSection={registerSection}
              isMobile={isMobile}
              onActivate={openExplainer}
              onDeactivate={queueCloseExplainer}
              onToggle={toggleExplainer}
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
              registerSection={registerSection}
              isMobile={isMobile}
              onActivate={openExplainer}
              onDeactivate={queueCloseExplainer}
              onToggle={toggleExplainer}
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
              registerSection={registerSection}
              isMobile={isMobile}
              onActivate={openExplainer}
              onDeactivate={queueCloseExplainer}
              onToggle={toggleExplainer}
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

      {activeSection && explainerPosition && sectionExplainers?.[activeSection] ? (
        <div
          ref={overlayRef}
          className={`fixed z-50 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] ${
            isMobile ? "pointer-events-auto" : "pointer-events-none"
          }`}
          style={{
            left: explainerPosition.left,
            top: explainerPosition.top,
            width: explainerPosition.width,
          }}
        >
          <SectionExplainerContent explainer={sectionExplainers[activeSection]!} />
        </div>
      ) : null}
    </div>
  );
}
