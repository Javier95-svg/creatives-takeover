import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session, AuthError as SupabaseAuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logError, logInfo } from '@/lib/logger';
import { AuthError } from '@/lib/errors';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, fullName: string, dateOfBirth?: string) => Promise<{ error: SupabaseAuthError | null }>;
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
  // Track timeout IDs to prevent memory leaks
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // #region agent log
        fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:37',message:'auth state change',data:{event,hasSession:!!session,userId:session?.user?.id,email:session?.user?.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Create or update profile when user signs in
        if (event === 'SIGNED_IN' && session?.user) {
          // #region agent log
          fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:43',message:'user signed in',data:{userId:session.user.id,email:session.user.email,isAdmin:session.user.email?.toLowerCase()==='admin@creatives-takeover.com'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          // Check for pending Calendly redirect
          const CALENDLY_REDIRECT_KEY = 'pending_calendly_redirect';
          const pendingCalendlyUrl = localStorage.getItem(CALENDLY_REDIRECT_KEY);
          if (pendingCalendlyUrl) {
            // Small delay to ensure UI is ready, then redirect
            const calendlyTimeout = setTimeout(() => {
              localStorage.removeItem(CALENDLY_REDIRECT_KEY);
              window.open(pendingCalendlyUrl, '_blank', 'noopener,noreferrer');
              timeoutRefs.current.delete(calendlyTimeout);
            }, 1000);
            timeoutRefs.current.add(calendlyTimeout);
          }
          
          const profileTimeout = setTimeout(async () => {
            // Verify profile exists or create it
            let profileExists = false;
            let isNewProfile = false;
            
            // First, check if profile exists
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (existingProfile) {
              profileExists = true;
              logInfo('Profile already exists for user', { userId: session.user.id });
            } else {
              // Profile doesn't exist, try to create it
              isNewProfile = await createUserProfile(session.user);
              
              // Verify profile was created successfully
              if (isNewProfile) {
                const { data: verifyProfile } = await supabase
                  .from('profiles')
                  .select('id')
                  .eq('id', session.user.id)
                  .maybeSingle();
                
                if (verifyProfile) {
                  profileExists = true;
                  logInfo('Profile created and verified successfully', { userId: session.user.id });
                } else {
                  logError('Profile creation reported success but profile not found', null, { userId: session.user.id });
                  // Retry once after a short delay (in case of race condition with trigger)
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  const { data: retryCheck } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', session.user.id)
                    .maybeSingle();
                  
                  if (retryCheck) {
                    profileExists = true;
                    logInfo('Profile found on retry (likely created by trigger)', { userId: session.user.id });
                  }
                }
              } else {
                // createUserProfile returned false - check if profile exists anyway (trigger might have created it)
                const { data: checkProfile } = await supabase
                  .from('profiles')
                  .select('id')
                  .eq('id', session.user.id)
                  .maybeSingle();
                
                if (checkProfile) {
                  profileExists = true;
                  logInfo('Profile exists (likely created by trigger)', { userId: session.user.id });
                } else {
                  logError('Profile does not exist and creation failed', null, { userId: session.user.id });
                }
              }
            }
            
            // Only proceed if profile exists
            if (profileExists) {
              // Ensure admin account has professional tier
              const isAdmin = session.user.email?.toLowerCase() === 'admin@creatives-takeover.com';
              if (isAdmin) {
                try {
                  // Update profile to ensure professional tier
                  await supabase
                    .from('profiles')
                    .update({ subscription_tier: 'professional' })
                    .eq('id', session.user.id);
                  
                  // Update user_credits to ensure professional tier
                  await supabase
                    .from('user_credits')
                    .upsert({
                      user_id: session.user.id,
                      subscription_tier: 'professional'
                    }, { onConflict: 'user_id' });
                  
                  // Update subscribers table
                  await supabase
                    .from('subscribers')
                    .upsert({
                      user_id: session.user.id,
                      email: session.user.email,
                      subscribed: true,
                      subscription_tier: 'professional'
                    }, { onConflict: 'email' });
                  
                  logInfo('Admin account updated to professional tier', { userId: session.user.id });
                } catch (adminError) {
                  logError('Failed to update admin tier', adminError, { userId: session.user.id });
                }
              }
              
              // Only initialize credits for NEW users (5 free credits, or 150 for admin)
              if (isNewProfile) {
                try {
                  await supabase.functions.invoke('credit-service', {
                    body: { action: 'initialize', userId: session.user!.id }
                  });
                } catch (creditError) {
                  logError('Failed to initialize credits', creditError, { userId: session.user.id });
                }
              }
              
              // Grant monthly credits if due (free and paid tiers)
              try {
                await supabase.rpc('grant_monthly_credits');
              } catch (creditError) {
                logError('Failed to grant monthly credits', creditError, { userId: session.user.id });
              }
              
              // Send emails for new signups only
              if (isNewProfile) {
                try {
                  await Promise.all([
                    supabase.functions.invoke('notify-admin', {
                      body: {
                        email: session.user.email || '',
                        fullName: session.user.user_metadata?.full_name || '',
                        timestamp: new Date().toISOString()
                      }
                    }),
                    supabase.functions.invoke('send-welcome-email', {
                      body: {
                        email: session.user.email || '',
                        fullName: session.user.user_metadata?.full_name || ''
                      }
                    })
                  ]);
                  logInfo('Admin notification and welcome email sent for new user');
                } catch (notificationError) {
                  logError('Failed to send admin notification or welcome email', notificationError);
                }
              }

              // Handle first-time user onboarding redirection
              try {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('onboarding_completed, first_login_at')
                  .eq('id', session.user.id)
                  .single();

                // Update first_login_at if this is truly the first login
                if (profileData && !profileData.first_login_at) {
                  await supabase
                    .from('profiles')
                    .update({ first_login_at: new Date().toISOString() })
                    .eq('id', session.user.id);
                }

                // Redirect to account page if onboarding not completed
                if (profileData && !profileData.onboarding_completed) {
                  // Check if we've already redirected in this session to prevent loops
                  const hasRedirected = sessionStorage.getItem(`onboarding_redirect_${session.user.id}`);

                  if (!hasRedirected) {
                    // Mark that we've redirected to prevent loops
                    sessionStorage.setItem(`onboarding_redirect_${session.user.id}`, 'true');

                    // Small delay to ensure auth state is fully settled
                    setTimeout(() => {
                      // Only redirect if not already on account page
                      if (!window.location.pathname.includes('/account')) {
                        window.location.href = '/account';
                        logInfo('Redirected first-time user to account page', { userId: session.user.id });
                      }
                    }, 1500);
                  }
                }
              } catch (onboardingError) {
                logError('Failed to check onboarding status', onboardingError, { userId: session.user.id });
              }
            } else {
              logError('Profile does not exist after sign in - user may experience issues', null, { userId: session.user.id });
            }
            timeoutRefs.current.delete(profileTimeout);
          }, 0);
          timeoutRefs.current.add(profileTimeout);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      // Clear all pending timeouts to prevent memory leaks
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  const createUserProfile = async (user: User): Promise<boolean> => {
    try {
      // First check if profile already exists (might have been created by database trigger)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      // If profile already exists, return success (trigger already created it)
      if (existingProfile) {
        logInfo('Profile already exists, skipping creation', { userId: user.id });
        return false; // Return false because it's not a NEW profile
      }

      // Generate username from full_name
      let username = '';
      const fullName = user.user_metadata?.full_name || '';
      
      if (fullName) {
        const nameParts = fullName.trim().split(/\s+/).filter(p => p.length > 0);
        if (nameParts.length >= 2) {
          const firstName = nameParts[0].toLowerCase().replace(/[^a-z0-9]/g, '');
          const lastName = nameParts[nameParts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');
          username = firstName + lastName;
        } else if (nameParts.length === 1) {
          username = nameParts[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        }
      }
      
      // If no username generated, use user ID
      if (!username) {
        username = 'user' + user.id.substring(0, 8);
      }
      
      // Ensure uniqueness by checking database
      let finalUsername = username;
      let counter = 1;
      let isUnique = false;
      
      while (!isUnique) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', finalUsername)
          .maybeSingle();
        
        if (!existing) {
          isUnique = true;
        } else {
          finalUsername = username + counter.toString();
          counter++;
        }
      }
      
      // Check if this is the admin account
      const isAdmin = user.email?.toLowerCase() === 'admin@creatives-takeover.com';
      
      // Attempt to insert profile
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: fullName || '',
          avatar_url: user.user_metadata?.avatar_url || '',
          date_of_birth: user.user_metadata?.date_of_birth || null,
          username: finalUsername,
          subscription_tier: isAdmin ? 'professional' : 'free',
        });
      
      // Handle insert errors gracefully
      if (error) {
        // Check if error is due to duplicate key (race condition with trigger)
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('already exists')) {
          // Profile was likely created by trigger in the meantime - verify it exists
          const { data: profileAfterError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();
          
          if (profileAfterError) {
            // Profile exists now, so success (trigger created it)
            logInfo('Profile created by trigger after race condition', { userId: user.id });
            return false; // Return false because it's not a NEW profile (trigger created it)
          }
        }
        
        // Log other errors but don't fail completely
        logError('Error creating profile', error, { userId: user.id, errorCode: error.code });
        
        // Double-check if profile exists despite the error (might have been created by trigger)
        const { data: profileCheck } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profileCheck) {
          // Profile exists, so it's fine
          logInfo('Profile exists despite insert error (likely created by trigger)', { userId: user.id });
          return false; // Return false because it's not a NEW profile
        }
        
        // Profile doesn't exist and insert failed - return false
        return false;
      }
      
      // Insert succeeded - this is a new profile
      return true;
    } catch (error) {
      logError('Unexpected error creating profile', error, { userId: user.id });
      
      // Final check: verify if profile exists despite the error
      try {
        const { data: profileCheck } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profileCheck) {
          logInfo('Profile exists despite exception (likely created by trigger)', { userId: user.id });
          return false; // Return false because it's not a NEW profile
        }
      } catch (checkError) {
        logError('Error checking profile existence after exception', checkError, { userId: user.id });
      }
      
      return false;
    }
  };

  const signUp = async (email: string, password: string, fullName: string, dateOfBirth?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName || '',
          date_of_birth: dateOfBirth || null,
        }
      }
    });

    if (!error) {
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: { email, fullName: fullName || '' }
        });
      } catch (welcomeError) {
        logError('Welcome email failed', welcomeError, { email });
      }
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Auto-check subscription status after successful login
    if (!error) {
      try {
        await Promise.all([
          supabase.functions.invoke('check-subscription', {
            headers: {
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            }
          }),
          // Ensure monthly credits are granted if due
          supabase.rpc('grant_monthly_credits')
        ]);
      } catch (subscriptionError) {
        logError('Subscription/credits check on login', subscriptionError);
      }
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
      
      // Explicitly clear state as a fallback in case auth state listener doesn't fire
      // The listener should handle this, but this ensures state is cleared even if listener fails
      setSession(null);
      setUser(null);
      setLoading(false);
      
      logInfo('User signed out successfully');
    } catch (error) {
      logError('Failed to sign out', error);
      // Still clear state even if signOut fails to prevent user from being stuck
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