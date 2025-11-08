import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Investor {
  id: string;
  investor_name: string;
  company_fund: string;
  stage: string;
  status: string;
  last_contact: string | null;
  next_followup: string | null;
  notes: string;
}

const InvestorTracker = () => {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newInvestor, setNewInvestor] = useState({
    investor_name: "",
    company_fund: "",
    stage: "Pre-seed",
    status: "Contacted",
    last_contact: "",
    next_followup: "",
    notes: "",
  });

  useEffect(() => {
    loadInvestors();
  }, []);

  const loadInvestors = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("investor_tracker")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setInvestors(data || []);
    } catch (error) {
      console.error("Error loading investors:", error);
      toast.error("Failed to load investors");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to add investors");
        return;
      }
      const { data, error } = await supabase
        .from("investor_tracker")
        .insert({ user_id: user.id, ...newInvestor })
        .select()
        .single();
      if (error) throw error;
      setInvestors([data, ...investors]);
      setIsAddDialogOpen(false);
      setNewInvestor({
        investor_name: "", company_fund: "", stage: "Pre-seed", status: "Contacted",
        last_contact: "", next_followup: "", notes: "",
      });
      toast.success("Investor added successfully");
    } catch (error) {
      console.error("Error adding investor:", error);
      toast.error("Failed to add investor");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("investor_tracker").delete().eq("id", id);
      if (error) throw error;
      setInvestors(investors.filter(inv => inv.id !== id));
      toast.success("Investor deleted");
    } catch (error) {
      console.error("Error deleting investor:", error);
      toast.error("Failed to delete investor");
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading investors...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Track your investor relationships and manage outreach</p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Investor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Investor</DialogTitle>
              <DialogDescription>Enter the investor details to track your fundraising efforts</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Investor Name *</label>
                  <Input value={newInvestor.investor_name} onChange={(e) => setNewInvestor({ ...newInvestor, investor_name: e.target.value })} placeholder="John Smith" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Company/Fund</label>
                  <Input value={newInvestor.company_fund} onChange={(e) => setNewInvestor({ ...newInvestor, company_fund: e.target.value })} placeholder="Acme Ventures" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Stage</label>
                  <Select value={newInvestor.stage} onValueChange={(value) => setNewInvestor({ ...newInvestor, stage: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pre-seed">Pre-seed</SelectItem>
                      <SelectItem value="Seed">Seed</SelectItem>
                      <SelectItem value="Series A">Series A</SelectItem>
                      <SelectItem value="Series B">Series B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={newInvestor.status} onValueChange={(value) => setNewInvestor({ ...newInvestor, status: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Contacted">Contacted</SelectItem>
                      <SelectItem value="Meeting Scheduled">Meeting Scheduled</SelectItem>
                      <SelectItem value="Waiting">Waiting</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                      <SelectItem value="Funded">Funded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Last Contact</label>
                  <Input type="date" value={newInvestor.last_contact} onChange={(e) => setNewInvestor({ ...newInvestor, last_contact: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Next Follow-up</label>
                  <Input type="date" value={newInvestor.next_followup} onChange={(e) => setNewInvestor({ ...newInvestor, next_followup: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Notes</label>
                <Textarea value={newInvestor.notes} onChange={(e) => setNewInvestor({ ...newInvestor, notes: e.target.value })} placeholder="Add any relevant notes about this investor..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!newInvestor.investor_name}>Add Investor</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {investors.length === 0 ? (
        <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No investors tracked yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Start tracking your investor relationships to manage your fundraising journey</p>
          <Button onClick={() => setIsAddDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Your First Investor</Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Investor Name</TableHead>
                <TableHead>Company/Fund</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead>Next Follow-up</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investors.map((investor) => (
                <TableRow key={investor.id}>
                  <TableCell className="font-medium">{investor.investor_name}</TableCell>
                  <TableCell>{investor.company_fund}</TableCell>
                  <TableCell><span className="text-sm px-2 py-1 bg-primary/10 rounded">{investor.stage}</span></TableCell>
                  <TableCell>
                    <span className={"text-sm px-2 py-1 rounded " + (investor.status === "Funded" ? "bg-green-500/20 text-green-700" : investor.status === "Rejected" ? "bg-red-500/20 text-red-700" : investor.status === "Meeting Scheduled" ? "bg-blue-500/20 text-blue-700" : "bg-gray-500/20")}>
                      {investor.status}
                    </span>
                  </TableCell>
                  <TableCell>{investor.last_contact ? format(new Date(investor.last_contact), "MMM dd, yyyy") : "-"}</TableCell>
                  <TableCell>{investor.next_followup ? format(new Date(investor.next_followup), "MMM dd, yyyy") : "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(investor.id)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default InvestorTracker;
