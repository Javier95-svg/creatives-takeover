import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import MessagesBackground from "@/components/MessagesBackground";
import { MessagingInterface } from "@/components/social/MessagingInterface";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import { useMessaging } from "@/hooks/useMessaging";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

const Messages = () => {
  const { isAuthenticated, user } = useAuth();
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  const conversationIdParam = searchParams.get('conversationId');
  const { getUserIdByUsername, startConversation } = useMessaging({ autoLoad: false, suppressLoadErrors: true });
  const [resolvedConversationId, setResolvedConversationId] = useState<string | undefined>(conversationIdParam || undefined);
  const [isResolvingUsername, setIsResolvingUsername] = useState(false);
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

    // Prevent scroll when focusing elements (like input fields)
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      // Only prevent scroll for elements within the messages card
      const messagesCard = document.querySelector('[class*="max-w-6xl"]');
      if (messagesCard && messagesCard.contains(target)) {
        // Use preventScroll option if supported (available in modern browsers)
        try {
          // Check if preventScroll is supported by attempting to use it
          const focusOptions: FocusOptions = { preventScroll: true };
          if (target.focus && typeof target.focus === 'function') {
            target.focus(focusOptions);
          }
        } catch {
          // Fallback: use scrollIntoView with nearest positioning
          if (target.scrollIntoView) {
            target.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
          }
        }
      }
    };

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

    document.addEventListener('focusin', handleFocus, true);
    document.addEventListener('submit', handleSubmit, true);

    return () => {
      document.removeEventListener('focusin', handleFocus, true);
      document.removeEventListener('submit', handleSubmit, true);
    };
  }, []);

  // Handle username parameter
  useEffect(() => {
    if (!username || !user || !isAuthenticated) {
      // If no username, use conversationId from query param or undefined
      setResolvedConversationId(conversationIdParam || undefined);
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
          hasResolvedUsername.current = null; // Reset on error
          return;
        }

        // Don't create conversation with yourself
        if (userId === user.id) {
          toast.error('Cannot message yourself');
          setResolvedConversationId(undefined);
          hasResolvedUsername.current = null;
          return;
        }

        // Create or find conversation with that user
        const conversationId = await startConversation(userId);
        
        if (conversationId) {
          setResolvedConversationId(conversationId);
        } else {
          toast.error('Failed to start conversation');
          setResolvedConversationId(undefined);
          hasResolvedUsername.current = null;
        }
        } catch (error) {
          logError('Error resolving username', error);
          toast.error('Failed to load conversation');
          setResolvedConversationId(undefined);
          hasResolvedUsername.current = null;
        } finally {
        setIsResolvingUsername(false);
      }
    };

    resolveUsername();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, user?.id, isAuthenticated, conversationIdParam]);

  if (!isAuthenticated) {
    return (
      <>
        <Helmet>
          <title>Creatives Takeover</title>
          <meta name="description" content="Direct messaging for entrepreneurs and creators" />
        </Helmet>
        <div className="relative min-h-screen overflow-hidden">
          <MessagesBackground />
          <div className="relative z-10">
            <Navigation />
            <main className="container mx-auto px-4 py-20">
              <Card className="max-w-md mx-auto p-8 text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
                <p className="text-muted-foreground mb-6">
                  You need to sign in to access your messages and start conversations.
                </p>
                <Button asChild className="w-full">
                  <Link to="/auth">Sign In</Link>
                </Button>
              </Card>
            </main>
            <Footer />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Creatives Takeover</title>
        <meta name="description" content="Direct messaging for entrepreneurs and creators" />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <MessagesBackground />
        <div className="relative z-10">
          <Navigation />
          {/* Back to Community button - fixed at top right, below navigation */}
          <div className="fixed top-16 right-2 md:right-4 z-40">
            <Button variant="ghost" size="sm" asChild className="shadow-md bg-background/95 backdrop-blur-sm min-h-[44px] touch-manipulation text-xs md:text-sm">
              <Link to="/community" className="flex items-center gap-1.5 md:gap-2">
                <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Back to Community</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </Button>
          </div>
          <main className="container mx-auto px-3 md:px-4 pt-20 md:pt-24 pb-10 md:pb-16">
            <div className="max-w-6xl mx-auto">
              <div className="mb-4 md:mb-6 text-center">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">
                  <span className="gradient-unified animate-flicker">Time to Chat</span>
                </h1>
                <p className="text-muted-foreground text-sm md:text-base lg:text-lg px-2">
                  Meet, connect, and chat with fellow founders, entrepreneurs, and experienced mentors.
                </p>
              </div>
              
              <Card className="p-3 md:p-4 lg:p-6">
                {isResolvingUsername ? (
                  <div className="flex items-center justify-center min-h-[320px] h-[45vh] md:h-[600px]">
                    <div className="text-center">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 animate-pulse text-muted-foreground" />
                      <p className="text-muted-foreground">Loading conversation...</p>
                    </div>
                  </div>
                ) : (
                  <MessagingInterface initialConversationId={resolvedConversationId} />
                )}
              </Card>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </>
  );
};

export default Messages;
