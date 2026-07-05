import { useState } from 'react';
import { Loader2, Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TOP_UP_PACKS } from '@/config/pricing';
import { useSubscription } from '@/hooks/useSubscription';

interface MVPBuilderTopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MVPBuilderTopUpDialog = ({
  open,
  onOpenChange,
}: MVPBuilderTopUpDialogProps) => {
  const { createCreditPackCheckout, actionLoading } = useSubscription({ fetchTiers: false });
  const [pendingPackId, setPendingPackId] = useState<string | null>(null);

  const handleCheckout = async (packId: string) => {
    setPendingPackId(packId);
    try {
      await createCreditPackCheckout(packId);
    } finally {
      setPendingPackId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark mvp-surface max-w-sm border-white/10 bg-background p-5 text-muted-foreground shadow-2xl sm:p-5">
        <DialogHeader className="space-y-0 text-left">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <Zap className="h-4 w-4 text-white" />
            Quick Top Ups
          </DialogTitle>
          <DialogDescription className="sr-only">
            Choose a credit top-up pack to continue to Stripe checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 pt-1">
          {TOP_UP_PACKS.map((pack) => {
            const isPending = pendingPackId === pack.id;
            return (
              <Button
                key={pack.id}
                type="button"
                variant="ghost"
                className="h-14 justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all hover:border-info/35 hover:bg-white/[0.07] hover:text-white disabled:opacity-70"
                disabled={actionLoading}
                onClick={() => void handleCheckout(pack.id)}
              >
                <span className="flex items-center gap-3 text-sm font-semibold sm:text-base">
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Plus className="h-4 w-4 text-white" />
                  )}
                  {pack.label}
                </span>
                <span className="text-sm font-semibold text-info">
                  +{pack.credits} Credits
                </span>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
