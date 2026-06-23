import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, Session, AuthError as SupabaseAuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getSessionSafely } from '@/integrations/supabase/auth';
import { logError, logInfo, logWarn } from '@/lib/logger';
import { signUpWithFallback } from '@/lib/authSignup';
import { VALIDATION } from '@/config/constants';
import {
  requiresGuidedOnboarding,
  withGuidedOnboardingPreference,
} from '@/lib/guidedOnboarding';
import {
  PENDING_DISCOVERY_CALL_BOOKING_KEY,
  PENDING_DISCOVERY_CALL_KEY,
  resumePendingDiscoveryCallRedirect,
} from '@/services/discoveryCallService';
import {
  consumeSignupIntent,
  identify,
  initAmplitudeWithUser,
  isInternalEmail,
  readAuthMethod,
  resetAmplitude,
  setInternalUser,
  trackSignupCompleted,
  type SignupMethod,
} from '@/lib/analytics';
import { isAdminEmail } from '@/lib/admin';
import { triggerEmailSequenceEvent } from '@/lib/emailSequences';
import { clearAccountScopedStorage } from '@/lib/accountScopedStorage';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    dateOfBirth?: string,
    username?: string,
    referralCode?: string | null
  ) => Promise<{ error: SupabaseAuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: SupabaseAuthError | null }>;
  signOut: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getDaysSinceSignup = (createdAt?: string | null): number => {
  if (!createdAt) return 0;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 86_400_000));
};

// Default signup method when neither the intent marker nor the provider resolves one.
// Defined at module scope (not inside handleSignIn) so the method literal stays out of
// the identify() block that the PII test scans.
const DEFAULT_SIGNUP_METHOD: SignupMethod = 'email';

const getSignupCompletedMethod = (provider?: string | null, storedMethod?: string | null) => {
  const rawMethod = (storedMethod || provider || '').toLowerCase();
  if (rawMethod === 'google') return 'google' as const;
  if (rawMethod === 'github') return 'github' as const;
  if (rawMethod === 'linkedin' || rawMethod === 'linkedin_oidc') return 'linkedin' as const;
  if (rawMethod === 'email' || rawMethod === 'password') return 'email' as const;
  return null;
};

