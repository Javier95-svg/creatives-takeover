import ctLogo from '@/assets/ct-logo-polished-borders.webp';
import { useWorkspaceFrame } from '@/contexts/WorkspaceFrameContext';

/**
 * What the workspace looks like while it is still resolving.
 *
 * Every gate on the way in used to render one line of text on an empty
 * background, and there are two of them in sequence on a full page load: the
 * session restore, then the profile read that decides whether onboarding is
 * still owed. A signed-in founder opening a link therefore stared at a black
 * page with five words on it for as long as both round trips took, up to the
 * 5s bootstrap watchdog. Nothing about that says "loading" rather than "broken".
 *
 * Drawing the shell instead costs nothing and is honest: the sidebar, header and
 * content area are exactly where they will be a moment later, so the page
 * resolves into place rather than replacing itself.
 */
export function WorkspaceSkeleton({ label = 'Loading your workspace…' }: { label?: string }) {
  // Inside the shell only the content area is still resolving, and drawing a
  // second sidebar and header over the real ones would look broken rather than
  // loading. The frame context is exactly the signal for that.
  const inShell = useWorkspaceFrame();
  if (inShell) return <WorkspaceContentSkeleton label={label} />;
  return (
    <div role="status" aria-live="polite" className="flex h-dvh overflow-hidden bg-background text-foreground">
      <span className="sr-only">{label}</span>

      <aside aria-hidden="true" className="hidden h-dvh w-72 shrink-0 flex-col border-r border-border/70 bg-card px-4 pb-3 pt-5 md:flex">
        <div className="flex items-center gap-3 px-2">
          <img src={ctLogo} alt="" className="h-10 w-10 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="truncate font-space-grotesk text-sm font-semibold text-foreground">Creatives Takeover</p>
            <p className="text-xs text-foreground">Think. Test. Ship.</p>
          </div>
        </div>
        <div className="mt-9 space-y-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-button bg-muted/40" />
          ))}
        </div>
        <div className="mt-auto flex items-center gap-3 border-t border-border/60 px-2 pt-4">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted/40" />
          <div className="h-4 w-28 animate-pulse rounded bg-muted/40" />
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header aria-hidden="true" className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-card/60 px-3 md:pl-5 lg:pl-8">
          <div className="h-10 w-full max-w-sm animate-pulse rounded-card bg-muted/40" />
          <div className="flex shrink-0 items-center gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-9 w-9 animate-pulse rounded-lg bg-muted/40" />
            ))}
          </div>
        </header>

        <div aria-hidden="true" className="min-h-0 flex-1 overflow-hidden px-6 pt-10 lg:px-12">
          <div className="mx-auto w-full max-w-3xl space-y-4">
            <div className="mx-auto h-8 w-40 animate-pulse rounded-full bg-muted/40" />
            <div className="h-14 w-full animate-pulse rounded-card bg-muted/30" />
            <div className="h-14 w-4/5 animate-pulse rounded-card bg-muted/30" />
            <div className="space-y-3 pt-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-4 w-2/3 animate-pulse rounded bg-muted/30" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default WorkspaceSkeleton;

/** Just the reading area, for when the real sidebar and header are already up. */
export function WorkspaceContentSkeleton({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="px-6 pt-10 lg:px-12">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="mx-auto w-full max-w-3xl space-y-4">
        <div className="mx-auto h-8 w-40 animate-pulse rounded-full bg-muted/40" />
        <div className="h-14 w-full animate-pulse rounded-card bg-muted/30" />
        <div className="h-14 w-4/5 animate-pulse rounded-card bg-muted/30" />
        <div className="space-y-3 pt-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-4 w-2/3 animate-pulse rounded bg-muted/30" />
          ))}
        </div>
      </div>
    </div>
  );
}
