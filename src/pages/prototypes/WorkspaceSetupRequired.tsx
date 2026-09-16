import { Link, useLocation } from 'react-router-dom';

export default function WorkspaceSetupRequired({ embedded = false }: { embedded?: boolean }) {
  const { pathname } = useLocation();
  return <main className={`${embedded ? 'min-h-full' : 'min-h-dvh'} bg-background p-8 text-foreground`}>
      <div className="max-w-xl space-y-4 rounded-2xl border border-border bg-card p-8">
        <h1 className="font-space-grotesk text-2xl font-semibold">Application configuration required</h1>
        <p className="text-muted-foreground">This destination uses the actual application. This checkout is missing its Supabase URL and public key, so the tool cannot load here yet.</p>
        <p className="text-sm text-muted-foreground">Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_KEY) in the local environment, then restart the development server. Existing sign-in and plan checks will apply.</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link className="text-primary underline" to="/prototypes/founder-guide">Review the design preview</Link>
          <a className="text-primary underline" href={`https://creatives-takeover.com${pathname}`} target="_blank" rel="noopener noreferrer">Open the live website</a>
        </div>
      </div>
    </main>;
}
