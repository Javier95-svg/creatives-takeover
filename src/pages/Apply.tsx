import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

import { rememberIntendedAccountType } from "@/lib/intendedAccountType";

// /apply?as=mentor|marketplace, linked from the homepage on 2026-11-07. Mentors
// and providers now apply inside the onboarding after creating an account, so
// this only carries the role over and sends people to sign-up, where the
// onboarding pre-selects it.

const Apply = () => {
  const [params] = useSearchParams();
  // Stored on the first render: Navigate's own effect runs before this
  // component's effects would, so an effect here could miss the redirect.
  useState(() => {
    const as = params.get("as");
    if (as === "mentor" || as === "marketplace") rememberIntendedAccountType(as);
    return null;
  });

  return <Navigate to="/signup" replace />;
};

export default Apply;
