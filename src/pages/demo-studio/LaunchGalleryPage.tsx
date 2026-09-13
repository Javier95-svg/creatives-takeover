import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import SEO from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { listPublicLaunches, type PublicLaunchSummary } from '@/lib/demoStudio/api';
import { buildArtifactReferralPath, trackArtifactReferralClicked } from '@/lib/artifactReferral';

// Keep in sync with MIN_GALLERY_SIZE in api/public-entity.ts, which decides the
// robots meta and sitemap inclusion server-side. The edge runtime cannot import
// from src/, so the constant is duplicated on purpose.
const MIN_GALLERY_SIZE = 12;

export default function LaunchGalleryPage() {
  const [launches, setLaunches] = useState<PublicLaunchSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const rows = await listPublicLaunches();
        if (active) setLaunches(rows);
      } catch {
        if (active) setLaunches([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Below the threshold we deliberately do not render a grid. A three-card
  // gallery is thin content and it publicly advertises that nobody is here.
  const showGrid = launches.length >= MIN_GALLERY_SIZE;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Founder Launches | Creatives Takeover"
        description="Real products founders are validating right now on Creatives Takeover. Each launch page carries an interactive demo, a founder pitch, and an early access list."
        url="/launches"
        canonical="https://creatives-takeover.com/launches"
        noindex={!showGrid}
      />
      <Navigation />
      <main className="container mx-auto max-w-6xl px-4 pt-28 pb-20 md:pt-32">
        <header className="mb-10 max-w-2xl">
          <h1 className="creatives-font text-3xl font-bold md:text-5xl">Founder launches</h1>
          <p className="mt-4 text-muted-foreground">
            Real products founders are validating right now. Every page here carries an interactive demo,
            a founder pitch, and an early access list.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : showGrid ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {launches.map((launch) => (
              <Link key={launch.slug} to={`/p/${launch.slug}`} className="group">
                <Card className="h-full transition-shadow hover:shadow-lg">
                  <CardContent className="flex h-full flex-col gap-3 pt-6">
                    <div className="flex items-center gap-3">
                      {launch.logo_url ? (
                        <img
                          src={launch.logo_url}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-base font-bold text-primary">
                          {launch.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold group-hover:underline">{launch.name}</span>
                    </div>
                    <p className="flex-1 text-sm text-muted-foreground">
                      {launch.headline || launch.tagline || 'See the demo and founder pitch.'}
                    </p>
                    {launch.category && (
                      <Badge variant="secondary" className="w-fit">{launch.category}</Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="space-y-4 py-12 text-center">
              <h2 className="text-xl font-semibold">Be one of the first</h2>
              <p className="mx-auto max-w-xl text-muted-foreground">
                This gallery opens once enough founders have published. Build your launch page now and
                you will be on it from day one.
              </p>
              <Button asChild className="gap-2">
                <Link to="/demo-studio">
                  Build your launch page free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {showGrid && (
          <div className="mt-12 rounded-2xl border border-border bg-muted/30 p-6 text-center">
            <p className="text-base font-semibold">Want your product on this page?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Interactive demo, founder pitch, and email capture. Free to start, no code.
            </p>
            <Button asChild className="mt-4">
              <Link
                to={buildArtifactReferralPath('demo_launch')}
                onClick={() => trackArtifactReferralClicked('demo_launch', 'gallery_card')}
              >
                Build your launch page free
              </Link>
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
