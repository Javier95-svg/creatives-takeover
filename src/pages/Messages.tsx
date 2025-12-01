import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedBackground from "@/components/AnimatedBackground";
import { MessagingInterface } from "@/components/social/MessagingInterface";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Messages = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <>
        <Helmet>
          <title>Creatives Takeover</title>
          <meta name="description" content="Direct messaging for entrepreneurs and creators" />
        </Helmet>
        <div className="relative min-h-screen overflow-hidden">
          <AnimatedBackground />
          <div className="relative z-10">
            <Navigation />
            <main className="container mx-auto px-4 py-12">
              <Card className="max-w-md mx-auto p-6 text-center">
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
        <AnimatedBackground />
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
                <h1 className="text-3xl font-bold mb-2">Messages</h1>
                <p className="text-muted-foreground">
                  Connect and chat with other entrepreneurs and creators
                </p>
              </div>
              
              <Card className="p-6">
                <MessagingInterface />
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