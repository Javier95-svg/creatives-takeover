import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ExternalLink, Search, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";

interface JobApplication {
  id: string;
  position_id: string;
  name: string;
  email: string;
  linkedin_url: string | null;
  portfolio_url: string | null;
  cover_message: string;
  cv_file_path: string;
  status: string;
  created_at: string;
  admin_notes: string | null;
  positions: {
    title: string;
  };
}

export default function AdminJobApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);

  useEffect(() => {
    void checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      void fetchApplications();
    }
  }, [isAdmin]);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, statusFilter]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (error || !data) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
  };

  const fetchApplications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("job_applications")
      .select(`
        *,
        positions:job_positions(title)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
      toast({
        title: "Error",
        description: "Failed to load applications.",
        variant: "destructive",
      });
    } else {
      setApplications(data || []);
    }
    setLoading(false);
  };

  const filterApplications = () => {
    let filtered = applications;

    if (searchTerm) {
      filtered = filtered.filter(
        (app) =>
          app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.positions.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    setFilteredApplications(filtered);
  };

  const downloadCV = async (filePath: string, applicantName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("cv-uploads")
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${applicantName.replace(/\s+/g, "_")}_CV.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "CV downloaded successfully.",
      });
    } catch (error) {
      console.error("Error downloading CV:", error);
      toast({
        title: "Error",
        description: "Failed to download CV.",
        variant: "destructive",
      });
    }
  };

  const updateApplicationStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("job_applications")
      .update({
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update application status.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Application status updated.",
      });
      void fetchApplications();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-success";
      case "rejected":
        return "bg-destructive";
      case "reviewed":
        return "bg-info";
      default:
        return "bg-warning";
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Creatives Takeover</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <Navigation />

        <div className="container mx-auto px-4 py-24">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-3xl font-bold">Job Applications Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by name, email, or position..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading applications...</p>
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-xl font-semibold">No applications found</p>
                  <p className="text-muted-foreground mt-2">
                    {searchTerm || statusFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Applications will appear here once submitted"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Applicant</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Applied</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell>
                            <div>
                              <p className="font-semibold">{app.name}</p>
                              <p className="text-sm text-muted-foreground">{app.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{app.positions.title}</TableCell>
                          <TableCell>
                            {new Date(app.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(app.status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(app.status)}
                                {app.status}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadCV(app.cv_file_path, app.name)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {app.linkedin_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(app.linkedin_url!, "_blank")}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                              <Select
                                value={app.status}
                                onValueChange={(value) => updateApplicationStatus(app.id, value)}
                              >
                                <SelectTrigger className="w-32 h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="reviewed">Reviewed</SelectItem>
                                  <SelectItem value="accepted">Accepted</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Footer />
      </div>
    </>
  );
}
