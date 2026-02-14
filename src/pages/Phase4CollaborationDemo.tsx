import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSprints } from '@/hooks/useSprints';
import { Phase4CollaborationHub } from '@/components/collaboration/Phase4CollaborationHub';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Helmet } from 'react-helmet-async';

const Phase4CollaborationDemo = () => {
  const { user } = useAuth();
  const { sprints, loading } = useSprints();

  const demosprint = sprints?.[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Creatives Takeover</title>
        <meta name="description" content="Experience Phase 4 collaboration with video calls, enhanced presence, activity feeds, and real-time notifications." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Phase 4 Collaboration Demo</h1>
            <p className="text-xl text-muted-foreground mb-6">
              Advanced real-time collaboration with video calls, activity feeds, and enhanced presence
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="bg-primary/10 px-4 py-2 rounded-lg">
                <h3 className="font-semibold text-primary">📞 Video Calls</h3>
                <p className="text-sm text-muted-foreground">Voice & video communication</p>
              </div>
              <div className="bg-secondary/10 px-4 py-2 rounded-lg">
                <h3 className="font-semibold text-secondary-foreground">👀 Enhanced Presence</h3>
                <p className="text-sm text-muted-foreground">Rich user status tracking</p>
              </div>
              <div className="bg-accent/10 px-4 py-2 rounded-lg">
                <h3 className="font-semibold text-accent-foreground">📊 Activity Feeds</h3>
                <p className="text-sm text-muted-foreground">Real-time activity tracking</p>
              </div>
              <div className="bg-green-500/10 px-4 py-2 rounded-lg">
                <h3 className="font-semibold text-green-700">🔔 Smart Notifications</h3>
                <p className="text-sm text-muted-foreground">Contextual alerts</p>
              </div>
            </div>
          </div>

          {/* Phase 4 Collaboration Hub */}
          <div className="h-[min(72vh,38rem)] min-h-[24rem] md:h-[min(68vh,46rem)] md:min-h-[30rem] lg:h-[700px]">
            <Phase4CollaborationHub 
              sessionId={demosprint?.id || 'demo-session'}
            />
          </div>

          {/* Features Overview */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                📞 Video & Voice Calls
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• HD video calls with screen sharing</li>
                <li>• Crystal clear voice communication</li>
                <li>• Call recording and playback</li>
                <li>• Multiple participants support</li>
              </ul>
            </div>

            <div className="p-6 bg-card rounded-lg border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                👀 Enhanced Presence
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Rich status indicators</li>
                <li>• Activity type tracking</li>
                <li>• Custom status messages</li>
                <li>• Real-time user activity</li>
              </ul>
            </div>

            <div className="p-6 bg-card rounded-lg border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                📊 Activity Feeds
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Real-time activity tracking</li>
                <li>• Timeline view of changes</li>
                <li>• User action history</li>
                <li>• Filtered activity views</li>
              </ul>
            </div>

            <div className="p-6 bg-card rounded-lg border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                🔔 Smart Notifications
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Contextual notifications</li>
                <li>• Priority-based alerts</li>
                <li>• Read/unread status</li>
                <li>• Bulk notification management</li>
              </ul>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
};

export default Phase4CollaborationDemo;
