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
import { resumePendingDiscoveryCallRedirect } from '@/services/discoveryCallService';
import { identify } from '@/lib/analytics';
import { isAdminEmail } from '@/lib/admin';

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

      // ── Step 1: Check if profile exists (SINGLE call) ──
      const { data: existingProfileData, error: existingProfileError } = await supabase
        .from('profiles')
        .select('id, onboarding_completed, user_preferences')
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
        .select('id, onboarding_completed, user_preferences')
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
        identify(userId, {
          email,
          full_name: signedInUser.user_metadata?.full_name || '',
          username: signedInUser.user_metadata?.username || '',
          onboarding_completed: existingProfile?.onboarding_completed ?? null,
          is_admin: isAdmin,
        });
      }

      // ── Step 3: Run first-login updates in PARALLEL ──
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
            })
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

      const hasPendingDiscoveryCall = localStorage.getItem('pending_calendly_redirect');
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

        // Handle sign-in logic asynchronously (won't block state updates)
        if (event === 'SIGNED_IN' && currentSession?.user) {
          // Use setTimeout(0) to avoid blocking the auth state update
          setTimeout(() => {
            handleSignIn(currentSession.user, currentSession);
          }, 0);
        }

        // Clear processed ref on sign out so next sign-in gets processed
        if (event === 'SIGNED_OUT') {
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
          handleSignIn(existingSession.user, existingSession);
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
