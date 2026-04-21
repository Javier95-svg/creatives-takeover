import { IcpFolioDocument } from "@/components/icp/IcpFolioDocument";
import {
  SAMPLE_ICP_PREVIEW_DRAFT,
  SAMPLE_ICP_SECTION_EXPLAINERS,
} from "@/components/icp/sampleIcpPreviewData";

export function IcpSamplePreviewSection() {
  return (
    <section className="mt-14 sm:mt-16" aria-label="Sample ICP draft preview">
      <IcpFolioDocument
        draft={SAMPLE_ICP_PREVIEW_DRAFT}
        tone="landingPreview"
        layout="embedded"
        sectionExplainers={SAMPLE_ICP_SECTION_EXPLAINERS}
      />
    </section>
  );
}
