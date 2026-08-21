import {
  useCallback,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ChevronDown, ExternalLink, HelpCircle, Lock } from "lucide-react";

import type { IcpDraftDocument, IcpViabilityDimensionKey } from "@/lib/icpBuilderSession";
import { fieldIsReal } from "@/lib/icpFieldProvenance";
import { computeViabilityScore, type ViabilityBand } from "@/lib/icpViabilityScore";

type IcpFolioTone = "folio" | "platformPreview" | "landingPreview";
export type IcpFolioSectionKey = "customer" | "pain" | "build" | "moat";
type IcpExplainerPlacement = "top" | "bottom";

interface IcpSectionExplainer {
  what: string;
  why: string;
  how: string;
}

interface IcpFolioDocumentProps {
  draft: IcpDraftDocument;
  documentRef?: RefObject<HTMLDivElement>;
  documentLabel?: string;
  topBar?: ReactNode;
  bottomBar?: ReactNode;
  footer?: ReactNode;
  blurred?: boolean;
  className?: string;
  tone?: IcpFolioTone;
  layout?: "page" | "embedded";
  sectionExplainers?: Partial<Record<IcpFolioSectionKey, IcpSectionExplainer>>;
  visibleSections?: readonly IcpFolioSectionKey[];
  lockedSections?: readonly IcpFolioSectionKey[];
  lockedSectionBreak?: ReactNode;
  /**
   * The founder's own words, shown first so the document opens on what they
   * typed rather than on the analysis. It is the one line a reader can verify
   * at a glance, which is what makes the rest of the draft credible.
   */
  ideaDescription?: string;
}

const VIEWPORT_MARGIN = 16;
const EXPLAINER_OFFSET = 12;
const EXPLAINER_MAX_WIDTH = 384;
const SECTION_NAV_ITEMS: Array<{ key: IcpFolioSectionKey; label: string }> = [
  { key: "customer", label: "Ideal customer" },
  { key: "pain", label: "Core pain point" },
  { key: "build", label: "What you are building" },
  { key: "moat", label: "Moat and competition" },
];

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
        <p className="text-label font-semibold uppercase tracking-[0.16em] text-popover-foreground/65">
          What this section is
        </p>
        <p className="mt-1.5 text-sm leading-6 text-popover-foreground">{explainer.what}</p>
      </div>
      <div>
        <p className="text-label font-semibold uppercase tracking-[0.16em] text-popover-foreground/65">
          Why it matters
        </p>
        <p className="mt-1.5 text-sm leading-6 text-popover-foreground">{explainer.why}</p>
      </div>
      <div>
        <p className="text-label font-semibold uppercase tracking-[0.16em] text-popover-foreground/65">
          How the Builder generates it
        </p>
        <p className="mt-1.5 text-sm leading-6 text-popover-foreground">{explainer.how}</p>
      </div>
    </div>
  );
}

const VIABILITY_BAND_STYLES: Record<ViabilityBand, { frame: string; value: string; label: string }> = {
  strong: {
    frame: "border-success/35 bg-success-subtle",
    value: "text-success",
    label: "text-success",
  },
  promising: {
    frame: "border-warning/35 bg-warning-subtle",
    value: "text-warning",
    label: "text-warning",
  },
  needsWork: {
    frame: "border-destructive/35 bg-destructive-subtle",
    value: "text-destructive",
    label: "text-destructive",
  },
};

/**
 * Sits beside the founder's own sentence, which is the only place a single
 * number reads as a verdict on the idea rather than on the document.
 *
 * The one-line summary underneath is not decoration: an unexplained score
 * invites the reader to dismiss it, and naming the weakest driver turns
 * curiosity about the number into a reason to read the section it points at.
 *
 * The breakdown expands rather than sitting open, because the number is the
 * headline and five bars beside the founder's sentence would bury it. It is
 * rendered here rather than in the moat section on purpose: two of the sections
 * feeding the score are gated for logged-out readers, and a verdict a reader
 * cannot audit is worth less than no verdict.
 */
