import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { subscribeJoinPrompt } from './requireAccount';

/**
 * The same sign-up dialog the platform tour and /build use (email, Google,
 * GitHub), so every "you need an account" moment looks and works the same.
 * Lazy: it reaches the auth client only when a visitor asks to act.
 */
const AccountSignupDialog = lazy(() => import('@/components/auth/AccountSignupDialog'));

/**
 * Community is public to read. Anything that writes (post, reply, vote, save,
 * follow, enter a launch) asks a visitor to sign up first, naming what they
 * tried, and brings them back to the same page afterwards. Triggered through
 * useRequireAccount.
 */
export function JoinGateProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [intent, setIntent] = useState<string | null>(null);

  useEffect(() => subscribeJoinPrompt(setIntent), []);

  return <>
    {children}
    {intent && <Suspense fallback={null}>
      <AccountSignupDialog
        open
        onClose={() => setIntent(null)}
        title={`Sign up to ${intent}`}
        subtitle="A free account lets you post in Rooms, reply, upvote and enter your launch in the weekly round."
        returnPath={`${location.pathname}${location.search}`}
      />
    </Suspense>}
  </>;
}
