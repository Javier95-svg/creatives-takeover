import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, LayoutDashboard, Users, TrendingUp, ArrowRight, Sparkles } from "lucide-react";

interface Profile {
  first_name: string | null;
  credits: number | null;
}

const quickActions = [
  {
    title: "BizMap AI",
    description: "Build your business plan with AI",
    href: "/bizmap-ai",
    icon: Bot,
    colorClass: "text-planning",
    bgClass: "bg-planning/10",
  },
  {
    title: "My Dashboard",
    description: "Track your projects and milestones",
    href: "/dashboard",
    icon: LayoutDashboard,
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
  },
  {
    title: "Community",
    description: "Connect with mentors and co-founders",
    href: "/mentorship",
    icon: Users,
    colorClass: "text-action",
    bgClass: "bg-action/10",
  },
  {
    title: "Fundraising",
    description: "Find VCs, accelerators, and angels",
    href: "/insighta",
    icon: TrendingUp,
    colorClass: "text-growth",
    bgClass: "bg-growth/10",
  },
];

const SignedInHome = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, credits")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [user]);

  const firstName =
    profile?.first_name ||
    user?.user_metadata?.full_name?.split(" ")[0] ||
    "there";
  const credits = profile?.credits ?? 0;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="py-12 px-4 sm:px-6 min-h-[70vh]">
      <div className="container mx-auto max-w-5xl">
        {/* Welcome header */}
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-1">{today}</p>
          <h1 className="text-3xl sm:text-4xl font-space-grotesk font-semibold">
            Welcome back,{" "}
            <span className="text-primary capitalize">{firstName}</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            What are you building today?
          </p>
        </div>

        {/* Credits badge */}
        <div className="flex items-center gap-2 mb-8">
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            {credits} credits available
          </Badge>
          <Link
            to="/pricing"
            className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors"
          >
            Get more
          </Link>
        </div>

        {/* Quick actions grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} to={action.href}>
                <Card className="group hover:shadow-md hover:border-primary/30 transition-all duration-200 h-full cursor-pointer">
                  <CardContent className="flex items-center gap-4 p-5">
                    <div
                      className={`w-12 h-12 rounded-xl ${action.bgClass} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}
                    >
                      <Icon className={`w-6 h-6 ${action.colorClass}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground">
                        {action.title}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {action.description}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Suggested next step */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6">
            <div className="flex-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                Suggested next step
              </div>
              <p className="font-medium text-foreground">
                Validate your business idea with our AI tools
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Use BizMap AI to define your ICP, run market analysis, and build
                your MVP plan.
              </p>
            </div>
            <Button asChild className="flex-shrink-0">
              <Link to="/bizmap-ai">
                Start now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignedInHome;
