import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, TrendingUp, Calendar, Activity, RefreshCw } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { CreditDisplay } from "./CreditDisplay";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CreditAnalyticsProps {
  className?: string;
}

export function CreditAnalytics({ className }: CreditAnalyticsProps) {
  const { 
    balance, 
    transactions, 
    fetchTransactionHistory, 
    loading,
    refreshBalance
  } = useCredits();
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    void fetchTransactionHistory(50);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refreshBalance(),
      fetchTransactionHistory(50)
    ]);
    setIsRefreshing(false);
  };

  // Calculate analytics
  const last30Days = transactions.filter(t => {
    const date = new Date(t.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return date >= thirtyDaysAgo;
  });

  const totalSpent = last30Days
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalEarned = last30Days
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const mostUsedFeature = last30Days
    .filter(t => t.feature)
    .reduce((acc, t) => {
      acc[t.feature] = (acc[t.feature] || 0) + Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const topFeature = Object.entries(mostUsedFeature)
    .sort(([,a], [,b]) => b - a)[0];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (txType: string) => {
    switch (txType) {
      case 'deduct': return '↓';
      case 'grant': 
      case 'purchase': return '↑';
      case 'refund': return '↩';
      default: return '•';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Credit Analytics</h2>
          <p className="text-muted-foreground">
            Track your credit usage and transaction history
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balance}</div>
            <p className="text-xs text-muted-foreground">
              Credits available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">-{totalSpent}</div>
            <p className="text-xs text-muted-foreground">
              Credits used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Earned</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">+{totalEarned}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Feature</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {topFeature ? topFeature[0] : 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              {topFeature ? `${topFeature[1]} credits used` : 'No usage yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Balance Display */}
      <CreditDisplay variant="detailed" showPurchaseButton={true} />

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-sm">Start using BizMap AI to see your credit activity here</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(0, 10).map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-sm">
                        {formatDate(transaction.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.amount > 0 ? "default" : "secondary"}>
                          {getTransactionIcon(transaction.tx_type)} {transaction.tx_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {transaction.feature || '—'}
                      </TableCell>
                      <TableCell>
                        <span className={transaction.amount > 0 ? "text-success" : "text-destructive"}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {transaction.reason || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {transactions.length > 10 && (
                <div className="text-center">
                  <Button variant="outline" size="sm">
                    View All Transactions ({transactions.length} total)
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}