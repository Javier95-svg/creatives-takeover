import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Plus, Mic } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PodcastWallpaper from "@/components/wallpapers/PodcastWallpaper";
import PodcastHero from "@/components/podcast/PodcastHero";
import PodcastEpisodeBanner from "@/components/podcast/PodcastEpisodeBanner";
import PodcastPlayerModal from "@/components/podcast/PodcastPlayerModal";
import PodcastEpisodeFormDialog from "@/components/podcast/PodcastEpisodeFormDialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  usePodcastEpisodes,
  type PodcastEpisode,
  type PodcastEpisodeInput,
} from "@/hooks/usePodcastEpisodes";

const Podcast = () => {
  const {
    episodes,
    isLoading,
    isSaving,
    isAdmin,
    createEpisode,
    updateEpisode,
    deleteEpisode,
  } = usePodcastEpisodes();

  const [playing, setPlaying] = useState<PodcastEpisode | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PodcastEpisode | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PodcastEpisode | null>(null);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (episode: PodcastEpisode) => {
    setEditing(episode);
    setFormOpen(true);
  };

  const handleSubmit = (input: PodcastEpisodeInput) =>
    editing ? updateEpisode(editing.id, input) : createEpisode(input);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteEpisode(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <>
      <Helmet>
        <title>Founders Unleashed — Podcast | Creatives Takeover</title>
        <meta
          name="description"
          content="Founders Unleashed: conversations with founders building real products, told as stories, not pitches. Unusual paths, contrarian bets, and the hard moments behind the company — watch every episode inside Creatives Takeover."
        />
        <meta property="og:title" content="Founders Unleashed — Podcast | Creatives Takeover" />
        <meta
          property="og:description"
          content="A series of conversations with founders building real products, told as stories, not pitches."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://creatives-takeover.com/podcast" />
        <meta property="og:site_name" content="Creatives Takeover" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://creatives-takeover.com/podcast" />
        {/* Warm up YouTube connections so the in-platform player starts faster on click. */}
        <link rel="preconnect" href="https://www.youtube-nocookie.com" />
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="preconnect" href="https://www.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://googlevideo.com" />
        <link rel="dns-prefetch" href="https://yt3.ggpht.com" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <PodcastWallpaper />
        <Navigation />

        <main className="relative pb-20">
          {/* Hero */}
          <section className="relative flex min-h-[78vh] items-center justify-center overflow-hidden sm:min-h-[82vh] z-10">
            <PodcastHero />
          </section>

          {/* Episodes */}
          <section className="relative z-10 -mt-6">
            <div className="container mx-auto max-w-5xl px-4 sm:px-6">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Episodes</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tap any episode to watch it right here.
                  </p>
                </div>
                {isAdmin && (
                  <Button onClick={openAdd} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add episode
                  </Button>
                )}
              </div>

              {isLoading ? (
                <div className="space-y-5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/50 p-4 sm:flex-row"
                    >
                      <div className="aspect-video w-full shrink-0 animate-pulse rounded-xl bg-muted sm:w-72 lg:w-80" />
                      <div className="flex-1 space-y-3 py-2">
                        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : episodes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 px-6 py-16 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Mic className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">No episodes yet</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                    {isAdmin
                      ? "Add your first episode to kick off Founders Unleashed."
                      : "New episodes are on the way. Check back soon."}
                  </p>
                  {isAdmin && (
                    <Button onClick={openAdd} className="mt-5 gap-2">
                      <Plus className="h-4 w-4" />
                      Add episode
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {episodes.map((episode) => (
                    <PodcastEpisodeBanner
                      key={episode.id}
                      episode={episode}
                      isAdmin={isAdmin}
                      onPlay={setPlaying}
                      onEdit={openEdit}
                      onDelete={setPendingDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>

        <Footer />
      </div>

      {/* In-platform player */}
      {playing && (
        <PodcastPlayerModal
          videoId={playing.youtube_video_id}
          title={playing.title}
          onClose={() => setPlaying(null)}
        />
      )}

      {/* Admin add / edit */}
      {isAdmin && (
        <PodcastEpisodeFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          episode={editing}
          isSaving={isSaving}
          onSubmit={handleSubmit}
        />
      )}

      {/* Admin delete confirm */}
      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this episode?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” will be removed from the podcast. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Podcast;
