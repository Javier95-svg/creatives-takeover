// CommunityPage is now replaced by MentorMarketplaceHub
// This file redirects old community routes to the new marketplace
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MentorMarketplaceHub from "./community/MentorMarketplaceHub";
import { useActivationGate } from "@/hooks/useActivationGate";

const CommunityPage = () => {
  const navigate = useNavigate();
  const activationGate = useActivationGate();

  useEffect(() => {
    const communityAllowedIntent =
      activationGate.activationIntent === 'find_mentor' ||
      activationGate.activationIntent === 'save_mentor' ||
      activationGate.activationIntent === 'send_message' ||
      activationGate.activationIntent === 'book_call';

    if (!activationGate.shouldEnforceGate || communityAllowedIntent) {
      return;
    }

    // FIX(retention): community — forced-gate users can only browse mentors as a first-session path when mentor discovery is their selected activation route.
    navigate(activationGate.redirectUrl, { replace: true });
  }, [activationGate.activationIntent, activationGate.redirectUrl, activationGate.shouldEnforceGate, navigate]);

  if (activationGate.loading) {
    return null;
  }

  return <MentorMarketplaceHub />;
};

export default CommunityPage;
