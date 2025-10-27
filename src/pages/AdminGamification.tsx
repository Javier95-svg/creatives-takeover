import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Trophy, TrendingUp, Users, Target } from "lucide-react";
import { useLeaderboard } from "@/hooks/useReputation";
import LeaderboardCard from "@/components/community/LeaderboardCard";
import { useCommunityPulse } from "@/hooks/useCommunityPulse";

const AdminGamification = () => {
  const { user } = useAuth();
  const { leaderboard } = useLeaderboard(20);
  const { weekPulse } = useCommunityPulse();

  // Admin check - in production, check against user_roles table
  // For now, just check if user is authenticated
  if (!user) {
    return <Navigate to="/login" />;
  }

  const engagementData = weekPulse.map(pulse => ({
    date: new Date(pulse.pulse_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    posts: pulse.total_posts,
    comments: pulse.total_comments,
    upvotes: pulse.total_upvotes,
    activeUsers: pulse.active_users
  }));

  const totalStats = weekPulse.reduce((acc, pulse) => ({
    totalPosts: acc.totalPosts + pulse.total_posts,
    totalComments: acc.totalComments + pulse.total_comments,
    totalUpvotes: acc.totalUpvotes + pulse.total_upvotes,
    peakActiveUsers: Math.max(acc.peakActiveUsers, pulse.active_users)
  }), { totalPosts: 0, totalComments: 0, totalUpvotes: 0, peakActiveUsers: 0 });

  return (
    <>
      <Helmet>
        <title>Creatives Takeover</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="relative min-h-screen overflow-hidden">
        <div className="relative z-10">
          <Navigation />
          <div className="pt-24 pb-12 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Gamification Analytics</h1>
                <p className="text-muted-foreground">
                  Monitor community engagement and reputation system performance
                </p>
              </div>

              {/* Stats Overview */}
              <div className="grid md:grid-cols-4 gap-4 mb-8">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-500" />
                      Total Posts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalStats.totalPosts}</div>
                    <p className="text-xs text-muted-foreground">Last 7 days</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      Comments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalStats.totalComments}</div>
                    <p className="text-xs text-muted-foreground">Last 7 days</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      Upvotes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalStats.totalUpvotes}</div>
                    <p className="text-xs text-muted-foreground">Last 7 days</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-500" />
                      Peak Active
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalStats.peakActiveUsers}</div>
                    <p className="text-xs text-muted-foreground">Last 7 days</p>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="engagement" className="space-y-6">
                <TabsList className="grid w-full md:w-auto grid-cols-3">
                  <TabsTrigger value="engagement">Engagement</TabsTrigger>
                  <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                  <TabsTrigger value="badges">Badges</TabsTrigger>
                </TabsList>

                <TabsContent value="engagement" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Weekly Engagement Trends</CardTitle>
                      <CardDescription>
                        Community activity over the past 7 days
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={engagementData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="posts" stroke="#3b82f6" name="Posts" />
                          <Line type="monotone" dataKey="comments" stroke="#10b981" name="Comments" />
                          <Line type="monotone" dataKey="activeUsers" stroke="#8b5cf6" name="Active Users" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Daily Activity Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={engagementData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="posts" fill="#3b82f6" name="Posts" />
                          <Bar dataKey="comments" fill="#10b981" name="Comments" />
                          <Bar dataKey="upvotes" fill="#f59e0b" name="Upvotes" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="leaderboard">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Contributors</CardTitle>
                      <CardDescription>
                        Users with the highest reputation scores
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {leaderboard.map((user, index) => (
                          <div key={user.user_id} className="flex items-center gap-4 p-4 rounded-lg border">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 font-bold">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">User {user.user_id.slice(0, 8)}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{user.level_name}</span>
                                <span>•</span>
                                <span>{user.total_points} points</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="badges">
                  <Card>
                    <CardHeader>
                      <CardTitle>Badge Distribution</CardTitle>
                      <CardDescription>
                        Coming soon: Badge earning statistics and trends
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
                      Badge analytics visualization will be displayed here
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </>
  );
};

export default AdminGamification;