function ViabilityBadge({ draft }: { draft: IcpDraftDocument }) {
  const result = useMemo(() => computeViabilityScore(draft), [draft]);
  const { score, label, band, summary, dimensions, pillars, rigor, basis } = result;
  const styles = VIABILITY_BAND_STYLES[band];
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`w-full shrink-0 rounded-2xl border px-4 py-3 sm:w-60 ${styles.frame}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/60">
        Viability
      </p>
      <p className={`mt-1 text-3xl font-semibold leading-none ${styles.value}`}>
        {score.toFixed(1)}
        <span className="text-base font-medium text-foreground/50">/10</span>
      </p>
      <p className={`mt-1.5 text-sm font-semibold ${styles.label}`}>{label}</p>
      <p className="mt-2 text-xs leading-5 text-foreground/60">{summary}</p>

      {basis === "full" && dimensions.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="mt-3 flex w-full items-center justify-between gap-2 rounded-pill-sm text-xs font-semibold text-foreground/70 transition-colors hover:text-foreground"
          >
            How this is scored
            <ChevronDown className={`icon-sm transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          {expanded ? (
            <div className="mt-3 space-y-2.5 border-t border-border/60 pt-3" data-icp-viability-breakdown>
              {dimensions.map((dimension) => (
                <ViabilityMeter
                  key={dimension.key}
                  label={dimension.label}
                  ratio={dimension.ratio}
                  detail={draft.viabilityAssessment?.[dimension.key as IcpViabilityDimensionKey]?.rationale}
                />
              ))}
              <div className="border-t border-border/60 pt-2.5">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-foreground/50">
                  Evidence quality
                </p>
                <p className="mt-1 text-xs leading-5 text-foreground/60">
                  These do not raise the verdict. They hold it down when the draft rests on
                  assumption, currently at {Math.round(rigor * 100)}%.
                </p>
                <div className="mt-2 space-y-2">
                  {pillars.map((pillar) => (
                    <ViabilityMeter key={pillar.key} label={pillar.label} ratio={pillar.ratio} />
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function ViabilityMeter({ label, ratio, detail }: { label: string; ratio: number; detail?: string }) {
  const percent = Math.round(ratio * 100);
  // One ramp for every meter so a reader can compare bars across the two
  // groups without decoding a second colour language.
  const tone = percent >= 65 ? "bg-success" : percent >= 35 ? "bg-warning" : "bg-destructive";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium capitalize text-foreground/75">{label}</p>
        <p className="text-xs tabular-nums text-foreground/55">{percent}</p>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-pill-sm bg-foreground/10">
        <div className={`h-full rounded-pill-sm ${tone}`} style={{ width: `${Math.max(percent, 2)}%` }} />
      </div>
      {detail ? <p className="mt-1 text-[0.7rem] leading-4 text-foreground/55">{detail}</p> : null}
    </div>
  );
}

/**
 * A field the model never answered, shown as the open question it is.
 *
 * The generator backfills unanswered fields with prose that describes the gap
 * ("The incumbent gap still needs to be stated more sharply"). Rendered in the
 * same weight as everything around it, that reads as a finding, and a founder
 * scanning the page cannot tell which lines are conclusions and which are
 * holes. Same words, demoted, plus a label that says which it is.
 */
function DraftValue({ draft, path, value }: { draft: IcpDraftDocument; path: string; value: string }) {
  if (fieldIsReal(draft, path)) return <>{value}</>;

  return (
    <span className="flex flex-col items-start gap-1.5">
      <span className="inline-flex items-center gap-1.5 rounded-pill-sm border border-border/70 px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-foreground/55">
        <HelpCircle className="icon-sm" aria-hidden />
        Open question
      </span>
      <span className="italic text-foreground/55">{value}</span>
    </span>
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
  documentLabel = "Creatives Takeover: ICP Draft",
  topBar,
  bottomBar,
  footer,
  blurred = false,
  className = "",
  tone = "folio",
  layout = "page",
  sectionExplainers,
  visibleSections,
  lockedSections = [],
  lockedSectionBreak,
  ideaDescription,
}: IcpFolioDocumentProps) {
  const visibleSectionSet = useMemo(
    () => new Set<IcpFolioSectionKey>(visibleSections ?? SECTION_NAV_ITEMS.map((item) => item.key)),
    [visibleSections],
  );
  const lockedSectionSet = useMemo(
    () => new Set<IcpFolioSectionKey>(lockedSections.filter((sectionKey) => visibleSectionSet.has(sectionKey))),
    [lockedSections, visibleSectionSet],
  );
  const orderedVisibleSectionKeys = useMemo(
    () => SECTION_NAV_ITEMS.map((item) => item.key).filter((sectionKey) => visibleSectionSet.has(sectionKey)),
    [visibleSectionSet],
  );
  const firstLockedSectionIndex = orderedVisibleSectionKeys.findIndex((sectionKey) => lockedSectionSet.has(sectionKey));
  const unlockedVisibleSectionKeys =
    firstLockedSectionIndex === -1 ? orderedVisibleSectionKeys : orderedVisibleSectionKeys.slice(0, firstLockedSectionIndex);
  const lockedVisibleSectionKeys =
    firstLockedSectionIndex === -1 ? [] : orderedVisibleSectionKeys.slice(firstLockedSectionIndex);
  /**
   * Every visible section is listed, gated ones included. Hiding them made the
   * draft look like a two-section document, so a reader had no way to know what
   * an account would actually get them - the locked sections were both blurred
   * and absent from the contents.
   */
  const navigableSections = useMemo(
    () => SECTION_NAV_ITEMS.filter((item) => visibleSectionSet.has(item.key)),
    [visibleSectionSet],
  );
  const showDecisionBrief = Boolean(
    draft.decisionBrief && (visibleSections === undefined || visibleSectionSet.has("build")),
  );
  const initialNavSection = navigableSections[0]?.key ?? orderedVisibleSectionKeys[0] ?? "customer";
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
  const [activeNavSection, setActiveNavSection] = useState<IcpFolioSectionKey>(initialNavSection);
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
      setActiveNavSection(initialNavSection);
      setDismissedSection(null);
      setExplainerPosition(null);
    }
  }, [blurred, initialNavSection]);

  useEffect(() => {
    if (!navigableSections.some((item) => item.key === activeNavSection)) {
      setActiveNavSection(initialNavSection);
    }
  }, [activeNavSection, initialNavSection, navigableSections]);

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

  useEffect(() => {
    const syncActiveNavSection = () => {
      const sectionEntries = navigableSections.map(({ key }) => {
        const node = sectionRefs.current[key];
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return { key, rect };
      }).filter(
        (entry): entry is { key: IcpFolioSectionKey; rect: DOMRect } => Boolean(entry),
      );

      if (sectionEntries.length === 0) return;

      const viewportAnchor = window.innerHeight * 0.28;
      const nearestSection = sectionEntries.reduce((current, entry) => {
        const currentDistance = Math.abs(current.rect.top - viewportAnchor);
        const entryDistance = Math.abs(entry.rect.top - viewportAnchor);
        return entryDistance < currentDistance ? entry : current;
      });

      setActiveNavSection(nearestSection.key);
    };

    syncActiveNavSection();
    window.addEventListener("scroll", syncActiveNavSection, true);
    window.addEventListener("resize", syncActiveNavSection);

    return () => {
      window.removeEventListener("scroll", syncActiveNavSection, true);
      window.removeEventListener("resize", syncActiveNavSection);
    };
  }, [navigableSections]);

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

  const handleJumpToSection = (sectionKey: IcpFolioSectionKey) => {
    // A gated section is rendered but unreadable, so scrolling to it would land
    // the reader in blur with no explanation. Send them to the gate instead -
    // that is the thing standing between them and the section they asked for.
    if (lockedSectionSet.has(sectionKey)) {
      document.getElementById("icp-unlock")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const sectionNode = sectionRefs.current[sectionKey];
    if (!sectionNode) return;

    setActiveNavSection(sectionKey);
    sectionNode.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderedSections: Record<IcpFolioSectionKey, ReactNode> = {
    customer: (
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
        <div id="icp-section-customer">
          {/* Document header — branded masthead */}
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-primary/10 bg-gradient-to-r from-primary/5 to-transparent px-4 py-3">
            <img
              src="/lovable-uploads/04a4b9d0-4213-4186-ba00-c7acd22bad98.png"
              alt="Creatives Takeover"
              className="h-7 w-7 flex-shrink-0 rounded-md object-cover"
              draggable={false}
            />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
              {documentLabel}
            </p>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
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
    ),
    pain: (
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
        <div id="icp-section-pain" className="border-t border-border/80 pt-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground dark:text-foreground/88">
            Core pain point
          </h2>
          <blockquote className="mt-6 border-l border-border/80 pl-5 text-xl italic leading-9 text-foreground sm:text-2xl">
            "{draft.pain.quote}"
          </blockquote>

          <dl className="mt-8 grid gap-6 sm:grid-cols-2">
            {[
              { label: "Root cause", value: draft.pain.rootCause, path: "pain.rootCause" },
              { label: "Why it hurts", value: draft.pain.whyItHurts, path: "pain.whyItHurts" },
              { label: "Trigger moment", value: draft.pain.triggerMoment, path: "pain.triggerMoment" },
              { label: "Cost of inaction", value: draft.pain.costOfInaction, path: "pain.costOfInaction" },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-sm font-semibold text-foreground dark:text-foreground/88">
                  {item.label}
                </dt>
                <dd className="mt-2 text-sm leading-7 text-foreground">
                  <DraftValue draft={draft} path={item.path} value={item.value} />
                </dd>
              </div>
            ))}
          </dl>

          <SectionEvidenceNote evidence={draft.pain.evidence} />
        </div>
      </DocumentSection>
    ),
    build: (
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
        <div id="icp-section-build" className="border-t border-border/80 pt-10">
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
    ),
    moat: (
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
        <div id="icp-section-moat" className="border-t border-border/80 pt-10">
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
                  <DraftValue draft={draft} path="moat.whyHardToCopy" value={draft.moat.whyHardToCopy} />
                </dd>
              </div>
            </dl>

            <div>
              <h3 className="text-sm font-semibold text-foreground dark:text-foreground/88">
                Why incumbents miss it
              </h3>
              <p className="mt-2 text-sm leading-7 text-foreground">
                <DraftValue draft={draft} path="moat.incumbentGap" value={draft.moat.incumbentGap} />
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
                <DraftValue draft={draft} path="competition.exploitableGap" value={draft.competition.exploitableGap} />
              </p>
            </div>

            <SectionEvidenceNote
              evidence={draft.competition.evidence}
              title="Competitive evidence"
            />
          </div>
        </div>
      </DocumentSection>
    ),
  };

  const wrapperClasses =
    layout === "embedded"
      ? "px-0 pb-0 pt-0"
      : tone === "platformPreview"
        ? "px-4 pb-12 pt-6 sm:px-6 lg:px-8"
        : "px-4 pb-12 pt-8 sm:px-6 lg:px-8";

  const surfaceBlurClasses = blurred ? "pointer-events-none select-none blur-[14px]" : "";
  const lockedSurfaceClasses = blurred ? "" : "pointer-events-none select-none blur-[12px] opacity-90";

  // The decision brief is a synthesis, so it reads as a conclusion rather than
  // an opener. When any section is gated it moves behind the gate with them -
  // it is the highest-value block in the draft and the reason to create an
  // account. With nothing gated (a saved draft) it simply closes the document.
  const briefIsLocked = lockedVisibleSectionKeys.length > 0;
  const decisionBriefNode =
      showDecisionBrief && draft.decisionBrief ? (
        <section className="mb-10 rounded-2xl border border-primary/20 bg-primary/[0.035] p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Customer Decision Brief
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Who to serve first and what to validate
          </h2>

          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-semibold text-foreground">Primary segment</dt>
              <dd className="mt-1 text-sm leading-6 text-foreground/75"><DraftValue draft={draft} path="decisionBrief.primarySegment" value={draft.decisionBrief.primarySegment} /></dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-foreground">Not the first segment</dt>
              <dd className="mt-1 text-sm leading-6 text-foreground/75"><DraftValue draft={draft} path="decisionBrief.nonFitSegment" value={draft.decisionBrief.nonFitSegment} /></dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-foreground">Buying trigger</dt>
              <dd className="mt-1 text-sm leading-6 text-foreground/75"><DraftValue draft={draft} path="decisionBrief.buyingTrigger" value={draft.decisionBrief.buyingTrigger} /></dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-foreground">Current alternative</dt>
              <dd className="mt-1 text-sm leading-6 text-foreground/75"><DraftValue draft={draft} path="decisionBrief.currentAlternative" value={draft.decisionBrief.currentAlternative} /></dd>
            </div>
          </dl>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-foreground">Ranked pains</h3>
            <ol className="mt-3 space-y-3">
              {draft.decisionBrief.rankedPains.map((item) => (
                <li key={`${item.rank}-${item.pain}`} className="rounded-xl border border-border/70 bg-background/80 p-3">
                  <p className="text-sm font-semibold text-foreground">{item.rank}. {item.pain}</p>
                  <p className="mt-1 text-xs leading-5 text-foreground/60">{item.evidence}</p>
                </li>
              ))}
            </ol>
          </div>

          {draft.decisionBrief.reachableChannels.length ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-foreground">Reachable channels</h3>
              <p className="mt-2 text-sm leading-6 text-foreground/75">
                {draft.decisionBrief.reachableChannels.join(" · ")}
              </p>
            </div>
          ) : null}

          <div className="mt-6 border-t border-border/70 pt-5">
            <h3 className="text-sm font-semibold text-foreground">Five interview validation plan</h3>
            <ol className="mt-3 space-y-3">
              {draft.decisionBrief.interviewValidationPlan.map((item) => (
                <li key={item.step} className="text-sm leading-6 text-foreground/75">
                  <span className="font-semibold text-foreground">{item.step}. {item.question}</span>
                  <span className="block text-xs leading-5 text-foreground/60">Success signal: {item.successSignal}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null;

  return (
    <div className={`${wrapperClasses} ${className}`}>
      <div className="mx-auto w-full max-w-4xl">
        {topBar ? <div className="mb-6">{topBar}</div> : null}

        <div className={surfaceBlurClasses}>
          <div className="relative mx-auto w-full max-w-4xl">
            <aside className="absolute left-0 top-0 hidden w-56 -translate-x-[calc(100%+2rem)] xl:block">
            <div className="sticky top-24">
              <nav
                aria-label="ICP draft sections"
                className="rounded-xl border border-border/70 bg-background/92 p-3 text-sm backdrop-blur-sm transition-colors"
              >
                <p className="px-2 pb-3 text-label font-semibold uppercase tracking-[0.16em] text-foreground/60">
                  Jump to section
                </p>
                <div className="space-y-1">
                  {navigableSections.map((item) => {
                    const isLocked = lockedSectionSet.has(item.key);
                    const isActive = !isLocked && item.key === activeNavSection;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleJumpToSection(item.key)}
                        title={isLocked ? "Create a free account to read this section" : undefined}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors ${
                          isActive
                            ? "bg-foreground/[0.06] text-foreground"
                            : isLocked
                              ? "text-foreground/45 hover:bg-foreground/[0.04] hover:text-foreground/70"
                              : "text-foreground/68 hover:bg-foreground/[0.04] hover:text-foreground"
                        }`}
                        aria-current={isActive ? "true" : undefined}
                      >
                        <span>{item.label}</span>
                        {isLocked ? (
                          <Lock className="h-3 w-3 shrink-0 text-foreground/40" aria-label="Locked" />
                        ) : (
                          <span
                            className={`h-2 w-2 rounded-full transition-colors ${
                              isActive ? "bg-primary" : "bg-border"
                            }`}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </nav>
            </div>
          </aside>

            <article
              ref={articleRef}
              className="relative w-full overflow-hidden rounded-2xl border border-border/40 bg-background px-6 py-8 text-foreground shadow-[0_2px_24px_-8px_hsl(var(--foreground)/0.07)] transition-colors sm:px-10 sm:py-10"
            >
              {/* Watermark — elegantly branded, visible but unobtrusive.
                  Hidden during PDF capture (the export stamps the brand on every
                  page instead via data-icp-watermark). */}
              <div
                data-icp-watermark
                className="pointer-events-none absolute bottom-6 right-6 z-10 flex select-none flex-col items-center gap-1 opacity-30"
                aria-hidden
              >
                <img
                  src="/lovable-uploads/04a4b9d0-4213-4186-ba00-c7acd22bad98.png"
                  alt=""
                  className="h-9 w-9 rounded-lg object-cover"
                  draggable={false}
                />
                <span className="text-caption font-semibold uppercase tracking-[0.18em] text-foreground">
                  Creatives Takeover
                </span>
              </div>
              {ideaDescription?.trim() ? (
                <section className="mb-10 border-b border-border/60 pb-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">
                        Your idea
                      </p>
                      <p className="mt-3 text-xl leading-8 text-foreground sm:text-2xl sm:leading-9">
                        {ideaDescription.trim()}
                      </p>
                    </div>
                    <ViabilityBadge draft={draft} />
                  </div>
                </section>
              ) : null}
              {unlockedVisibleSectionKeys.map((sectionKey) => (
                <div key={sectionKey}>{renderedSections[sectionKey]}</div>
              ))}
              {briefIsLocked ? null : decisionBriefNode}

              {lockedVisibleSectionKeys.length > 0 ? (
                <>
                  {lockedSectionBreak ? (
                    <div className="border-t border-border/80 pt-10">
                      {lockedSectionBreak}
                    </div>
                  ) : null}
                  <div
                    className={lockedSurfaceClasses}
                    aria-hidden={lockedSurfaceClasses.length > 0}
                    inert={lockedSurfaceClasses.length > 0 ? true : undefined}
                  >
                    {briefIsLocked ? decisionBriefNode : null}
                    {lockedVisibleSectionKeys.map((sectionKey) => (
                      <div key={sectionKey}>{renderedSections[sectionKey]}</div>
                    ))}
                  </div>
                </>
              ) : null}

              {draft.sources && draft.sources.length > 0 ? (
                <div className="mt-12 border-t border-border/80 pt-8">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground/60">
                    Evidence &amp; sources
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-foreground/65">
                    Grounded in real customer discussions and competitor research — not generic AI guesses.
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {draft.sources.map((source, index) => {
                      const label = source.type === "competitor" ? "Competitor" : source.type === "market" ? "Market" : "Community";
                      const content = (
                        <>
                          <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-caption font-semibold uppercase tracking-wide text-primary">
                            {label}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">{source.title}</span>
                            {source.detail ? (
                              <span className="block text-xs text-foreground/55">{source.detail}</span>
                            ) : null}
                          </span>
                          {source.url ? (
                            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/40" aria-hidden />
                          ) : null}
                        </>
                      );
                      return (
                        <li key={`${source.title}-${index}`}>
                          {source.url ? (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
                            >
                              {content}
                            </a>
                          ) : (
                            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5">
                              {content}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

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
        </div>

        {bottomBar ? <div className="mt-6">{bottomBar}</div> : null}
        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>
    </div>
  );
}
