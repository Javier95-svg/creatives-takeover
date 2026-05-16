import { Link } from "react-router-dom";
import { Compass, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { captureEvent } from "@/lib/analytics";

const ExploreHeader = () => {
  const trackSignupClick = () => {
    captureEvent("explore_signup_clicked", {
      location: "explore_header",
    });
  };

  return (
    <header className="space-y-6 text-center">
      <Badge className="rounded-full border-blue-400/30 bg-blue-500/10 px-4 py-1 text-blue-200">
        Founder community preview
      </Badge>
      <div className="space-y-4">
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          See what founders are building in public
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
          Explore founder milestones, questions, behind-the-scenes updates, and early traction signals before you join the conversation.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild>
          <Link to="/signup?source=explore_header" onClick={trackSignupClick}>
            Join Creatives Takeover
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/login">
            <Compass className="h-4 w-4" />
            Sign in
          </Link>
        </Button>
      </div>
    </header>
  );
};

export default ExploreHeader;
