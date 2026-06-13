import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Plus, 
  BarChart3, 
  FileText, 
  Calendar,
  TrendingUp,
  Users,
  Eye,
  Edit,
  Share,
  Download,
  Archive,
  Zap
} from "lucide-react";
import { useChatSessions, ChatSession } from "@/hooks/useChatSessions";
import { format } from "date-fns";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface ProjectAnalytics {
  totalProjects: number;
  completedProjects: number;
  inProgressProjects: number;
  averageScore: number;
  totalTimeSpent: string;
}

const ProjectsDashboard = () => {
  const { sessions, loading } = useChatSessions();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [analytics, setAnalytics] = useState<ProjectAnalytics>({
    totalProjects: 0,
    completedProjects: 0,
    inProgressProjects: 0,
    averageScore: 0,
    totalTimeSpent: "0h"
  });

  // Calculate analytics
  useEffect(() => {
    const completed = sessions.filter(s => s.is_completed).length;
    const inProgress = sessions.filter(s => !s.is_completed && s.current_step > 0).length;
    
    setAnalytics({
      totalProjects: sessions.length,
      completedProjects: completed,
      inProgressProjects: inProgress,
      averageScore: 0, // TODO: Calculate from success scores
      totalTimeSpent: `${sessions.length * 2}h` // Estimated
    });
  }, [sessions]);

  // Filter sessions based on search and tab
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         Object.values(session.answers).some(answer => 
                           answer.toLowerCase().includes(searchQuery.toLowerCase())
                         );
    
    const matchesTab = selectedTab === "all" || 
                      (selectedTab === "completed" && session.is_completed) ||
                      (selectedTab === "draft" && !session.is_completed);
    
    return matchesSearch && matchesTab;
  });

  const getProgressPercentage = (session: ChatSession) => {
    const totalSteps = 7; // Based on wizard steps
    return (session.current_step / totalSteps) * 100;
  };

  const getStatusBadge = (session: ChatSession) => {
    if (session.is_completed) {
      return <Badge className="bg-success-subtle text-success">Completed</Badge>;
    }
    if (session.current_step > 0) {
      return <Badge variant="secondary">In Progress</Badge>;
    }
    return <Badge variant="outline">Draft</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold creatives-font gradient-text">
            Projects Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your business plans, track progress, and analyze performance
          </p>
        </div>
        <Button asChild size="lg" className="gap-2">
          <Link to="/bizmap-ai">
            <Plus className="w-4 h-4" />
            New Business Plan
          </Link>
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                <p className="text-3xl font-bold gradient-text">{analytics.totalProjects}</p>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-success">{analytics.completedProjects}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold text-warning">{analytics.inProgressProjects}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time Invested</p>
                <p className="text-3xl font-bold text-info">{analytics.totalTimeSpent}</p>
              </div>
              <Calendar className="w-8 h-8 text-info" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects by title or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList>
                <TabsTrigger value="all">All Projects</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="draft">Drafts</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSessions.map((session) => (
          <Card key={session.id} className="glass-card hover-lift group">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                    {session.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(session.updated_at), "MMM dd, yyyy")}
                  </p>
                </div>
                {getStatusBadge(session)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(getProgressPercentage(session))}%</span>
                </div>
                <Progress value={getProgressPercentage(session)} className="h-2" />
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Business Overview</p>
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {session.answers.overview || "No overview provided yet..."}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link to={`/bizmap-ai?session=${session.id}`}>
                    <Edit className="w-3 h-3 mr-1" />
                    Continue
                  </Link>
                </Button>
                
                <Button variant="ghost" size="sm">
                  <Eye className="w-3 h-3" />
                </Button>
                
                <Button variant="ghost" size="sm">
                  <Share className="w-3 h-3" />
                </Button>
                
                {session.is_completed && (
                  <Button variant="ghost" size="sm">
                    <Download className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredSessions.length === 0 && (
        <Card className="glass-card text-center p-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
            <FileText className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {searchQuery ? "No matching projects" : "No projects yet"}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery 
              ? "Try adjusting your search terms or filters"
              : "Create your first business plan to get started"
            }
          </p>
          <Button asChild size="lg">
            <Link to="/bizmap-ai">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Project
            </Link>
          </Button>
        </Card>
      )}
    </div>
  );
};

export default ProjectsDashboard;
