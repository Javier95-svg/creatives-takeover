import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { captureEvent } from "@/lib/analytics";

type SoftGateProps = {
  children: ReactNode;
};

const SoftGate = ({ children }: SoftGateProps) => {
  const trackSignupClick = () => {
    captureEvent("explore_signup_clicked", {
      location: "soft_gate",
    });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="pointer-events-none select-none blur-sm opacity-65">
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex min-h-[320px] flex-col items-center justify-center gap-4 bg-slate-950/80 p-8 text-center backdrop-blur-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200">
          <Lock className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">You're seeing a preview</h2>
          <p className="max-w-md text-sm leading-6 text-slate-300">
            Sign up to join the conversation, follow other founders, and see everything the community is building.
          </p>
        </div>
        <Button asChild>
          <Link to="/signup?source=explore_soft_gate" onClick={trackSignupClick}>
            Join free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Link to="/login" className="text-sm text-slate-400 underline underline-offset-4 hover:text-white">
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  );
};

export default SoftGate;
