import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CollaborationDashboard } from '@/components/collaboration/CollaborationDashboard';
import { useSprints } from '@/hooks/useSprints';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  MessageSquare, 
  Zap, 
  Eye, 
  GitBranch, 
  Clock,
  CheckCircle2,
  Target,
  Lightbulb 
} from 'lucide-react';

const CollaborationDemo = () => {
  const { user } = useAuth();
  const { sprints, loading } = useSprints();

  const demosprint = sprints?.[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Creatives Takeover</title>
        <meta name="description" content="Experience real-time collaboration features for business planning and sprint management with Startblocks." />
        <meta name="keywords" content="collaboration, real-time, business planning, sprint management, teamwork" />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="container mx-auto px-4 py-8 pt-header-offset">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Advanced Collaboration Demo</h1>
            <p className="text-xl text-muted-foreground mb-6">
              Experience all phases of collaborative development in one place
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="bg-primary/10 px-4 py-2 rounded-lg">
                <h3 className="font-semibold text-primary">🎨 Phase 3</h3>
                <p className="text-sm text-muted-foreground">Interactive tools</p>
              </div>
              <div className="bg-secondary/10 px-4 py-2 rounded-lg">
                <h3 className="font-semibold text-secondary-foreground">🚀 Phase 4</h3>
                <p className="text-sm text-muted-foreground">Advanced collaboration</p>
              </div>
              <div className="bg-accent/10 px-4 py-2 rounded-lg">
                <h3 className="font-semibold text-accent-foreground">📞 Voice & Video</h3>
                <p className="text-sm text-muted-foreground">Real-time communication</p>
              </div>
            </div>
          </div>

          {/* Main Collaboration Dashboard */}
          <div className="h-[600px] responsive-collab-shell">
            <CollaborationDashboard 
              sessionId={demosprint?.id || 'demo-session'}
              sprintId={demosprint?.id}
            />
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default CollaborationDemo;
