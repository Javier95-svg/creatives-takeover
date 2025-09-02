import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { CreditAnalytics } from "@/components/CreditAnalytics";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LogIn } from "lucide-react";

export default function CreditAnalyticsPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        
        <div className="flex-1 flex items-center justify-center pt-16">
          <div className="text-center space-y-6 max-w-md mx-auto p-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Authentication Required</h1>
              <p className="text-muted-foreground">
                You need to sign in to view your credit analytics and usage history.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link to="/login">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <Link to="/signup">
                  Create Account
                </Link>
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <Link to="/" className="hover:underline">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Credit Analytics | BizMap AI</title>
        <meta 
          name="description" 
          content="Track your credit usage, view transaction history, and manage your BizMap AI credits." 
        />
      </Helmet>

      <Navigation />
      
      <main className="flex-1 pt-20 pb-12">
        <div className="container mx-auto px-6">
          <CreditAnalytics />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}