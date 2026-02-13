import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Target, Trophy } from 'lucide-react';
import { useCommitments } from '@/hooks/useCommitments';
import CommitmentCard from './CommitmentCard';

const CommitmentFeed: React.FC = () => {
  const { commitments, loading, verifyCommitment } = useCommitments();
  const [filter, setFilter] = useState<'all' | 'active' | 'achieved' | 'failed'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'credits' | 'deadline'>('recent');

  const filteredCommitments = commitments.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const sortedCommitments = [...filteredCommitments].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === 'credits') {
      return b.credits_staked - a.credits_staked;
    } else {
      return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
    }
  });

  const stats = {
    total: commitments.length,
    active: commitments.filter(c => c.status === 'active').length,
    achieved: commitments.filter(c => c.status === 'achieved').length,
    totalStaked: commitments
      .filter(c => c.status === 'active')
      .reduce((sum, c) => sum + c.credits_staked, 0)
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
              <Target className="w-8 h-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Achieved</p>
                <p className="text-2xl font-bold">{stats.achieved}</p>
              </div>
              <Trophy className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">
                  {stats.total > 0 ? Math.round((stats.achieved / stats.total) * 100) : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-[hsl(var(--blue-primary))] opacity-20" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Credits Staked</p>
                <p className="text-2xl font-bold">{stats.totalStaked}</p>
              </div>
              <Trophy className="w-8 h-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Community Commitments</CardTitle>
            <div className="flex gap-3">
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="credits">Highest Stakes</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={(v: any) => setFilter(v)}>
            <TabsList className="adaptive-tabs grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="achieved">Achieved</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>
            
            <TabsContent value={filter} className="mt-6 space-y-4">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading commitments...
                </div>
              ) : sortedCommitments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No commitments found
                </div>
              ) : (
                sortedCommitments.map(commitment => (
                  <CommitmentCard
                    key={commitment.id}
                    commitment={commitment}
                    onVerify={verifyCommitment}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommitmentFeed;
