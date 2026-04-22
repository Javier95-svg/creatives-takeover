import { useEffect, useMemo, useRef, useState } from "react";

import { IcpFolioDocument } from "@/components/icp/IcpFolioDocument";
import { Button } from "@/components/ui/button";
import {
  SAMPLE_ICP_PREVIEW_SAMPLES,
  SAMPLE_ICP_SECTION_EXPLAINERS,
  type IcpSampleProfileKey,
} from "@/components/icp/sampleIcpPreviewData";

const DEFAULT_SAMPLE_KEY: IcpSampleProfileKey = "ai_powered_personal_finance_coach";
const TRANSITION_MS = 180;

export function IcpSamplePreviewSection() {
  const timeoutRef = useRef<number | null>(null);
  const [activeSampleKey, setActiveSampleKey] =
    useState<IcpSampleProfileKey>(DEFAULT_SAMPLE_KEY);
  const [renderedSampleKey, setRenderedSampleKey] =
    useState<IcpSampleProfileKey>(DEFAULT_SAMPLE_KEY);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const renderedSample = useMemo(
    () =>
      SAMPLE_ICP_PREVIEW_SAMPLES.find((sample) => sample.key === renderedSampleKey) ??
      SAMPLE_ICP_PREVIEW_SAMPLES[0],
    [renderedSampleKey],
  );

  const handleSelectSample = (sampleKey: IcpSampleProfileKey) => {
    if (sampleKey === activeSampleKey) return;

    setActiveSampleKey(sampleKey);
    setIsDocumentVisible(false);

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setRenderedSampleKey(sampleKey);
      setIsDocumentVisible(true);
      timeoutRef.current = null;
    }, TRANSITION_MS);
  };

  return (
    <section className="mt-14 sm:mt-16" aria-labelledby="icp-samples-title">
      <div className="space-y-8">
        <div className="space-y-4 text-center">
          <h2
            id="icp-samples-title"
            className="takeover-gradient creatives-font pb-3 text-4xl font-semibold leading-[1.12] tracking-tight sm:pb-4 sm:text-5xl"
          >
            Samples
          </h2>
          <p className="mx-auto max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            These are real ICP draft examples across different business profiles. Hover over any section to see what it is and why it matters.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SAMPLE_ICP_PREVIEW_SAMPLES.map((sample) => {
            const isActive = sample.key === activeSampleKey;

            return (
              <Button
                key={sample.key}
                type="button"
                variant={isActive ? "default" : "outline"}
                className="h-auto min-h-[56px] whitespace-normal px-4 py-3 text-center text-sm leading-5"
                onClick={() => handleSelectSample(sample.key)}
                aria-pressed={isActive}
              >
                {sample.label}
              </Button>
            );
          })}
        </div>

        <div
          className={`transition-all duration-300 motion-reduce:transition-none ${
            isDocumentVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <IcpFolioDocument
            key={renderedSample.key}
            draft={renderedSample.draft}
            documentLabel={`ICP Draft: ${renderedSample.label}`}
            tone="landingPreview"
            layout="embedded"
            sectionExplainers={SAMPLE_ICP_SECTION_EXPLAINERS}
          />
        </div>
      </div>
    </section>
  );
}
