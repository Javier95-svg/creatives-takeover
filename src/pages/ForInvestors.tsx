import AudienceLandingPage from "@/components/audience/AudienceLandingPage";
import TeamProgressPreview from "@/components/audience/TeamProgressPreview";
import { FOR_INVESTORS } from "@/data/audiencePages";

const ForInvestors = () => <AudienceLandingPage content={FOR_INVESTORS} preview={<TeamProgressPreview />} />;

export default ForInvestors;
