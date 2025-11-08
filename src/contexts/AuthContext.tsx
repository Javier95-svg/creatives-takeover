import { createContext, useContext, useEffect, useState } from 'react';
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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Create or update profile when user signs in
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(async () => {
            const isNewProfile = await createUserProfile(session.user);
            
            // Only initialize credits for NEW users (5 free credits)
            if (isNewProfile) {
              supabase.functions.invoke('credit-service', {
                body: { action: 'initialize', userId: session.user!.id }
              });
            }
            
            // Grant monthly credits if due (free and paid tiers)
            supabase.rpc('grant_monthly_credits');
            
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
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const createUserProfile = async (user: User): Promise<boolean> => {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || '',
            avatar_url: user.user_metadata?.avatar_url || '',
            date_of_birth: user.user_metadata?.date_of_birth || null,
          });
        
        if (error) {
          logError('Error creating profile', error, { userId: user.id });
          return false;
        }
        return true;
      }
      return false;
    } catch (error) {
      logError('Unexpected error creating profile', error, { userId: user.id });
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
          full_name: fullName,
          date_of_birth: dateOfBirth,
        }
      }
    });

    if (!error) {
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: { email, fullName }
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
    await supabase.auth.signOut();
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