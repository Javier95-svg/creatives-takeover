import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CollaborativeSprintKanban } from '@/components/collaboration/CollaborativeSprintKanban';
import { PresenceIndicator } from '@/components/collaboration/PresenceIndicator';
import { LiveComments } from '@/components/collaboration/LiveComments';
import { useCollaboration } from '@/hooks/useCollaboration';
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
  const { sprints, loading: sprintsLoading } = useSprints();
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');

  const demosprint = sprints.find(s => s.id === selectedSprintId) || sprints[0];
  
  const {
    session,
    activeUsers,
    comments,
    loading: collaborationLoading,
    addComment,
    resolveComment,
  } = useCollaboration('sprint', demosprint?.id || '');

  if (sprintsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Real-Time Collaboration Demo - Startblocks</title>
        <meta name="description" content="Experience real-time collaboration features for business planning and sprint management with Startblocks." />
        <meta name="keywords" content="collaboration, real-time, business planning, sprint management, teamwork" />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold tracking-tight">
                Real-Time Collaboration
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Experience seamless teamwork with live editing, real-time comments, 
                and presence indicators. Collaborate on business plans and sprints like never before.
              </p>
            </div>

            {/* Features Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-blue-500" />
                    Live Presence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    See who's online and collaborating in real-time with live avatars and status indicators.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="h-5 w-5 text-green-500" />
                    Live Comments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Add contextual comments that appear instantly for all team members.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Real-Time Updates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Watch changes happen live as team members update tasks and plans.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-purple-500" />
                    Collaborative Planning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Work together on business plans and sprint boards simultaneously.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Collaboration Status */}
            {session && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Collaboration Active
                    <Badge variant="secondary">
                      Session ID: {session.id.slice(-8)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <PresenceIndicator 
                      activeUsers={activeUsers}
                      currentUserId={user?.id}
                    />
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {comments.filter(c => !c.is_resolved).length} active comments
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Started {new Date(session.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Collaboration Interface */}
            <Tabs defaultValue="kanban" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="kanban">Sprint Kanban</TabsTrigger>
                <TabsTrigger value="comments">Live Comments</TabsTrigger>
                <TabsTrigger value="guide">How It Works</TabsTrigger>
              </TabsList>

              <TabsContent value="kanban" className="space-y-6">
                {demosprint ? (
                  <CollaborativeSprintKanban sprint={demosprint} />
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No Sprints Available</h3>
                      <p className="text-muted-foreground mb-4">
                        Create a sprint to experience collaborative planning features.
                      </p>
                      <Button>Create Your First Sprint</Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="comments" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <LiveComments
                    comments={comments}
                    onAddComment={addComment}
                    onResolveComment={resolveComment}
                    currentUserId={user?.id}
                  />
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Collaboration Tips</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Contextual Comments</p>
                          <p className="text-sm text-muted-foreground">
                            Add comments to specific tasks or sections for targeted feedback.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Eye className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Live Visibility</p>
                          <p className="text-sm text-muted-foreground">
                            All comments appear instantly for everyone in the session.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Resolution Tracking</p>
                          <p className="text-sm text-muted-foreground">
                            Mark comments as resolved to keep conversations organized.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="guide" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <GitBranch className="h-5 w-5" />
                        Getting Started
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <p className="font-medium">1. Start a Collaboration Session</p>
                        <p className="text-sm text-muted-foreground">
                          Sessions automatically start when you view a sprint or business plan.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="font-medium">2. Invite Team Members</p>
                        <p className="text-sm text-muted-foreground">
                          Share the sprint or plan with your team members for real-time collaboration.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="font-medium">3. Collaborate Live</p>
                        <p className="text-sm text-muted-foreground">
                          Make changes, add comments, and see updates happen in real-time.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Advanced Features
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <p className="font-medium">Live Cursor Tracking</p>
                        <p className="text-sm text-muted-foreground">
                          See where other users are working with live cursor indicators.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="font-medium">Conflict Resolution</p>
                        <p className="text-sm text-muted-foreground">
                          Smart merging handles simultaneous edits automatically.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="font-medium">Session History</p>
                        <p className="text-sm text-muted-foreground">
                          Track all changes and comments with full version history.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default CollaborationDemo;