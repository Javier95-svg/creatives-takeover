import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Copy, MapPin } from "lucide-react";
import { toast } from "sonner";

interface InvestorProfile {
  id: number;
  name: string;
  fund: string;
  focusAreas: string[];
  location: string;
  ticketSize: string;
  email: string;
}

const InvestorDatabase = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const sampleInvestors: InvestorProfile[] = [
    { id: 1, name: "Sarah Chen", fund: "Venture Catalyst Partners", focusAreas: ["SaaS", "AI/ML", "Enterprise"], location: "San Francisco, CA", ticketSize: "$500K - $2M", email: "sarah@venturecatalyst.com" },
    { id: 2, name: "Michael Rodriguez", fund: "Tech Forward Ventures", focusAreas: ["Fintech", "Blockchain", "B2B"], location: "New York, NY", ticketSize: "$1M - $5M", email: "michael@techforward.vc" },
    { id: 3, name: "Emily Thompson", fund: "Innovation Capital", focusAreas: ["Healthcare", "Biotech", "Digital Health"], location: "Boston, MA", ticketSize: "$2M - $10M", email: "emily@innovationcap.com" },
    { id: 4, name: "David Kim", fund: "NextGen Fund", focusAreas: ["Consumer", "E-commerce", "Mobile"], location: "Los Angeles, CA", ticketSize: "$500K - $3M", email: "david@nextgenfund.io" },
    { id: 5, name: "Jessica Williams", fund: "Growth Equity Partners", focusAreas: ["SaaS", "Cloud", "DevTools"], location: "Seattle, WA", ticketSize: "$3M - $15M", email: "jessica@growthequity.com" },
    { id: 6, name: "Robert Martinez", fund: "Climate Tech Ventures", focusAreas: ["CleanTech", "Sustainability", "Energy"], location: "Austin, TX", ticketSize: "$1M - $5M", email: "robert@climatetech.vc" },
    { id: 7, name: "Amanda Foster", fund: "Early Stage Capital", focusAreas: ["AI/ML", "Robotics", "Automation"], location: "San Francisco, CA", ticketSize: "$250K - $1M", email: "amanda@earlystagecap.com" },
    { id: 8, name: "James Patterson", fund: "Global Ventures Fund", focusAreas: ["Marketplace", "Platform", "Network Effects"], location: "New York, NY", ticketSize: "$2M - $8M", email: "james@globalventures.io" },
  ];

  const filteredInvestors = useMemo(() => {
    if (!searchQuery.trim()) return sampleInvestors;
    const query = searchQuery.toLowerCase();
    return sampleInvestors.filter(
      (investor) =>
        investor.name.toLowerCase().includes(query) ||
        investor.fund.toLowerCase().includes(query) ||
        investor.location.toLowerCase().includes(query) ||
        investor.focusAreas.some(area => area.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  const handleCopyEmail = (email: string, name: string) => {
    navigator.clipboard.writeText(email);
    toast.success("Copied " + name + " email to clipboard");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Browse our curated database of active investors</p>
        <Badge variant="secondary" className="text-xs">{filteredInvestors.length} investors found</Badge>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name, fund, location, or focus area..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
      </div>
      {searchQuery && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Active search:</span>
          <Badge variant="outline">{searchQuery}<button onClick={() => setSearchQuery("")} className="ml-2 hover:text-destructive">×</button></Badge>
        </div>
      )}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Investor Name</TableHead>
              <TableHead>Fund</TableHead>
              <TableHead>Focus Areas</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Ticket Size</TableHead>
              <TableHead>Contact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvestors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No investors found matching "{searchQuery}"
                </TableCell>
              </TableRow>
            ) : (
              filteredInvestors.map((investor) => (
                <TableRow key={investor.id}>
                  <TableCell className="font-medium">{investor.name}</TableCell>
                  <TableCell>{investor.fund}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {investor.focusAreas.map((area, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">{area}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />{investor.location}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{investor.ticketSize}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => handleCopyEmail(investor.email, investor.name)}>
                      <Copy className="w-3 h-3 mr-2" />Copy Email
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-semibold mb-2 text-sm">Tips for Reaching Out:</h4>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Research the investor\'s portfolio before reaching out</li>
          <li>Personalize your message to their focus areas</li>
          <li>Keep your initial email concise and compelling</li>
          <li>Include a clear ask and next steps</li>
          <li>Follow up if you don\'t hear back within a week</li>
        </ul>
      </div>
    </div>
  );
};

export default InvestorDatabase;
