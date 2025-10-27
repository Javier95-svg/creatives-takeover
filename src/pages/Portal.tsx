import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Lock } from 'lucide-react';
import BlogGrid from '@/components/blog/BlogGrid';
import SEO from '@/components/SEO';
import ScrollToTop from '@/components/ScrollToTop';

const Portal = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      navigate('/login');
    }
  }, [mounted, authLoading, user, navigate]);

  if (authLoading || roleLoading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <>
        <SEO 
          title="Creatives Takeover"
          description="You don't have permission to access this area."
        />
        <Navigation />
        <div className="min-h-screen pt-24 pb-16 px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="border-destructive/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Lock className="w-6 h-6 text-destructive" />
                  <CardTitle>Access Denied</CardTitle>
                </div>
                <CardDescription>
                  You don't have permission to access this area. This section is restricted to administrators only.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/')} variant="outline">
                  Return to Home
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
        <SEO 
          title="Creatives Takeover"
        description="Create and manage articles in the admin portal."
      />
      <Navigation />
      <ScrollToTop />
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Portal</h1>
            <p className="text-muted-foreground">
              Admin area for creating and managing articles
            </p>
          </div>
          
          <BlogGrid />
        </div>
      </div>
    </>
  );
};

export default Portal;
