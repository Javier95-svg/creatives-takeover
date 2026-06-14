import { useEffect } from "react";
import { Coins, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCredits } from "@/hooks/useCredits";
import { trackCreditActivityViewed } from "@/lib/analytics";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const formatAmount = (amount: number) => {
  if (amount > 0) return `+${amount}`;
  return String(amount);
};

export function CreditActivityCard() {
  const { transactions, fetchTransactionHistory } = useCredits();

  useEffect(() => {
    void fetchTransactionHistory(25);
    trackCreditActivityViewed({ source: "account" });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  }, []);

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              Credit Activity
            </CardTitle>
            <CardDescription>
              A transparent ledger of credits granted, spent, refunded, and purchased.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void fetchTransactionHistory(25)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
            No credit activity yet.
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 25).map((tx) => {
              const metadata = tx.metadata ?? {};
              const balanceAfter =
                metadata.balance_after ??
                metadata.balanceAfter ??
                metadata.balanceRemaining ??
                null;
              const toolName =
                metadata.tool_name ??
                metadata.toolName ??
                metadata.feature_key ??
                tx.feature ??
                tx.reason ??
                "Credit activity";

              return (
                <div key={tx.id} className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-sm text-foreground">{String(toolName)}</p>
                      <Badge variant="outline" className="text-label uppercase">
                        {tx.tx_type}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(tx.created_at)}
                      {tx.reason ? ` - ${tx.reason}` : ""}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className={tx.amount < 0 ? "font-semibold text-destructive" : "font-semibold text-success"}>
                      {formatAmount(tx.amount)} credits
                    </p>
                    {balanceAfter !== null && (
                      <p className="text-xs text-muted-foreground">{String(balanceAfter)} after</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
