import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ArticleGenerator } from "@/components/admin/ArticleGenerator";
import ScrollToTop from "@/components/ScrollToTop";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Shield, AlertTriangle, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const AdminTools = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (authLoading) return;
      
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking admin status:', error);
        }

        setIsAdmin(!!data);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    };

    void checkAdminStatus();
  }, [user, authLoading, navigate]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-12 max-w-2xl flex items-center justify-center">
          <Card className="w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
              <h2 className="text-2xl font-bold">Access Denied</h2>
              <p className="text-muted-foreground">
                You don't have permission to access this page. Admin privileges are required.
              </p>
              <Button onClick={() => navigate('/')} variant="outline">
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-primary/5">
      <Navigation />
      <ScrollToTop />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
                Admin Tools
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Manage and maintain the Insighta article catalogue
            </p>
          </div>

          {/* Admin Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Image className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Hero Images</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Manage the 4 images in the homepage hero section
                    </p>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/admin/hero-images">Manage Images</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <ArticleGenerator />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminTools;
