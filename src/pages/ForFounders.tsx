import AudienceLandingPage from "@/components/audience/AudienceLandingPage";
import StageToolsStrip from "@/components/audience/StageToolsStrip";
import { FOR_FOUNDERS } from "@/data/audiencePages";

const ForFounders = () => <AudienceLandingPage content={FOR_FOUNDERS} preview={<StageToolsStrip />} />;

export default ForFounders;
