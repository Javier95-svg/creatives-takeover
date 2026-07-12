import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import MessagesBackground from "@/components/MessagesBackground";
import { MessagingInterface } from "@/components/social/MessagingInterface";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import { useMessaging } from "@/hooks/useMessaging";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { useFeatureFlagEnabled } from "posthog-js/react";

const Messages = () => {
  const { isAuthenticated, user } = useAuth();
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  const conversationIdParam = searchParams.get('conversationId');
  const { getUserIdByUsername, startConversation } = useMessaging({ autoLoad: false, suppressLoadErrors: true });
  const [resolvedConversationId, setResolvedConversationId] = useState<string | undefined>(conversationIdParam || undefined);
  const [isResolvingUsername, setIsResolvingUsername] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const inboxV2Flag = useFeatureFlagEnabled('messages-inbox-v2');
  const inboxV2Enabled = import.meta.env.VITE_MESSAGES_INBOX_V2_ENABLED !== 'false' && inboxV2Flag === true;
  const hasResolvedUsername = useRef<string | null>(null);

  // Prevent unwanted scrolling on page load and interactions
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
    
    // Prevent scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    // Remove any hash from URL that might cause scrolling
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    // Prevent unwanted scroll on form submissions
    const handleSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      if (form && form.closest('[class*="max-w-6xl"]')) {
        // Form already has preventDefault in handleSendMessage, but ensure no scroll
        const currentScroll = window.scrollY;
        setTimeout(() => {
          if (Math.abs(window.scrollY - currentScroll) > 10) {
            window.scrollTo(0, currentScroll);
          }
        }, 0);
      }
    };

    document.addEventListener('submit', handleSubmit, true);

    return () => {
      document.removeEventListener('submit', handleSubmit, true);
    };
  }, []);

  // Handle username parameter
  useEffect(() => {
    if (!username || !user || !isAuthenticated) {
      // If no username, use conversationId from query param or undefined
      setResolvedConversationId(conversationIdParam || undefined);
      setConversationError(null);
      hasResolvedUsername.current = null;
      return;
    }

    // Prevent re-resolving the same username
    if (hasResolvedUsername.current === username) {
      return;
    }

    const resolveUsername = async () => {
      // Mark that we're resolving this username
      hasResolvedUsername.current = username;
      setIsResolvingUsername(true);
      
      try {
        // Get user ID from username
        const userId = await getUserIdByUsername(username);
        
        if (!userId) {
          toast.error(`User "${username}" not found`);
          setResolvedConversationId(undefined);
          setConversationError(`We couldn't find the founder "${username}". You can return to the community hub and start a new conversation from a live profile.`);
          hasResolvedUsername.current = null; // Reset on error
          return;
        }

        // Don't create conversation with yourself
        if (userId === user.id) {
          toast.error('Cannot message yourself');
          setResolvedConversationId(undefined);
          setConversationError('This route points back to your own profile, so there is no conversation to open here.');
          hasResolvedUsername.current = null;
          return;
        }

        // Create or find conversation with that user
        const conversationId = await startConversation(userId);
        
        if (conversationId) {
          setResolvedConversationId(conversationId);
          setConversationError(null);
        } else {
          toast.error('Failed to start conversation');
          setResolvedConversationId(undefined);
          setConversationError('We could not start that conversation right now. You can open your inbox or return to the community and try again.');
          hasResolvedUsername.current = null;
        }
        } catch (error) {
          logError('Error resolving username', error);
          toast.error('Failed to load conversation');
          setResolvedConversationId(undefined);
          setConversationError('That conversation could not be loaded right now. Open your inbox or return to the community to start again.');
          hasResolvedUsername.current = null;
        } finally {
        setIsResolvingUsername(false);
      }
    };

    void resolveUsername();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, user?.id, isAuthenticated, conversationIdParam]);

  if (!isAuthenticated) {
    return (
      <>
        <Helmet>
          <title>Creatives Takeover</title>
          <meta name="description" content="Direct messaging for entrepreneurs and creators" />
        </Helmet>
        <div className="min-h-dvh bg-background">
          <div>
            <Navigation />
            <main className="container mx-auto px-4 py-20">
              <Card className="max-w-md mx-auto p-8 text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
                <p className="text-muted-foreground mb-6">
                  You need to sign in to access your messages and start conversations.
                </p>
                <Button asChild className="w-full">
                  <Link to={`/login?return=${encodeURIComponent('/messages')}`}>Sign In</Link>
                </Button>
              </Card>
            </main>
          </div>
        </div>
      </>
    );
  }

  if (!inboxV2Enabled) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <MessagesBackground />
        <div className="relative z-10">
          <Navigation />
          <main className="container mx-auto px-3 pt-20 pb-12 md:px-4 md:pt-header-offset">
            <h1 className="mb-6 text-center text-4xl font-bold">Chat Room</h1>
            <Card className="mx-auto max-w-6xl p-3 md:p-6">
              <MessagingInterface initialConversationId={resolvedConversationId} />
            </Card>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Creatives Takeover</title>
        <meta name="description" content="Direct messaging for entrepreneurs and creators" />
      </Helmet>
      <div className="min-h-dvh bg-background overflow-hidden">
        <div>
          <Navigation />
          <main className="mx-auto w-full max-w-[1600px] px-0 md:px-4 pt-16 md:pt-header-offset pb-0 md:pb-4">
            <div>
              <h1 className="sr-only">Messages</h1>
              <section className="border-y md:border rounded-none md:rounded-xl bg-card overflow-hidden" aria-label="Messages workspace">
                {isResolvingUsername ? (
                  <div className="flex items-center justify-center min-h-[280px] h-[45dvh] md:h-[600px]">
                    <div className="text-center">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 animate-pulse text-muted-foreground" />
                      <p className="text-muted-foreground">Loading conversation...</p>
                    </div>
                  </div>
                ) : conversationError ? (
                  <div className="flex items-center justify-center min-h-[280px] h-[45dvh] md:h-[600px]">
                    {/* FIX(dead-click): /messages — username-resolution failures now render an inline recovery state with clear next actions instead of leaving the page in a toast-only dead state. */}
                    <div className="max-w-lg text-center space-y-4">
                      <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                      <div className="space-y-2">
                        <h2 className="text-xl font-semibold">Conversation unavailable</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">{conversationError}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button asChild>
                          <Link to="/messages">Open Inbox</Link>
                        </Button>
                        <Button variant="outline" asChild>
                          <Link to="/mentorship">Back to Community</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <MessagingInterface initialConversationId={resolvedConversationId} />
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default Messages;
