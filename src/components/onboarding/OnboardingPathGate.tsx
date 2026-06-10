import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageCircle, Sparkles, Target, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/hooks/useMessaging';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { trackActivationCompleted, trackOnboardingPathSelected } from '@/lib/analytics';
import { triggerEmailSequenceEvent } from '@/lib/emailSequences';
import {
  withOnboardingPath,
  withOnboardingPathCompleted,
} from '@/lib/onboardingPath';
import { cn } from '@/lib/utils';

export interface OnboardingPathProfileInput {
  onboarding_completed: boolean | null;
  user_preferences?: Json | null;
}

interface OnboardingPathGateProps {
  profile: OnboardingPathProfileInput;
  onProfilePatch: (patch: Partial<OnboardingPathProfileInput>) => void;
}

interface SuggestedMentor {
  id: string;
  name: string;
  picture: string | null;
  bio: string | null;
  expertise: string[] | null;
  user_id: string | null;
}

const introMessage = (mentorName: string) =>
  `Hi ${mentorName.split(' ')[0] || mentorName}! I just joined Creatives Takeover and I'm getting my startup off the ground. ` +
  `I'd love a quick intro — would you be open to sharing one piece of advice for where I'm at right now?`;

export function OnboardingPathGate({ profile, onProfilePatch }: OnboardingPathGateProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { startConversation, sendMessage, resolveMentorUserId } = useMessaging({ autoLoad: false });

  const [view, setView] = useState<'choose' | 'mentor'>('choose');
  const [busy, setBusy] = useState<'icp' | 'mentor' | 'skip' | null>(null);
  const [mentors, setMentors] = useState<SuggestedMentor[]>([]);
  const [mentorsLoading, setMentorsLoading] = useState(false);
  const [sendingMentorId, setSendingMentorId] = useState<string | null>(null);

  const loadMentors = useCallback(async () => {
    setMentorsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mentors')
        .select('id, name, picture, bio, expertise, user_id')
        .eq('is_active', true)
        .eq('is_featured', true)
        .not('user_id', 'is', null)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(3);

      if (error) throw error;
      setMentors((data ?? []) as SuggestedMentor[]);
    } catch (error) {
      console.error('Failed to load suggested mentors:', error);
      toast.error('Could not load mentor suggestions');
    } finally {
      setMentorsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'mentor' && mentors.length === 0 && !mentorsLoading) {
      void loadMentors();
    }
  }, [view, mentors.length, mentorsLoading, loadMentors]);

  const handleChooseIcp = async () => {
    if (!user) return;
    setBusy('icp');
    try {
      const nextPrefs = withOnboardingPath(profile.user_preferences, 'icp');
      const { error } = await supabase
        .from('profiles')
        .update({ user_preferences: nextPrefs as Json, onboarding_completed: true })
        .eq('id', user.id);
      if (error) throw error;

      trackOnboardingPathSelected({ path: 'icp' });
      onProfilePatch({ user_preferences: nextPrefs as Json, onboarding_completed: true });
      navigate('/icp-builder?source=onboarding');
    } catch (error) {
      console.error('Failed to start ICP onboarding path:', error);
      toast.error('Could not open ICP Builder right now');
      setBusy(null);
    }
  };

  const handleChooseMentor = async () => {
    if (!user) return;
    setBusy('mentor');
    try {
      const nextPrefs = withOnboardingPath(profile.user_preferences, 'mentor');
      const { error } = await supabase
        .from('profiles')
        .update({ user_preferences: nextPrefs as Json })
        .eq('id', user.id);
      if (error) throw error;

      trackOnboardingPathSelected({ path: 'mentor' });
      onProfilePatch({ user_preferences: nextPrefs as Json });
      setView('mentor');
    } catch (error) {
      console.error('Failed to start mentor onboarding path:', error);
      toast.error('Could not load the mentor path right now');
    } finally {
      setBusy(null);
    }
  };

  const handleSendIntro = async (mentor: SuggestedMentor) => {
    if (!user || sendingMentorId) return;

    setSendingMentorId(mentor.id);
    try {
      const mentorUserId =
        mentor.user_id ?? (await resolveMentorUserId({ name: mentor.name, user_id: mentor.user_id }));
      if (!mentorUserId) {
        toast.error(`${mentor.name} isn't reachable for messages yet — try another mentor.`);
        return;
      }

      const conversationId = await startConversation(mentorUserId);
      if (!conversationId) {
        toast.error('Could not start the conversation. Please try again.');
        return;
      }

      await sendMessage(conversationId, introMessage(mentor.name));

      const nextPrefs = withOnboardingPathCompleted(profile.user_preferences, 'mentor');
      const { error } = await supabase
        .from('profiles')
        .update({ user_preferences: nextPrefs as Json, onboarding_completed: true })
        .eq('id', user.id);
      if (error) throw error;

      trackActivationCompleted({ trigger: 'mentor_intro_sent', mentor_id: mentor.id });
      await triggerEmailSequenceEvent('onboarding_complete', user.id);
      onProfilePatch({ user_preferences: nextPrefs as Json, onboarding_completed: true });

      toast.success(`Intro sent to ${mentor.name}!`);
      navigate(`/messages?conversationId=${conversationId}`);
    } catch (error) {
      console.error('Failed to send mentor intro:', error);
      toast.error('Could not send your intro. Please try again.');
    } finally {
      setSendingMentorId(null);
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    setBusy('skip');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
      if (error) throw error;

      onProfilePatch({ onboarding_completed: true });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Failed to skip onboarding path:', error);
      toast.error('Could not skip right now');
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col justify-center">
        {view === 'choose' ? (
          <div className="space-y-8">
            <div className="space-y-3 text-center">
              <h1 className="font-space-grotesk text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                What do you want to do first?
              </h1>
              <p className="text-muted-foreground">
                Pick one to get started. You can explore everything else once you're set up.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleChooseIcp}
                disabled={busy !== null}
                className={cn(
                  'group relative flex flex-col items-start gap-3 rounded-xl border-2 border-primary/40 bg-primary/5 p-6 text-left transition-all',
                  'hover:border-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Target className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="text-lg font-semibold text-foreground">Build my ICP</span>
                <span className="text-sm text-muted-foreground">
                  Define your ideal customer in a quick guided flow — the foundation for everything else.
                </span>
                <span className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-primary">
                  {busy === 'icp' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Recommended
                </span>
              </button>

              <button
                type="button"
                onClick={handleChooseMentor}
                disabled={busy !== null}
                className={cn(
                  'group relative flex flex-col items-start gap-3 rounded-xl border-2 border-border bg-card p-6 text-left transition-all',
                  'hover:border-primary/50 hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Users className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="text-lg font-semibold text-foreground">Meet a mentor</span>
                <span className="text-sm text-muted-foreground">
                  Get matched with founders who've done it. Send a one-click intro and start a conversation.
                </span>
                <span className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-foreground/70">
                  {busy === 'mentor' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  Talk to someone
                </span>
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleSkip}
                disabled={busy !== null}
                className="text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === 'skip' ? 'Skipping...' : 'Skip for now'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3 text-center">
              <h1 className="font-space-grotesk text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Send your first intro
              </h1>
              <p className="text-muted-foreground">
                One click starts a conversation. Pick whoever feels right.
              </p>
            </div>

            {mentorsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : mentors.length === 0 ? (
              <Card>
                <CardContent className="space-y-4 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No mentor suggestions are available right now.
                  </p>
                  <Button type="button" variant="outline" onClick={() => navigate('/mentorship')}>
                    Browse all mentors
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {mentors.map((mentor) => (
                  <Card key={mentor.id} className="border-border">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                        {mentor.picture ? (
                          <img src={mentor.picture} alt={mentor.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                            {mentor.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{mentor.name}</p>
                        {mentor.expertise && mentor.expertise.length > 0 ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {mentor.expertise.slice(0, 3).join(' · ')}
                          </p>
                        ) : mentor.bio ? (
                          <p className="truncate text-xs text-muted-foreground">{mentor.bio}</p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSendIntro(mentor)}
                        disabled={sendingMentorId !== null}
                      >
                        {sendingMentorId === mentor.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          'Send intro'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setView('choose')}
                disabled={sendingMentorId !== null}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleSkip}
                disabled={busy !== null || sendingMentorId !== null}
                className="text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === 'skip' ? 'Skipping...' : 'Skip for now'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default OnboardingPathGate;
