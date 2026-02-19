import { Navigate, useLocation } from "react-router-dom";
import { sanitizeReturnPath } from "@/lib/authRedirect";

const AuthEntryRedirect = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const source = params.get("source");
  const requestedTab = params.get("tab");
  const requestedReturn = params.get("return") || params.get("redirect");
  const safeReturn = sanitizeReturnPath(requestedReturn, "/dashboard");

  const targetPath = requestedTab === "signup" ? "/signup" : "/login";
  const targetParams = new URLSearchParams();

  if (source) {
    targetParams.set("source", source);
  }

  if (safeReturn !== "/dashboard") {
    targetParams.set("return", safeReturn);
  }

  const targetUrl = targetParams.toString()
    ? `${targetPath}?${targetParams.toString()}`
    : targetPath;

  return <Navigate to={targetUrl} replace />;
};

export default AuthEntryRedirect;
