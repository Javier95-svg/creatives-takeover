import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useFeedbackData, useFeedbackStats } from "@/hooks/useFeedbackData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { MessageSquare, Star, TrendingUp, DollarSign } from "lucide-react";
import { format } from "date-fns";

const COLORS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

export default function AdminFeedback() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const { data: responses, isLoading } = useFeedbackData();
  const { data: stats } = useFeedbackStats();

  useEffect(() => {
    async function checkAdminRole() {
      if (!user) {
        console.log("No user, redirecting to login");
        navigate("/login");
        return;
      }

      console.log("Checking admin role for user:", user.id);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      console.log("Admin check result:", { data, error });

      if (!data || error) {
        console.log("Admin check failed, redirecting to home");
        if (error) console.error("Error details:", error);
        setIsAdmin(false);
        navigate("/");
      } else {
        console.log("User is admin");
        setIsAdmin(true);
      }
    }

    checkAdminRole();
  }, [user, navigate]);

  if (isLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
    rating: `${rating} Star${rating > 1 ? 's' : ''}`,
    count: responses?.filter(r => r.website_ux_rating === rating).length || 0,
  }));

  const featureData = stats?.featureCounts
    ? Object.entries(stats.featureCounts).map(([name, value]) => ({ name, value }))
    : [];

  const pricingData = stats?.pricingDistribution
    ? Object.entries(stats.pricingDistribution).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <>
      <Helmet>
        <title>Feedback Dashboard - Admin | BizMap AI</title>
      </Helmet>
      <Navigation />
      
      <main className="min-h-screen pt-20 pb-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Feedback Dashboard</h1>
            <p className="text-muted-foreground">Quiz responses and user insights</p>
          </div>

          {/* Stats Overview */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalResponses || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg UX Rating</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.avgRating || 0} / 5</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Suggested Price</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats?.avgSuggestedPrice || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {responses?.length ? ((responses.filter(r => r.credit_bonus_earned > 0).length / responses.length) * 100).toFixed(0) : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="analytics" className="space-y-4">
            <TabsList>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="responses">Responses</TabsTrigger>
            </TabsList>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>UX Rating Distribution</CardTitle>
                    <CardDescription>How users rated the website experience</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={ratingDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="rating" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pricing Perception</CardTitle>
                    <CardDescription>User perception of pricing</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pricingData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pricingData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Most Requested Features</CardTitle>
                    <CardDescription>Features users are most interested in</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={featureData.sort((a, b) => b.value - a.value).slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="responses">
              <Card>
                <CardHeader>
                  <CardTitle>All Responses</CardTitle>
                  <CardDescription>Complete list of quiz submissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>UX Rating</TableHead>
                        <TableHead>Pricing</TableHead>
                        <TableHead>Suggested $</TableHead>
                        <TableHead>Features</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {responses?.map((response) => (
                        <TableRow key={response.id}>
                          <TableCell className="text-xs">
                            {format(new Date(response.created_at), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell className="text-xs">{response.email || "Anonymous"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{response.user_role}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Star className="w-3 h-3 mr-1 fill-primary text-primary" />
                              {response.website_ux_rating}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{response.pricing_perception}</TableCell>
                          <TableCell>${response.suggested_price || "N/A"}</TableCell>
                          <TableCell className="text-xs max-w-xs truncate">
                            {response.selected_features?.join(", ") || "None"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </>
  );
}
