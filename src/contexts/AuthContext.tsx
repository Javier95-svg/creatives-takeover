import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
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
            
            // Initialize credits for new users (5 free credits)
            supabase.functions.invoke('credit-service', {
              body: { action: 'initialize', userId: session.user!.id }
            });
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
                console.log('Admin notification and welcome email sent for new user:', session.user.email);
              } catch (notificationError) {
                console.log('Failed to send admin notification or welcome email:', notificationError);
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
      // Check if profile already exists to prevent overwriting
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      // Only create profile if it doesn't exist
      if (!existingProfile) {
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || '',
            avatar_url: user.user_metadata?.avatar_url || '',
          });
        
        if (error) {
          console.error('Error creating profile:', error);
          return false;
        }
        return true; // New profile was created
      }
      return false; // Profile already existed
    } catch (error) {
      console.error('Error creating profile:', error);
      return false;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        }
      }
    });

    if (!error) {
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: { email, fullName }
        });
      } catch (welcomeError) {
        console.log('Welcome email failed:', welcomeError);
      }
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // Check if extended session is requested
    const extendedSession = localStorage.getItem('extendedSession') === 'true';
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      // Note: Supabase handles refresh tokens automatically for extended sessions
      // The token refresh is managed by the client configuration
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
        // Silently handle subscription check errors
        console.log('Subscription/credits check on login:', subscriptionError);
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