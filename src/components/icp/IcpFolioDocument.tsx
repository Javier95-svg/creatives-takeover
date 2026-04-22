import {
  useCallback,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import type { IcpDraftDocument } from "@/lib/icpBuilderSession";

type IcpFolioTone = "folio" | "platformPreview" | "landingPreview";
type IcpFolioSectionKey = "customer" | "pain" | "build" | "moat";
type IcpExplainerPlacement = "top" | "bottom";

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
const EXPLAINER_OFFSET = 12;
const EXPLAINER_MAX_WIDTH = 384;

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function SectionExplainerContent({
  explainer,
  onClose,
}: {
  explainer: IcpSectionExplainer;
  onClose: () => void;
}) {
  return (
    <div className="relative space-y-4 pr-8 text-left">
      <button
        type="button"
        aria-label="Close explanation"
        onClick={onClose}
        className="absolute right-0 top-0 text-lg leading-none text-popover-foreground/55 transition-opacity hover:text-popover-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ×
      </button>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-popover-foreground/65">
          What this section is
        </p>
        <p className="mt-1.5 text-sm leading-6 text-popover-foreground">{explainer.what}</p>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-popover-foreground/65">
          Why it matters
        </p>
        <p className="mt-1.5 text-sm leading-6 text-popover-foreground">{explainer.why}</p>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-popover-foreground/65">
          How the Builder generates it
        </p>
        <p className="mt-1.5 text-sm leading-6 text-popover-foreground">{explainer.how}</p>
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
    <div className="mt-8 border-t border-border/80 pt-5">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground dark:text-foreground/88">{title}</p>
        <p className="text-sm leading-7 text-foreground">{evidence.evidence}</p>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground/60">
          Confidence: {formatConfidenceLabel(evidence.confidence)}
        </p>
        {evidence.missingSignalPrompt ? (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-semibold text-foreground dark:text-foreground/88">
              Need to validate
            </p>
            <p className="text-sm leading-7 text-foreground">{evidence.missingSignalPrompt}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type DocumentTableTone = "primary" | "success" | "destructive";

const DOCUMENT_TABLE_TONE_STYLES: Record<
  DocumentTableTone,
  {
    frame: string;
    headerRow: string;
    headerText: string;
    rowBorder: string;
    accentText: string;
  }
> = {
  primary: {
    frame: "border-[hsl(var(--blue-primary)/0.28)]",
    headerRow: "border-[hsl(var(--blue-primary)/0.22)] bg-[hsl(var(--blue-primary)/0.09)]",
    headerText: "text-[hsl(var(--blue-primary))]",
    rowBorder: "border-[hsl(var(--blue-primary)/0.14)]",
    accentText: "text-[hsl(var(--blue-primary))]",
  },
  success: {
    frame: "border-[hsl(var(--green-primary)/0.3)]",
    headerRow: "border-[hsl(var(--green-primary)/0.24)] bg-[hsl(var(--green-primary)/0.09)]",
    headerText: "text-[hsl(var(--green-primary))]",
    rowBorder: "border-[hsl(var(--green-primary)/0.14)]",
    accentText: "text-[hsl(var(--green-primary))]",
  },
  destructive: {
    frame: "border-[hsl(var(--red-primary)/0.3)]",
    headerRow: "border-[hsl(var(--red-primary)/0.24)] bg-[hsl(var(--red-primary)/0.08)]",
    headerText: "text-[hsl(var(--red-primary))]",
    rowBorder: "border-[hsl(var(--red-primary)/0.14)]",
    accentText: "text-[hsl(var(--red-primary))]",
  },
};

function DocumentSingleColumnTable({
  columnLabel,
  items,
  emptyText,
  tone,
}: {
  columnLabel: string;
  items: string[];
  emptyText: string;
  tone: DocumentTableTone;
}) {
  const styles = DOCUMENT_TABLE_TONE_STYLES[tone];

  return (
    <div className={`mt-3 overflow-hidden border ${styles.frame}`}>
      <table className="w-full border-collapse text-left text-sm text-foreground">
        <thead>
          <tr className={`border-b ${styles.headerRow}`}>
            <th className={`w-14 px-3 py-2 font-medium ${styles.headerText}`}>#</th>
            <th className={`px-3 py-2 font-medium ${styles.headerText}`}>{columnLabel}</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map((item, index) => (
              <tr
                key={`${columnLabel}-${item}-${index}`}
                className={`border-b ${styles.rowBorder} last:border-b-0`}
              >
                <td className={`px-3 py-3 align-top font-medium ${styles.accentText}`}>
                  {String(index + 1).padStart(2, "0")}
                </td>
                <td className="px-3 py-3 leading-7 text-foreground">{item}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={2} className="px-3 py-3 leading-7 text-foreground/65">
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
  tone,
}: {
  rows: Array<{ label: string; value: string }>;
  emptyText?: string;
  tone: DocumentTableTone;
}) {
  const populatedRows = rows.filter((row) => row.value.trim().length > 0);
  const styles = DOCUMENT_TABLE_TONE_STYLES[tone];

  return (
    <div className={`mt-3 overflow-hidden border ${styles.frame}`}>
      <table className="w-full border-collapse text-left text-sm text-foreground">
        <thead>
          <tr className={`border-b ${styles.headerRow}`}>
            <th className={`w-40 px-3 py-2 font-medium ${styles.headerText}`}>Type</th>
            <th className={`px-3 py-2 font-medium ${styles.headerText}`}>Detail</th>
          </tr>
        </thead>
        <tbody>
          {populatedRows.length > 0 ? (
            populatedRows.map((row, index) => (
              <tr
                key={`${row.label}-${index}`}
                className={`border-b ${styles.rowBorder} last:border-b-0`}
              >
                <td className={`px-3 py-3 align-top font-medium ${styles.accentText}`}>
                  {row.label}
                </td>
                <td className="px-3 py-3 leading-7 text-foreground">{row.value}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={2} className="px-3 py-3 leading-7 text-foreground/65">
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
  registerSection,
  active,
  onHoverStart,
  onHoverEnd,
  onToggleOpen,
  onFocusOpen,
  children,
}: {
  sectionKey: IcpFolioSectionKey;
  explainer?: IcpSectionExplainer;
  registerSection: (sectionKey: IcpFolioSectionKey, node: HTMLElement | null) => void;
  active: boolean;
  onHoverStart: (sectionKey: IcpFolioSectionKey) => void;
  onHoverEnd: (sectionKey: IcpFolioSectionKey, nextTarget: EventTarget | null) => void;
  onToggleOpen: (sectionKey: IcpFolioSectionKey) => void;
  onFocusOpen: (sectionKey: IcpFolioSectionKey) => void;
  children: ReactNode;
}) {
  return (
    <section
      ref={(node) => registerSection(sectionKey, node)}
      className={
        explainer
          ? "cursor-pointer rounded-sm transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
          : undefined
      }
      tabIndex={explainer ? 0 : undefined}
      role={explainer ? "button" : undefined}
      aria-expanded={explainer ? active : undefined}
      aria-label={explainer ? `Show explanation for ${sectionKey} section` : undefined}
      onMouseEnter={explainer ? () => onHoverStart(sectionKey) : undefined}
      onMouseLeave={
        explainer ? (event) => onHoverEnd(sectionKey, event.relatedTarget) : undefined
      }
      onFocus={explainer ? () => onFocusOpen(sectionKey) : undefined}
      onClick={explainer ? () => onToggleOpen(sectionKey) : undefined}
      onKeyDown={
        explainer
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onToggleOpen(sectionKey);
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
  const sectionRefs = useRef<Record<IcpFolioSectionKey, HTMLElement | null>>({
    customer: null,
    pain: null,
    build: null,
    moat: null,
  });
  const explainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobileViewport();
  const [activeSection, setActiveSection] = useState<IcpFolioSectionKey | null>(null);
  const [dismissedSection, setDismissedSection] = useState<IcpFolioSectionKey | null>(null);
  const [explainerPosition, setExplainerPosition] = useState<{
    left: number;
    top: number;
    width: number;
    placement: IcpExplainerPlacement;
  } | null>(null);

  useEffect(() => {
    setExternalDocumentRef(documentRef, articleRef.current);
  }, [documentRef]);

  useEffect(() => {
    if (blurred) {
      setActiveSection(null);
      setDismissedSection(null);
      setExplainerPosition(null);
    }
  }, [blurred]);

  const registerSection = (sectionKey: IcpFolioSectionKey, node: HTMLElement | null) => {
    sectionRefs.current[sectionKey] = node;
  };

  const updateExplainerPosition = useCallback((sectionKey: IcpFolioSectionKey) => {
    const articleNode = articleRef.current;
    const sectionNode = sectionRefs.current[sectionKey];

    if (!articleNode || !sectionNode) {
      setExplainerPosition(null);
      return;
    }

    const articleRect = articleNode.getBoundingClientRect();
    const sectionRect = sectionNode.getBoundingClientRect();
    const overlayHeight = explainerRef.current?.offsetHeight ?? 0;
    const width = Math.min(
      EXPLAINER_MAX_WIDTH,
      Math.max(220, articleRect.width - VIEWPORT_MARGIN * 2),
    );
    const centeredLeft =
      sectionRect.left - articleRect.left + sectionRect.width / 2 - width / 2;
    const left = clamp(
      centeredLeft,
      VIEWPORT_MARGIN,
      Math.max(VIEWPORT_MARGIN, articleRect.width - VIEWPORT_MARGIN - width),
    );

    let placement: IcpExplainerPlacement = "top";
    let top =
      sectionRect.top -
      articleRect.top -
      overlayHeight -
      EXPLAINER_OFFSET;

    if (overlayHeight > 0 && top < VIEWPORT_MARGIN) {
      placement = "bottom";
      top =
        sectionRect.bottom -
        articleRect.top +
        EXPLAINER_OFFSET;
    }

    if (overlayHeight > 0) {
      top = clamp(
        top,
        VIEWPORT_MARGIN,
        Math.max(
          VIEWPORT_MARGIN,
          articleRect.height - VIEWPORT_MARGIN - overlayHeight,
        ),
      );
    }

    setExplainerPosition({ left, top, width, placement });
  }, []);

  useEffect(() => {
    if (!activeSection || blurred) {
      setExplainerPosition(null);
      return;
    }

    const sync = () => updateExplainerPosition(activeSection);
    const frame = window.requestAnimationFrame(sync);

    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [activeSection, blurred, isMobile, updateExplainerPosition]);

  useEffect(() => {
    if (!activeSection) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      const activeNode = sectionRefs.current[activeSection];
      if (explainerRef.current?.contains(target) || activeNode?.contains(target)) {
        return;
      }

      setActiveSection(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [activeSection]);

  const openExplainer = (sectionKey: IcpFolioSectionKey) => {
    if (!sectionExplainers?.[sectionKey] || blurred) return;
    setActiveSection(sectionKey);
  };

  const handleHoverStart = (sectionKey: IcpFolioSectionKey) => {
    if (isMobile) return;
    if (dismissedSection === sectionKey) {
      setDismissedSection(null);
    }
    openExplainer(sectionKey);
  };

  const handleHoverEnd = (sectionKey: IcpFolioSectionKey, nextTarget: EventTarget | null) => {
    if (isMobile) return;

    const nextNode = nextTarget instanceof Node ? nextTarget : null;
    if (dismissedSection === sectionKey) {
      setDismissedSection(null);
    }

    if (
      nextNode &&
      (explainerRef.current?.contains(nextNode) ||
        sectionRefs.current[sectionKey]?.contains(nextNode))
    ) {
      return;
    }

    setActiveSection((current) => (current === sectionKey ? null : current));
  };

  const handleToggleOpen = (sectionKey: IcpFolioSectionKey) => {
    if (!sectionExplainers?.[sectionKey] || blurred) return;

    if (!isMobile && dismissedSection === sectionKey) {
      return;
    }

    setDismissedSection(null);
    setActiveSection((current) => (current === sectionKey && isMobile ? null : sectionKey));
  };

  const handleFocusOpen = (sectionKey: IcpFolioSectionKey) => {
    if (!isMobile && dismissedSection === sectionKey) return;
    openExplainer(sectionKey);
  };

  const handleDismissExplainer = () => {
    if (!activeSection) return;
    if (!isMobile) {
      setDismissedSection(activeSection);
    }
    setActiveSection(null);
  };

  const handleExplainerMouseLeave = (nextTarget: EventTarget | null) => {
    if (isMobile || !activeSection) return;

    const nextNode = nextTarget instanceof Node ? nextTarget : null;
    if (nextNode && sectionRefs.current[activeSection]?.contains(nextNode)) {
      return;
    }

    setActiveSection(null);
  };

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
            className="relative bg-background px-6 py-8 text-foreground transition-colors sm:px-10 sm:py-10"
          >
            <DocumentSection
              sectionKey="customer"
              explainer={sectionExplainers?.customer}
              registerSection={registerSection}
              active={activeSection === "customer"}
              onHoverStart={handleHoverStart}
              onHoverEnd={handleHoverEnd}
              onToggleOpen={handleToggleOpen}
              onFocusOpen={handleFocusOpen}
            >
              <div>
                <p className="text-sm font-medium text-foreground/60">
                  ICP Draft: {draft.customer.personaName}
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
                  {draft.customer.personaName}
                </h1>
                <p className="mt-3 text-lg leading-8 text-foreground">{draft.customer.roleLine}</p>
                {draft.customer.metaLine ? (
                  <p className="mt-2 text-sm leading-6 text-foreground/65">
                    {draft.customer.metaLine}
                  </p>
                ) : null}

                <p className="mt-8 text-[1.02rem] leading-8 text-foreground">
                  {draft.customer.summary}
                </p>

                <div className="mt-8 grid gap-8 sm:grid-cols-2">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground dark:text-foreground/88">
                      Behavior signals
                    </h2>
                    <DocumentSingleColumnTable
                      columnLabel="Observed behavior"
                      items={draft.customer.behaviors}
                      emptyText="Behavior patterns still need sharper evidence."
                      tone="primary"
                    />

                    {draft.customer.whereToFind.length > 0 ? (
                      <div className="mt-8">
                        <h2 className="text-sm font-semibold text-foreground dark:text-foreground/88">
                          Where to find them
                        </h2>
                        <DocumentSingleColumnTable
                          columnLabel="Channel or environment"
                          items={draft.customer.whereToFind}
                          emptyText="Distribution channels still need clearer validation."
                          tone="success"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <h2 className="text-sm font-semibold text-foreground dark:text-foreground/88">
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
                      tone="destructive"
                    />
                  </div>
                </div>

                <SectionEvidenceNote evidence={draft.customer.evidence} />
              </div>
            </DocumentSection>

            <DocumentSection
              sectionKey="pain"
              explainer={sectionExplainers?.pain}
              registerSection={registerSection}
              active={activeSection === "pain"}
              onHoverStart={handleHoverStart}
              onHoverEnd={handleHoverEnd}
              onToggleOpen={handleToggleOpen}
              onFocusOpen={handleFocusOpen}
            >
              <div className="border-t border-border/80 pt-10">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground dark:text-foreground/88">
                  Core pain point
                </h2>
                <blockquote className="mt-6 border-l border-border/80 pl-5 text-xl italic leading-9 text-foreground sm:text-2xl">
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
                      <dt className="text-sm font-semibold text-foreground dark:text-foreground/88">
                        {item.label}
                      </dt>
                      <dd className="mt-2 text-sm leading-7 text-foreground">{item.value}</dd>
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
              active={activeSection === "build"}
              onHoverStart={handleHoverStart}
              onHoverEnd={handleHoverEnd}
              onToggleOpen={handleToggleOpen}
              onFocusOpen={handleFocusOpen}
            >
              <div className="border-t border-border/80 pt-10">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground dark:text-foreground/88">
                  What you&apos;re building
                </h2>
                <p className="mt-6 text-lg leading-8 text-foreground">
                  {draft.build.valueProposition}
                </p>

                {draft.build.replaces.length > 0 ? (
                  <p className="mt-4 text-sm leading-7 text-foreground">
                    <span className="font-medium text-foreground dark:text-foreground/88">
                      Replaces:
                    </span>{" "}
                    {draft.build.replaces.join(", ")}
                  </p>
                ) : null}

                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-foreground dark:text-foreground/88">
                    Core features
                  </h3>
                  <ol className="mt-3 list-decimal space-y-4 pl-5 text-sm leading-7 text-foreground">
                    {draft.build.coreFeatures.map((feature) => (
                      <li key={feature.title}>
                        <span className="font-semibold text-foreground dark:text-foreground/88">
                          {feature.title}.
                        </span>{" "}
                        {feature.description}
                      </li>
                    ))}
                  </ol>
                </div>

                {draft.build.outcome ? (
                  <p className="mt-8 text-sm leading-7 text-foreground">
                    <span className="font-medium text-foreground dark:text-foreground/88">
                      Outcome:
                    </span>{" "}
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
              active={activeSection === "moat"}
              onHoverStart={handleHoverStart}
              onHoverEnd={handleHoverEnd}
              onToggleOpen={handleToggleOpen}
              onFocusOpen={handleFocusOpen}
            >
              <div className="border-t border-border/80 pt-10">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground dark:text-foreground/88">
                  Moat and competitive landscape
                </h2>

                <div className="mt-8 space-y-8">
                  <div>
                    <p className="text-sm font-semibold text-foreground dark:text-foreground/88">
                      Moat
                    </p>
                    <p className="mt-3 text-sm leading-7 text-foreground">
                      <span className="font-medium text-foreground dark:text-foreground/88">
                        Moat type:
                      </span>{" "}
                      {draft.moat.moatType}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-foreground">
                      <span className="font-medium text-foreground dark:text-foreground/88">
                        Your edge:
                      </span>{" "}
                      {draft.moat.edge}
                    </p>
                  </div>

                  <dl className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-semibold text-foreground dark:text-foreground/88">
                        Source of advantage
                      </dt>
                      <dd className="mt-2 text-sm leading-7 text-foreground">
                        {draft.moat.edgeSource}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-semibold text-foreground dark:text-foreground/88">
                        Why it is hard to copy
                      </dt>
                      <dd className="mt-2 text-sm leading-7 text-foreground">
                        {draft.moat.whyHardToCopy}
                      </dd>
                    </div>
                  </dl>

                  <div>
                    <h3 className="text-sm font-semibold text-foreground dark:text-foreground/88">
                      Why incumbents miss it
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-foreground">
                      {draft.moat.incumbentGap}
                    </p>
                  </div>

                  {draft.moat.startupsToStudy.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground dark:text-foreground/88">
                        Startups to study
                      </h3>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-foreground">
                        {draft.moat.startupsToStudy.map((company) => (
                          <li key={`${company.name}-${company.url ?? "no-url"}`}>
                            {company.url ? (
                              <a
                                href={company.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-foreground underline decoration-border underline-offset-4 transition-opacity hover:opacity-80"
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

                  <div className="border-t border-border/80 pt-8">
                    <h3 className="text-sm font-semibold text-foreground dark:text-foreground/88">
                      Competitive summary
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-foreground">
                      {draft.competition.summary}
                    </p>
                  </div>

                  {draft.competition.directCompetitors.length > 0 ? (
                    <div className="space-y-6">
                      {draft.competition.directCompetitors.map((competitor) => (
                        <div key={`${competitor.name}-${competitor.url ?? "no-url"}`}>
                          <h4 className="text-sm font-semibold text-foreground dark:text-foreground/88">
                            {competitor.url ? (
                              <a
                                href={competitor.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-foreground underline decoration-border underline-offset-4 transition-opacity hover:opacity-80"
                              >
                                {competitor.name}
                              </a>
                            ) : (
                              competitor.name
                            )}
                          </h4>
                          <p className="mt-2 text-sm leading-7 text-foreground">
                            <span className="font-medium text-foreground dark:text-foreground/88">
                              What they do well:
                            </span>{" "}
                            {competitor.doesWell}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-foreground">
                            <span className="font-medium text-foreground dark:text-foreground/88">
                              Gap:
                            </span>{" "}
                            {competitor.gap}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div>
                    <h3 className="text-sm font-semibold text-foreground dark:text-foreground/88">
                      Gap to exploit
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-foreground">
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

            {activeSection && sectionExplainers?.[activeSection] && explainerPosition ? (
              <div
                ref={explainerRef}
                className="absolute z-20 rounded-xl border border-border/80 bg-popover p-4 text-popover-foreground shadow-[0_18px_48px_-28px_hsl(var(--foreground)/0.28)] transition-colors dark:shadow-none"
                style={{
                  left: `${explainerPosition.left}px`,
                  top: `${explainerPosition.top}px`,
                  width: `${explainerPosition.width}px`,
                }}
                onMouseLeave={(event) => handleExplainerMouseLeave(event.relatedTarget)}
              >
                <SectionExplainerContent
                  explainer={sectionExplainers[activeSection]}
                  onClose={handleDismissExplainer}
                />
              </div>
            ) : null}
          </article>
        </div>

        {bottomBar ? <div className="mt-6">{bottomBar}</div> : null}
        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>
    </div>
  );
}
