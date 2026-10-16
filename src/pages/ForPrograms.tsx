import AudienceLandingPage from "@/components/audience/AudienceLandingPage";
import CohortProgressPreview from "@/components/audience/CohortProgressPreview";
import ImpactReportPreview from "@/components/audience/ImpactReportPreview";
import { FOR_PROGRAMS } from "@/data/audiencePages";

const ForPrograms = () => (
  <AudienceLandingPage
    content={FOR_PROGRAMS}
    preview={
      <>
        <CohortProgressPreview />
        <ImpactReportPreview />
      </>
    }
  />
);

export default ForPrograms;
