import React, { useState } from 'react';
import { InvestorMatch } from '@/types/investor';
import { InvestorMatchCard } from './InvestorMatchCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { MatchRequest } from '@/types/investor';

interface InvestorMatchResultsProps {
  matches: InvestorMatch[];
  topMatches: string[];
  onViewProfile?: (investorId: string) => void;
  onExport?: () => void;
  matchRequest?: MatchRequest; // Pass match request for email generation
}

export const InvestorMatchResults: React.FC<InvestorMatchResultsProps> = ({
  matches,
  topMatches,
  onViewProfile,
  onExport,
  matchRequest
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'check-size' | 'name'>('score');
  const [minScore, setMinScore] = useState<number>(0);

  // Filter and sort matches
  const filteredAndSorted = React.useMemo(() => {
    let filtered = matches.filter(match => {
      const matchesSearch = searchQuery === '' || 
        match.investor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.investor.firm_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesScore = match.match_score >= minScore;
      
      return matchesSearch && matchesScore;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.match_score - a.match_score;
        case 'check-size':
          const aSize = a.investor.typical_check_size_min || 0;
          const bSize = b.investor.typical_check_size_min || 0;
          return bSize - aSize;
        case 'name':
          return a.investor.name.localeCompare(b.investor.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [matches, searchQuery, sortBy, minScore]);

  // Separate top matches
  const topMatchesList = filteredAndSorted.filter(match => 
    topMatches.includes(match.investor.id)
  );
  const otherMatches = filteredAndSorted.filter(match => 
    !topMatches.includes(match.investor.id)
  );

  // Export to CSV
  const handleExportCSV = () => {
    const csvRows = [
      ['Investor Name', 'Firm', 'Match Score', 'Check Size', 'Stages', 'Industries', 'Locations'].join(','),
      ...filteredAndSorted.map(match => [
        `"${match.investor.name}"`,
        `"${match.investor.firm_name}"`,
        match.match_score,
        match.investor.typical_check_size_min && match.investor.typical_check_size_max
          ? `$${(match.investor.typical_check_size_min / 1000).toFixed(0)}K - $${(match.investor.typical_check_size_max / 1000).toFixed(0)}K`
          : 'N/A',
        match.investor.investment_stages.join('; '),
        match.investor.industries.join('; '),
        match.investor.locations.join('; ')
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investor-matches-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (onExport) {
      onExport();
    }
  };

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No matches found. Try adjusting your search criteria.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              Found {filteredAndSorted.length} Investor{filteredAndSorted.length !== 1 ? 's' : ''}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search investors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(value: 'score' | 'check-size' | 'name') => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Sort by Match Score</SelectItem>
                <SelectItem value="check-size">Sort by Check Size</SelectItem>
                <SelectItem value="name">Sort by Name</SelectItem>
              </SelectContent>
            </Select>

            {/* Min Score */}
            <Select
              value={minScore.toString()}
              onValueChange={(value) => setMinScore(parseInt(value, 10))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Min score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Scores</SelectItem>
                <SelectItem value="50">50%+ Match</SelectItem>
                <SelectItem value="60">60%+ Match</SelectItem>
                <SelectItem value="70">70%+ Match</SelectItem>
                <SelectItem value="80">80%+ Match</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Top 3 Matches */}
      {topMatchesList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Start Here - Top Matches</h2>
            <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              {topMatchesList.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topMatchesList.map(match => (
              <InvestorMatchCard
                key={match.investor.id}
                match={match}
                isTopMatch={true}
                onViewProfile={onViewProfile}
                matchRequest={matchRequest}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Other Matches */}
      {otherMatches.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">All Matches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherMatches.map(match => (
              <InvestorMatchCard
                key={match.investor.id}
                match={match}
                onViewProfile={onViewProfile}
                matchRequest={matchRequest}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Results Message */}
      {filteredAndSorted.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No matches found with your current filters. Try adjusting your search criteria.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

