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

const Messages = () => {
  const { isAuthenticated, user } = useAuth();
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  const conversationIdParam = searchParams.get('conversationId');
  const { getUserIdByUsername, startConversation } = useMessaging();
  const [resolvedConversationId, setResolvedConversationId] = useState<string | undefined>(conversationIdParam || undefined);
  const [isResolvingUsername, setIsResolvingUsername] = useState(false);
  const hasResolvedUsername = useRef<string | null>(null);

  // Handle username parameter
  useEffect(() => {
    if (!username || !user || !isAuthenticated) {
      // If no username, use conversationId from query param or undefined
      setResolvedConversationId(conversationIdParam || undefined);
      hasResolvedUsername.current = null;
      return;
    }

    // Prevent re-resolving the same username
    if (hasResolvedUsername.current === username && resolvedConversationId) {
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
        console.error('Error resolving username:', error);
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
          <main className="container mx-auto px-4 py-8">
            <div className="max-w-6xl mx-auto">
              <div className="mb-6">
                <Button variant="ghost" size="sm" asChild className="mb-4">
                  <Link to="/community" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Community
                  </Link>
                </Button>
                <h1 className="text-5xl font-bold mb-2">
                  <span className="gradient-unified">Time to Chat</span>
                </h1>
                <p className="text-muted-foreground text-lg">
                  Meet, connect, and chat with fellow founders, entrepreneurs, and experienced mentors.
                </p>
              </div>
              
              <Card className="p-6">
                {isResolvingUsername ? (
                  <div className="flex items-center justify-center h-[600px]">
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