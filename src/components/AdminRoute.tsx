import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  if (user?.email?.toLowerCase() !== "admin@creatives-takeover.com") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export default AdminRoute;
