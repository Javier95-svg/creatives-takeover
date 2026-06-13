import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CommunityFeed from "@/components/community/CommunityFeed";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Megaphone, TrendingUp } from "lucide-react";

const ProgressCommunityPage = () => {
  return (
    <>
      <Helmet>
        <title>Founder Progress Feed | Creatives Takeover</title>
        <meta
          name="description"
          content="Share weekly momentum, milestones, and startup progress with founders building in public."
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container mx-auto px-4 pt-header-offset pb-8 space-y-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <div className="max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border border-primary/20 bg-primary/10 px-3 py-1 text-label font-semibold uppercase tracking-[0.18em] text-primary hover:bg-primary/10">
                    <Megaphone className="h-3.5 w-3.5 mr-1" />
                    Founder progress
                  </Badge>
                </div>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                  Build in public with visible momentum.
                </h1>
                <p className="text-sm sm:text-base leading-7 text-muted-foreground max-w-2xl">
                  Share the weekly update, milestone, or hard lesson that proves your startup is moving. The point is not polished storytelling. The point is visible progress.
                </p>
                <div className="grid gap-3 sm:grid-cols-3 pt-2">
                  <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                    <div className="mb-2 flex items-center gap-2 text-label font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Share
                    </div>
                    <p className="text-sm text-foreground">Weekly updates, launches, traction, and pivots.</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                    <div className="mb-2 flex items-center gap-2 text-label font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <Flame className="h-3.5 w-3.5 text-warning" />
                      Signal
                    </div>
                    <p className="text-sm text-foreground">Consistency matters more than polished positioning.</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                    <div className="mb-2 flex items-center gap-2 text-label font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <Megaphone className="h-3.5 w-3.5" />
                      Feedback
                    </div>
                    <p className="text-sm text-foreground">Let other founders react to real movement, not private plans.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <CommunityFeed />
        </main>

        <Footer />
      </div>
    </>
  );
};

export default ProgressCommunityPage;
