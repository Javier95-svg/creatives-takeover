import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Activity, MousePointerClick, Clock, Eye, LogOut } from "lucide-react";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { safe } from "@/integrations/supabase/safe";
import {
  useAnalyticsOverview,
  usePageViewsOverTime,
  useTopPages,
  useCTAPerformance,
  useScrollDepthStats,
  useRealTimeActivity,
  useReferrerStats,
} from "@/hooks/usePageAnalyticsData";

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const AdminAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [dateRange, setDateRange] = useState("7");
  interface ActivityEvent {
    id: string;
    user_id?: string;
    event_type: string;
    event_data?: Record<string, unknown>;
    page_path?: string;
    created_at: string;
  }
  
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [onboardingFunnel, setOnboardingFunnel] = useState({
    signupStarted: 0,
    signupCompleted: 0,
    onboardingStarted: 0,
    onboardingCompleted: 0,
    firstValueActions: 0,
  });

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error || data?.role !== "admin") {
        navigate("/");
        return;
      }

      setIsAdmin(true);
    };

    checkAdmin();
  }, [user, navigate]);

  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, parseInt(dateRange)));

  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview(startDate, endDate);
  const { data: pageViewsData } = usePageViewsOverTime(startDate, endDate);
  const { data: topPages } = useTopPages(startDate, endDate);
  const { data: ctaPerformance } = useCTAPerformance(startDate, endDate);
  const { data: scrollDepth } = useScrollDepthStats(startDate, endDate);
  const { data: realTimeActivity } = useRealTimeActivity();
  const { data: referrerStats } = useReferrerStats(startDate, endDate);

  useEffect(() => {
    (async () => {
      const { data } = await safe.select(async () =>
        await supabase
          .from('activity_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200)
      );
      setActivityEvents((data as ActivityEvent[]) || []);
    })();
  }, [dateRange]);

  useEffect(() => {
    (async () => {
      const fromIso = startDate.toISOString();
      const toIso = endDate.toISOString();

      const [
        signupStartedResult,
        signupCompletedResult,
        onboardingStartedResult,
        onboardingCompletedResult,
        firstValueActionsResult,
      ] = await Promise.all([
        supabase
          .from('conversion_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'signup_started')
          .gte('created_at', fromIso)
          .lte('created_at', toIso),
        supabase
          .from('conversion_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'signup_completed')
          .gte('created_at', fromIso)
          .lte('created_at', toIso),
        (supabase as any)
          .from('activity_events')
          .select('id', { count: 'exact', head: true })
          .eq('event', 'onboarding_started')
          .gte('created_at', fromIso)
          .lte('created_at', toIso),
        (supabase as any)
          .from('activity_events')
          .select('id', { count: 'exact', head: true })
          .eq('event', 'onboarding_completed')
          .gte('created_at', fromIso)
          .lte('created_at', toIso),
        supabase
          .from('user_activity_log')
          .select('id', { count: 'exact', head: true })
          .in('activity_type', ['activation_completed', 'mentor_saved'])
          .gte('created_at', fromIso)
          .lte('created_at', toIso),
      ]);

      setOnboardingFunnel({
        signupStarted: signupStartedResult.count ?? 0,
        signupCompleted: signupCompletedResult.count ?? 0,
        onboardingStarted: onboardingStartedResult.count ?? 0,
        onboardingCompleted: onboardingCompletedResult.count ?? 0,
        firstValueActions: firstValueActionsResult.count ?? 0,
      });
    })();
  }, [endDate, startDate]);

  if (!user || isAdmin === null || overviewLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Creatives Takeover</title>
      </Helmet>
      <Navigation />
      <div className="min-h-screen bg-background pt-20 pb-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
              <p className="text-muted-foreground">Track user behavior and engagement metrics</p>
            </div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Today</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalPageViews || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {overview?.uniqueVisitors || 0} unique visitors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Time on Site</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.avgTimeOnPage || 0}s</div>
                <p className="text-xs text-muted-foreground">Per session</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top CTA</CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold truncate">{overview?.topCTA || 'N/A'}</div>
                <p className="text-xs text-muted-foreground">
                  {overview?.totalClicks || 0} total clicks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.bounceRate || 0}%</div>
                <p className="text-xs text-muted-foreground">Exit intent rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for different views */}
          <Tabs defaultValue="overview" className="space-y-6">
	            <TabsList>
	              <TabsTrigger value="overview">Overview</TabsTrigger>
	              <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
	              <TabsTrigger value="pages">Pages</TabsTrigger>
	              <TabsTrigger value="ctas">CTAs</TabsTrigger>
	              <TabsTrigger value="engagement">Engagement</TabsTrigger>
              <TabsTrigger value="realtime">Real-Time</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

	            {/* Overview Tab */}
	            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Page Views Over Time</CardTitle>
                    <CardDescription>Daily page view trends</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={pageViewsData || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Traffic Sources</CardTitle>
                    <CardDescription>Where visitors come from</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={referrerStats || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => entry.name}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {(referrerStats || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Pages</CardTitle>
                  <CardDescription>Most visited pages</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topPages || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="page" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="views" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
	            </TabsContent>

	            <TabsContent value="onboarding" className="space-y-6">
	              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
	                <Card>
	                  <CardHeader>
	                    <CardTitle className="text-sm font-medium">Signup Started</CardTitle>
	                  </CardHeader>
	                  <CardContent>
	                    <div className="text-2xl font-bold">{onboardingFunnel.signupStarted}</div>
	                  </CardContent>
	                </Card>
	                <Card>
	                  <CardHeader>
	                    <CardTitle className="text-sm font-medium">Signup Completed</CardTitle>
	                  </CardHeader>
	                  <CardContent>
	                    <div className="text-2xl font-bold">{onboardingFunnel.signupCompleted}</div>
	                  </CardContent>
	                </Card>
	                <Card>
	                  <CardHeader>
	                    <CardTitle className="text-sm font-medium">Onboarding Started</CardTitle>
	                  </CardHeader>
	                  <CardContent>
	                    <div className="text-2xl font-bold">{onboardingFunnel.onboardingStarted}</div>
	                  </CardContent>
	                </Card>
	                <Card>
	                  <CardHeader>
	                    <CardTitle className="text-sm font-medium">Onboarding Completed</CardTitle>
	                  </CardHeader>
	                  <CardContent>
	                    <div className="text-2xl font-bold">{onboardingFunnel.onboardingCompleted}</div>
	                  </CardContent>
	                </Card>
	                <Card>
	                  <CardHeader>
	                    <CardTitle className="text-sm font-medium">First Value Actions</CardTitle>
	                  </CardHeader>
	                  <CardContent>
	                    <div className="text-2xl font-bold">{onboardingFunnel.firstValueActions}</div>
	                  </CardContent>
	                </Card>
	              </div>
	              <Card>
	                <CardHeader>
	                  <CardTitle>Onboarding Funnel Debug</CardTitle>
	                  <CardDescription>
	                    Temporary admin view for validating that signup reaches onboarding and that onboarding leads to a real first-value action.
	                  </CardDescription>
	                </CardHeader>
	                <CardContent className="space-y-2 text-sm text-muted-foreground">
	                  <p>Use this to confirm whether `onboarding_started` is live again after the retention funnel repair.</p>
	                  <p>If signup completion is healthy but onboarding start stays low, the auth callback or redirect chain is still broken.</p>
	                  <p>If onboarding completion is healthy but first-value actions stay low, the activation flow is still leaking after onboarding.</p>
	                </CardContent>
	              </Card>
	            </TabsContent>

            {/* Pages Tab */}
            <TabsContent value="pages">
              <Card>
                <CardHeader>
                  <CardTitle>Page Performance</CardTitle>
                  <CardDescription>Detailed metrics for each page</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Page</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                        <TableHead className="text-right">Unique Visitors</TableHead>
                        <TableHead className="text-right">Avg Time (s)</TableHead>
                        <TableHead className="text-right">Exit Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPages?.map((page) => (
                        <TableRow key={page.page}>
                          <TableCell className="font-medium">{page.page}</TableCell>
                          <TableCell className="text-right">{page.views}</TableCell>
                          <TableCell className="text-right">{page.uniqueVisitors}</TableCell>
                          <TableCell className="text-right">{page.avgTime}</TableCell>
                          <TableCell className="text-right">{page.exitRate}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* CTAs Tab */}
            <TabsContent value="ctas">
              <Card>
                <CardHeader>
                  <CardTitle>CTA Performance</CardTitle>
                  <CardDescription>Click-through rates for all CTAs</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CTA Name</TableHead>
                        <TableHead>Locations</TableHead>
                        <TableHead className="text-right">Total Clicks</TableHead>
                        <TableHead className="text-right">Unique Clickers</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ctaPerformance?.map((cta) => (
                        <TableRow key={cta.ctaName}>
                          <TableCell className="font-medium">{cta.ctaName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{cta.locations}</TableCell>
                          <TableCell className="text-right">{cta.clicks}</TableCell>
                          <TableCell className="text-right">{cta.uniqueClickers}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Engagement Tab */}
            <TabsContent value="engagement" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Scroll Depth Distribution</CardTitle>
                  <CardDescription>How far users scroll on pages</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={scrollDepth || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="depth" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Real-Time Tab */}
            <TabsContent value="realtime">
              <Card>
                <CardHeader>
                  <CardTitle>Live Activity Feed</CardTitle>
                  <CardDescription>Last 50 events (updates every 10 seconds)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {realTimeActivity?.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {event.event_type === 'page_view' && <Eye className="h-4 w-4 text-blue-500" />}
                          {event.event_type === 'click' && <MousePointerClick className="h-4 w-4 text-green-500" />}
                          {event.event_type === 'scroll' && <Activity className="h-4 w-4 text-purple-500" />}
                          {event.event_type === 'exit_intent' && <LogOut className="h-4 w-4 text-red-500" />}
                          <div>
                            <p className="font-medium">{event.event_type.replace('_', ' ')}</p>
                            <p className="text-sm text-muted-foreground">{event.page_path}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity Events</CardTitle>
                  <CardDescription>Latest 200 tracked activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {activityEvents.map((e) => (
                      <div key={e.id} className="rounded border p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{e.event}</div>
                          <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                        </div>
                        {e.user_id && (
                          <div className="text-xs text-muted-foreground mt-1">user: {e.user_id}</div>
                        )}
                        {e.properties && (
                          <pre className="text-xs mt-2 overflow-x-auto">{JSON.stringify(e.properties, null, 2)}</pre>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AdminAnalytics;
