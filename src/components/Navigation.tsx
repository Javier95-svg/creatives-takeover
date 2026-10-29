import { lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import VisitorNavbar from "@/components/VisitorNavbar";
import { useWorkspaceFrame } from '@/contexts/WorkspaceFrameContext';

// The signed-in navbar pulls in messaging, notifications, credits, dropdowns and
// dialogs (~45KB gz). Visitors never see it, so it loads only once auth knows
// there is a user; visitors get the same VisitorNavbar as before, without it.
const MemberNavigation = lazy(() => import("@/components/navigation/MemberNavigation"));

const Navigation = () => {
  const inWorkspace = useWorkspaceFrame();
  const { user, loading } = useAuth();
  if (inWorkspace || loading) return null;
  if (!user) return <VisitorNavbar />;
  return (
    <Suspense fallback={null}>
      <MemberNavigation />
    </Suspense>
  );
};

export default Navigation;
