import { useEffect, useState } from 'react';
import { usePersonalizedDashboard } from '@/hooks/usePersonalizedDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  Target, 
  Flame,
  Rocket
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DailyGoalModal } from './DailyGoalModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BusinessHealthScore } from './BusinessHealthScore';
import { MomentumMeter } from './MomentumMeter';
import { EnhancedStreakVisualization } from './EnhancedStreakVisualization';
import { QuickWinZone } from './QuickWinZone';
import { ProgressTimeline } from './ProgressTimeline';
import { QuickWinButton } from './QuickWinButton';
import { RecentWins } from './RecentWins';
import { TaskCalendar } from './TaskCalendar';
import { DailyPriorities } from './DailyPriorities';
import { useMonetization } from '@/hooks/useMonetization';
import { useEngagementAnalytics } from '@/hooks/useEngagementAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { DollarSign, BarChart3, TrendingUp, Wallet, Star, Gift } from 'lucide-react';

export const PersonalizedDashboard = () => {
  const { user } = useAuth();
  const {
    data,
    loading,
    trackActivity
  } = usePersonalizedDashboard();

  const [showDailyGoal, setShowDailyGoal] = useState(false);
  const [modalMode, setModalMode] = useState<'morning' | 'evening'>('morning');
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [todaysCheckInId, setTodaysCheckInId] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [winsRefreshTrigger, setWinsRefreshTrigger] = useState(0);

  const [period, setPeriod] = useState<'30d' | '90d' | 'all'>('30d');
  const money = useMonetization({ period, contentType: 'all' });
  const analytics = useEngagementAnalytics({ period, contentType: 'all' });
  const chartData = analytics.trends.length > 0 
    ? analytics.trends 
    : Array.from({ length: 12 }).map((_, i) => ({
        date: `Day ${i + 1}`,
        earnings: 0,
        engagement: 0,
      }));
  const chartConfig = {
    earnings: { label: 'Earnings', color: 'hsl(var(--primary))' },
    engagement: { label: 'Engagement', color: 'hsl(var(--secondary))' },
  } as const;

  const [stripeLoading, setStripeLoading] = useState(false);

  const handleConnectStripe = async () => {
    if (!user) return;
    setStripeLoading(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'create_account_link' },
        headers: { Authorization: `Bearer ${session.data.session.access_token}` }
      });
      
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No URL received');
      }
    } catch (e: any) {
      console.error('Stripe Connect error:', e);
      toast.error(e?.message || 'Failed to connect Stripe. Please try again.');
    } finally {
      setStripeLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user) return;
    const amount = money.summary.availableBalance;
    if (amount <= 0) {
      toast.error('No available balance to withdraw');
      return;
    }

    setStripeLoading(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('request-payout', {
        body: { amount_cents: Math.floor(amount * 100) },
        headers: { Authorization: `Bearer ${session.data.session.access_token}` }
      });
      
      if (error) throw error;
      toast.success('Payout requested successfully! Processing may take 2-5 business days.');
      money.refresh?.();
    } catch (e: any) {
      console.error('Payout error:', e);
      if (e?.message?.includes('Stripe Connect')) {
        toast.error('Please connect your Stripe account first');
        handleConnectStripe();
      } else {
        toast.error(e?.message || 'Failed to request payout. Please try again.');
      }
    } finally {
      setStripeLoading(false);
    }
  };

  const handleViewPayments = async () => {
    if (!user) return;
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: { Authorization: `Bearer ${session.data.session.access_token}` }
      });
      
      if (error || !data?.url) {
        // Fallback to account page
        window.location.href = '/account';
        return;
      }
      window.open(data.url, '_blank');
    } catch (e: any) {
      console.error('View payments error:', e);
      window.location.href = '/account';
    }
  };

  // Check if user has checked in today and calculate streak
  useEffect(() => {
    const checkDailyCheckIn = async () => {
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const currentHour = new Date().getHours();
      
      const { data: todayCheckIn } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('check_in_date', today)
        .maybeSingle();

      setHasCheckedInToday(!!todayCheckIn);
      
      if (todayCheckIn) {
        setTodaysCheckInId(todayCheckIn.id);
        
        // Calculate streak
        const { data: recentCheckIns } = await supabase
          .from('daily_check_ins')
          .select('check_in_date')
          .eq('user_id', user.id)
          .order('check_in_date', { ascending: false })
          .limit(30);

        if (recentCheckIns) {
          let streak = 0;
          const dates = recentCheckIns.map(c => c.check_in_date).sort().reverse();
          
          for (let i = 0; i < dates.length; i++) {
            const currentDate = new Date(dates[i]);
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() - i);
            
            if (currentDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
              streak++;
            } else {
              break;
            }
          }
          
          setCurrentStreak(streak);
        }

        // Show evening reflection if after 6 PM and haven't reflected yet
        if (currentHour >= 18 && todayCheckIn.goal_achieved === null) {
          setModalMode('evening');
          setShowDailyGoal(true);
        }
      } else {
        // Show morning goal modal if haven't checked in
        setModalMode('morning');
        setShowDailyGoal(true);
      }
    };

    checkDailyCheckIn();
    trackActivity('dashboard_view');
  }, [user]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-40 bg-muted rounded-lg" />
            <div className="h-40 bg-muted rounded-lg" />
            <div className="h-40 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const { profile, stats } = data;

  // Determine greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Tech Background Base */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/30 via-blue-950/20 to-slate-900/40" />
      
      {/* Circuit Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.08]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--primary) / 0.3) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--secondary) / 0.2) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--secondary) / 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px, 100px 100px, 25px 25px, 25px 25px'
        }} />
      </div>

      {/* Animated Hexagons - Top Right */}
      <div className="absolute top-20 right-20 opacity-20">
        {[...Array(2)].map((_, i) => (
          <div key={`hex-top-${i}`} className="absolute w-32 h-32" style={{ 
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            border: '1px solid',
            borderColor: `hsl(var(--primary) / ${0.4 - i * 0.15})`,
            transform: `scale(${1 + i * 0.3})`,
            animation: `spin ${30 - i * 5}s linear infinite ${i % 2 === 0 ? 'normal' : 'reverse'}`
          }} />
        ))}
      </div>

      {/* Animated Hexagons - Bottom Left */}
      <div className="absolute bottom-20 left-20 opacity-15">
        {[...Array(2)].map((_, i) => (
          <div key={`hex-bottom-${i}`} className="absolute w-24 h-24" style={{ 
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            border: '1px solid',
            borderColor: `hsl(var(--secondary) / ${0.3 - i * 0.1})`,
            transform: `scale(${1 + i * 0.25})`,
            animation: `spin ${25 - i * 4}s linear infinite reverse`
          }} />
        ))}
      </div>

      {/* Scanning Lines Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent" 
             style={{ animation: 'slideDown 10s ease-in-out infinite' }} />
        <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-transparent via-secondary/20 to-transparent" 
             style={{ animation: 'slideRight 12s ease-in-out infinite', animationDelay: '2s' }} />
      </div>

      {/* Floating Particles */}
      <div className="absolute top-1/2 left-10 pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <div key={`particle-left-${i}`} 
               className="absolute w-1 h-1 bg-primary/40 rounded-full"
               style={{
                 animation: `float ${8 + i * 2}s ease-in-out infinite`,
                 animationDelay: `${i * 1.5}s`,
                 left: `${i * 20}px`,
                 top: `${i * -30}px`
               }} />
        ))}
      </div>

      <div className="absolute bottom-1/3 right-10 pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <div key={`particle-right-${i}`} 
               className="absolute w-1 h-1 bg-secondary/30 rounded-full"
               style={{
                 animation: `float ${7 + i * 1.5}s ease-in-out infinite`,
                 animationDelay: `${i * 1.2}s`,
                 right: `${i * 25}px`,
                 bottom: `${i * -25}px`
               }} />
        ))}
      </div>

      {/* Pulsing Glow Orbs */}
      <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse opacity-30" 
           style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-1/4 right-1/3 w-48 h-48 bg-secondary/10 rounded-full blur-3xl animate-pulse opacity-20" 
           style={{ animationDuration: '5s', animationDelay: '2s' }} />

      {/* Main Content Container */}
      <div className="relative container mx-auto px-4 sm:px-6 py-8 max-w-7xl space-y-8">
        {/* Daily Goal Modal */}
        <DailyGoalModal 
          open={showDailyGoal}
          onOpenChange={setShowDailyGoal}
          currentStreak={currentStreak}
          mode={modalMode}
          todaysCheckInId={todaysCheckInId || undefined}
          onCheckInComplete={() => {
            setHasCheckedInToday(true);
            if (modalMode === 'morning') {
              setCurrentStreak(prev => prev + 1);
            }
          }}
        />

        {/* Welcome Header - More Prominent */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-3xl blur-3xl" />
          <Card className="relative border-primary/20 shadow-lg backdrop-blur-sm bg-card/95">
            <CardContent className="p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                    {greeting}, {profile?.full_name?.split(' ')[0] || 'Creator'}! 👋
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
                    {profile?.creative_niche 
                      ? `Let's make progress on your ${profile.creative_niche} journey`
                      : "Track your progress, celebrate wins, and stay consistent"
                    }
                  </p>
                </div>
                {stats.currentStreak > 0 && (
                  <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500/20 to-orange-500/10 px-6 py-3 rounded-full border border-orange-500/20 shadow-sm">
                    <Flame className="h-6 w-6 text-orange-500" />
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-orange-500">{stats.currentStreak}</span>
                      <span className="text-xs text-orange-500/80">day streak</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monetization and Analytics Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2"><DollarSign className="h-5 w-5" /> Monetization</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={handleConnectStripe} disabled={stripeLoading}>
                  {stripeLoading ? 'Loading...' : 'Connect Stripe'}
                </Button>
                <Button size="sm" onClick={handleWithdraw} disabled={stripeLoading || money.loading || money.summary.availableBalance <= 0}>
                  {stripeLoading ? 'Processing...' : 'Withdraw Earnings'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {money.loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : money.error ? (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{money.error}</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => money.refresh?.()}>
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Total This Month</div>
                      <div className="text-2xl font-bold">${money.summary.totalEarningsThisMonth.toFixed(2)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Tips Received</div>
                      <div className="text-2xl font-bold">${money.summary.tipsReceived.toFixed(2)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Paid Events/Content</div>
                      <div className="text-2xl font-bold">${money.summary.paidContentEarnings.toFixed(2)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Balance Available</div>
                      <div className="text-2xl font-bold">${money.summary.availableBalance.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-4 flex flex-wrap gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={handleViewPayments}>View Payment History</Button>
                    <Button size="sm" variant="outline" onClick={() => window.open('/events/new?paid=true', '_blank')}>Host Paid Event</Button>
                    <Button size="sm" variant="outline" onClick={() => window.open('/content/new?premium=true', '_blank')}>Sell Premium Content</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Analytics</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => window.open('/analytics', '_blank')}>Open Dashboard</Button>
              </div>
            </CardHeader>
            <CardContent>
              {analytics.loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : analytics.error ? (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{analytics.error}</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => analytics.refresh?.()}>
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Profile Views</div>
                      <div className="text-2xl font-bold">{analytics.summary.profileViews}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Post Engagement</div>
                      <div className="text-2xl font-bold">{analytics.summary.postEngagement}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Follower Growth</div>
                      <div className="text-2xl font-bold flex items-center gap-1"><TrendingUp className="h-5 w-5" />{analytics.summary.followerGrowth}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Stories Shared</div>
                      <div className="text-2xl font-bold">{analytics.summary.successStoriesShared}</div>
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-4 flex flex-wrap gap-2 mt-4">
                    {analytics.summary.revenueMilestones.length > 0 ? (
                      analytics.summary.revenueMilestones.map((m) => (
                        <Badge key={m} variant="secondary" className="flex items-center gap-1"><Star className="h-3 w-3" /> {m}</Badge>
                      ))
                    ) : null}
                    <Badge variant="secondary" className="flex items-center gap-1"><Flame className="h-3 w-3" /> Streaks Live</Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Trends + Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Earnings & Engagement</CardTitle>
                <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
                  <TabsList>
                    <TabsTrigger value="30d">30d</TabsTrigger>
                    <TabsTrigger value="90d">90d</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="w-full">
                <LineChart data={chartData} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" hide tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="earnings" stroke="var(--color-earnings)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="engagement" stroke="var(--color-engagement)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Recent Tips & Sales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {money.loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : money.error ? (
                <div className="text-sm text-destructive">{money.error}</div>
              ) : money.items.length > 0 ? (
                money.items.slice(0, 6).map((it) => (
                  <div key={it.id} className="flex items-center justify-between border rounded-md p-3">
                    <div className="flex items-center gap-2">
                      {it.type === 'tip' ? <Gift className="h-4 w-4" /> : it.type === 'payout' ? <Wallet className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
                      <div className="text-sm">
                        <div className="font-medium capitalize">{it.type}</div>
                        <div className="text-xs text-muted-foreground">{new Date(it.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${it.amount.toFixed(2)}</div>
                      <Badge variant="outline" className="capitalize text-xs">{it.status}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">No recent transactions</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid - Better Hierarchy */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Progress Timeline (Featured) */}
          <div className="lg:col-span-2 space-y-6">
            <ProgressTimeline />
            
            {/* Quick Actions - Simplified */}
            <Card className="backdrop-blur-sm bg-card/95">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-primary" />
                  Quick Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Link to="/bizmap-ai" className="group">
                    <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/30 transition-all">
                      <Sparkles className="h-5 w-5 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-medium">Plan</span>
                    </Button>
                  </Link>
                  <Link to="/community" className="group">
                    <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/30 transition-all">
                      <Target className="h-5 w-5 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-medium">Share</span>
                    </Button>
                  </Link>
                  <Link to="/blog" className="group">
                    <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/30 transition-all">
                      <Sparkles className="h-5 w-5 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-medium">Learn</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Daily Priorities */}
            <DailyPriorities />
          </div>

          {/* Right Column - Sidebar Widgets */}
          <div className="space-y-6">
            {/* Task Calendar */}
            <TaskCalendar />
            
            {/* Recent Wins */}
            <RecentWins refreshTrigger={winsRefreshTrigger} />
          </div>
        </div>

        {/* Floating Quick Win Button */}
        <QuickWinButton onWinAdded={() => setWinsRefreshTrigger(prev => prev + 1)} />

        {/* Support / Docs Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>How to monetize your expertise</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Step-by-step guide to tips, paid events, and premium content.</p>
              <Button variant="outline" onClick={() => window.open('https://creatives-takeover.com/docs/monetize', '_blank')}>Read Guide</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Understanding your dashboard analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Learn how we calculate views, engagement, and milestones.</p>
              <Button variant="outline" onClick={() => window.open('https://creatives-takeover.com/docs/analytics', '_blank')}>Learn More</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