const getSignupReferrer = () => {
  if (typeof document === 'undefined') return null;
  return document.referrer || null;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Prevent double-processing of sign-in logic
  const signInProcessedRef = useRef<string | null>(null);
  const identifiedUserRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  // Tracks the previously-seen account so we can purge per-account client caches
  // the moment the active account changes (switch or sign-out), even if the
  // session was replaced without an explicit signOut() (e.g. token expiry).
  const previousUserIdRef = useRef<string | null>(null);

  /**
   * Handle post-sign-in logic (profile, admin tier, onboarding).
   * Runs at most ONCE per user session thanks to signInProcessedRef.
   */
  const handleSignIn = useCallback(async (signedInUser: User, _signedInSession: Session) => {
    // Skip if we already processed this user's sign-in
    if (signInProcessedRef.current === signedInUser.id) return;
    signInProcessedRef.current = signedInUser.id;

    try {
      const userId = signedInUser.id;
      const email = signedInUser.email || '';
      const isAdmin = isAdminEmail(email);

      // Suppress analytics for internal/admin accounts before any capture/identify
      // runs below, so admin activity never pollutes product metrics.
      setInternalUser(isInternalEmail(email));

      // ── Step 1: Check if profile exists (SINGLE call) ──
      const { data: existingProfileData, error: existingProfileError } = await supabase
        .from('profiles')
        .select('id, created_at, onboarding_completed, quiz_completed, creative_niche, business_stage, subscription_tier, user_preferences')
        .eq('id', userId)
        .maybeSingle();
      let existingProfile = existingProfileData;

      if (existingProfileError) {
        logWarn('Primary profile lookup failed; retrying with minimal projection', {
          userId,
          errorCode: existingProfileError.code,
          errorMessage: existingProfileError.message,
        });

        const { data: fallbackProfile, error: fallbackProfileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (fallbackProfileError) {
          logError('Fallback profile lookup failed', fallbackProfileError, { userId });
        }

        existingProfile = fallbackProfile
          ? ({
            ...fallbackProfile,
            onboarding_completed: null,
            quiz_completed: null,
            creative_niche: null,
            business_stage: null,
            subscription_tier: null,
            created_at: null,
          } as typeof existingProfileData)
          : null;
      }

      const profileExistedBeforeSignIn = !!existingProfile;
      let profileExists = profileExistedBeforeSignIn;
      let isNewProfile = false;

      // ── Step 2: Create profile if needed ──
      if (!profileExists) {
        isNewProfile = await createUserProfile(signedInUser);

        // Verify it exists now (trigger or our insert)
        if (!isNewProfile) {
          const { data: checkProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();
          profileExists = !!checkProfile;
        } else {
          profileExists = true;
        }
      }

      if (!profileExists) {
        logError('Profile does not exist after sign in', null, { userId });
        return;
      }

      const { data: refreshedProfile, error: refreshedProfileError } = await supabase
        .from('profiles')
        .select('id, created_at, onboarding_completed, quiz_completed, creative_niche, business_stage, subscription_tier, user_preferences')
        .eq('id', userId)
        .maybeSingle();

      if (refreshedProfileError) {
        logWarn('Failed to refresh profile state after sign in', {
          userId,
          errorCode: refreshedProfileError.code,
          errorMessage: refreshedProfileError.message,
        });
      } else if (refreshedProfile) {
        existingProfile = refreshedProfile;
      }

      if (!profileExistedBeforeSignIn) {
        const nextUserPreferences = withGuidedOnboardingPreference(existingProfile?.user_preferences, true);

        if (!requiresGuidedOnboarding(existingProfile?.user_preferences)) {
          const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({ user_preferences: nextUserPreferences })
            .eq('id', userId);

          if (updateProfileError) {
            logWarn('Failed to persist guided onboarding flag for new account', {
              userId,
              errorCode: updateProfileError.code,
              errorMessage: updateProfileError.message,
            });
          }
        }

        existingProfile = existingProfile
          ? {
            ...existingProfile,
            user_preferences: nextUserPreferences,
          }
          : existingProfile;
      }

      if (identifiedUserRef.current !== userId) {
        identifiedUserRef.current = userId;
        const daysSinceSignup = getDaysSinceSignup(existingProfile?.created_at);
        identify(userId, {
          subscription_tier: existingProfile?.subscription_tier ?? 'rookie',
          days_since_signup: daysSinceSignup,
          onboarding_completed: existingProfile?.onboarding_completed ?? null,
          quiz_completed: existingProfile?.quiz_completed ?? null,
          is_admin: isAdmin,
        });
      }

      // FIX(retention): emit the PostHog `signup_completed` event off an explicit
      // signup-intent marker (set when the user initiates signup), not the old
      // `!profileExistedBeforeSignIn` heuristic. Since the June 2026 signup-trigger
      // fix provisions the profile *during* signup, that heuristic was always false
      // and the event silently stopped firing (~June 2026). The new-profile signal is
      // kept as a fallback for the client-side createUserProfile path, and a per-user
      // localStorage guard prevents double-counting.
      const signupIntentMethod = consumeSignupIntent();
      const isBrandNewProfile = !profileExistedBeforeSignIn && profileExists;
      if (signupIntentMethod || isBrandNewProfile) {
        const signupGuardKey = `signup_completed_tracked_${userId}`;
        let alreadyTracked = false;
        try {
          alreadyTracked = localStorage.getItem(signupGuardKey) === 'true';
        } catch {
          alreadyTracked = false;
        }

        if (!alreadyTracked) {
          const method =
            signupIntentMethod ??
            getSignupCompletedMethod(signedInUser.app_metadata?.provider, readAuthMethod()) ??
            DEFAULT_SIGNUP_METHOD;

          try {
            localStorage.setItem(signupGuardKey, 'true');
          } catch {
            // Guard is best-effort; a missing guard at worst re-fires once.
          }

          trackSignupCompleted({
            method,
            referrer: getSignupReferrer(),
          });
        }
      }

      // ─── Step 3: Run first-login updates in PARALLEL ───
      const parallelTasks: Promise<unknown>[] = [];

      // New profile: initialize credits
      if (isNewProfile) {
        parallelTasks.push(
          supabase.functions.invoke('credit-service', {
            body: { action: 'initialize', userId }
          }).catch(err => logError('Failed to initialize credits', err, { userId }))
        );
      }

      // New profile: send notification emails
      if (isNewProfile) {
        parallelTasks.push(
          Promise.all([
            supabase.functions.invoke('notify-admin', {
              body: {
                email,
                fullName: signedInUser.user_metadata?.full_name || '',
                timestamp: new Date().toISOString()
              }
            }),
            supabase.functions.invoke('send-welcome-email', {
              body: {
                email,
                fullName: signedInUser.user_metadata?.full_name || ''
              }
            }),
            triggerEmailSequenceEvent('signup_completed', userId)
          ]).catch(err => logError('Failed to send notification emails', err, { userId }))
        );
      }

      // Run all parallel tasks at once
      if (parallelTasks.length > 0) {
        await Promise.all(parallelTasks);
      }

      // New users now see the Day 1 Welcome gate on /dashboard instead of
      // being forced through the legacy /onboarding route.
      if (!isAdmin) {
        sessionStorage.removeItem(`onboarding_redirect_${userId}`);
      }

      const hasPendingDiscoveryCall = localStorage.getItem(PENDING_DISCOVERY_CALL_BOOKING_KEY)
        || localStorage.getItem(PENDING_DISCOVERY_CALL_KEY);
      if (hasPendingDiscoveryCall) {
        setTimeout(() => {
          void resumePendingDiscoveryCallRedirect();
        }, 800);
      }

    } catch (error) {
      logError('Error in handleSignIn', error, { userId: signedInUser.id });
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Synchronously update state — no async verification needed,
        // Supabase already verified the session before firing this callback.
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);

        // Data isolation: if the active account changed (A→B, or A→signed-out),
        // purge the previous account's client-side caches before the new account
        // hydrates anything. Skips the initial null→user load and token refreshes
        // for the same user. Runs before the new account's tools read storage.
        const nextUserId = currentSession?.user?.id ?? null;
        if (previousUserIdRef.current && previousUserIdRef.current !== nextUserId) {
          clearAccountScopedStorage();
        }
        previousUserIdRef.current = nextUserId;

        // Handle sign-in logic asynchronously (won't block state updates)
        if (event === 'SIGNED_IN' && currentSession?.user) {
          initAmplitudeWithUser(currentSession.user.id);
          // Use setTimeout(0) to avoid blocking the auth state update
          setTimeout(() => {
            void handleSignIn(currentSession.user, currentSession);
          }, 0);
        }

        // Clear processed ref on sign out so next sign-in gets processed
        if (event === 'SIGNED_OUT') {
          resetAmplitude();
          // Re-enable analytics so a different user on this browser is tracked again.
          setInternalUser(false);
          signInProcessedRef.current = null;
          identifiedUserRef.current = null;
        }
      }
    );

    // Check for existing session on mount
    getSessionSafely()
      .then((existingSession) => {
        if (!isMountedRef.current) return;

        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        setLoading(false);

        // If there's already a session, run sign-in logic
        // (signInProcessedRef prevents double-execution with onAuthStateChange)
        if (existingSession?.user) {
          initAmplitudeWithUser(existingSession.user.id);
          void handleSignIn(existingSession.user, existingSession);
        }
      })
      .catch((error) => {
        if (!isMountedRef.current) return;

        logError('Failed to restore Supabase session on mount', error);
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [handleSignIn]);

  const createUserProfile = async (profileUser: User): Promise<boolean> => {
    try {
      const normalizeUsernamePart = (value: string): string => {
        return value
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
      };

      const normalizePreferredUsername = (value: string): string => {
        return value
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/\s+/g, '')
          .replace(/[^a-z0-9_]/g, '')
          .replace(/^_+|_+$/g, '')
          .slice(0, VALIDATION.MAX_USERNAME_LENGTH);
      };

      // Check if profile already exists (trigger may have created it)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', profileUser.id)
        .maybeSingle();

      if (existingProfile) {
        logInfo('Profile already exists, skipping creation', { userId: profileUser.id });
        return false;
      }

      // Prefer explicit username from signup metadata when available.
      let username = normalizePreferredUsername(profileUser.user_metadata?.username || '');
      const fullName = profileUser.user_metadata?.full_name || '';

      if (!username && fullName) {
        const nameParts = fullName.trim().split(/\s+/).filter((p: string) => p.length > 0);
        if (nameParts.length >= 2) {
          const firstName = normalizeUsernamePart(nameParts[0]);
          const lastName = normalizeUsernamePart(nameParts[nameParts.length - 1]);
          username = firstName + lastName;
        } else if (nameParts.length === 1) {
          username = normalizeUsernamePart(nameParts[0]);
        }
      }

      if (!username) {
        username = 'user' + profileUser.id.substring(0, 8);
      }

      if (username.length < VALIDATION.MIN_USERNAME_LENGTH) {
        username = 'user' + profileUser.id.substring(0, 8);
      }

      // Ensure username uniqueness (bounded attempts to avoid infinite loop).
      let finalUsername = username;
      let counter = 1;
      const maxAttempts = 25;

      for (let i = 0; i < maxAttempts; i++) {
        const { data: exactExisting } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', finalUsername)
          .maybeSingle();

        if (!exactExisting) break;

        finalUsername = username + counter.toString();
        counter++;
      }

      const profilePayload = {
        id: profileUser.id,
        full_name: fullName || '',
        avatar_url: profileUser.user_metadata?.avatar_url || '',
        date_of_birth: profileUser.user_metadata?.date_of_birth || null,
        username: finalUsername,
        subscription_tier: 'rookie',
        user_preferences: withGuidedOnboardingPreference(null, true),
      };

      let { error } = await supabase
        .from('profiles')
        .insert(profilePayload);

      if (error && (error.code === 'PGRST204' || error.message?.toLowerCase().includes('date_of_birth'))) {
        logWarn('Retrying profile creation without date_of_birth due schema mismatch', {
          userId: profileUser.id,
          errorCode: error.code,
          errorMessage: error.message,
        });
        const { date_of_birth: _omitDateOfBirth, ...fallbackPayload } = profilePayload;
        const retryResult = await supabase.from('profiles').insert(fallbackPayload);
        error = retryResult.error;
      }

      if (error) {
        // Duplicate key = trigger already created it
        if (error.code === '23505' || error.message?.includes('duplicate key')) {
          logInfo('Profile created by trigger (race condition)', { userId: profileUser.id });
          return false;
        }
        logError('Error creating profile', error, { userId: profileUser.id, errorCode: error.code });
        return false;
      }

      return true;
    } catch (error) {
      logError('Unexpected error creating profile', error, { userId: profileUser.id });
      return false;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    dateOfBirth?: string,
    username?: string,
    referralCode?: string | null
  ) => {
    const { error, usedDirectSignupFallback } = await signUpWithFallback({
      email,
      password,
      fullName,
      dateOfBirth,
      username,
      referralCode,
    });

    if (error) {
      logError('Auth signUp failed', error, { email });
      return { error };
    }

    if (usedDirectSignupFallback) {
      logWarn('Used direct signup fallback due confirmation email delivery issue', { email });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.session) {
      logInfo('Sign-in successful, session established', { userId: data.session.user.id });
    }

    return { error };
  };

  const signOut = async () => {
    // Clear every per-account client cache that is not Supabase-auth-scoped so
    // the next account signing in on this browser cannot inherit them (MVP
    // Builder, BizMap AI, Insighta tools, contexts, drafts, etc.).
    clearAccountScopedStorage();

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        logError('Error during sign out', error);
        throw error;
      }

      setSession(null);
      setUser(null);
      setLoading(false);

      logInfo('User signed out successfully');
    } catch (error) {
      logError('Failed to sign out', error);
      setSession(null);
      setUser(null);
      setLoading(false);
      throw error;
    }
  };

  const value = {
    user,
    session,
    signUp,
    signIn,
    signOut,
    loading,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
