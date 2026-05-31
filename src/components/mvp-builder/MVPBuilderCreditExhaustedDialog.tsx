import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, CreditCard, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSubscription } from '@/hooks/useSubscription';

const CREDIT_PACKS = [
  { id: 'pack_20', label: 'Starter Pack', credits: 20 },
  { id: 'pack_40', label: 'Boost Pack', credits: 40 },
  { id: 'pack_60', label: 'Power Pack', credits: 60 },
] as const;

interface MVPBuilderCreditExhaustedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MVPBuilderCreditExhaustedDialog = ({
  open,
  onOpenChange,
}: MVPBuilderCreditExhaustedDialogProps) => {
  const navigate = useNavigate();
  const { createCreditPackCheckout, actionLoading } = useSubscription();
  const [pendingPackId, setPendingPackId] = useState<string | null>(null);

  const openPackCheckout = async (packId: string) => {
    setPendingPackId(packId);
    try {
      await createCreditPackCheckout(packId);
    } finally {
      setPendingPackId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            Keep building your MVP
          </DialogTitle>
          <DialogDescription>
            You have used all your credits. Upgrade your plan or add a top-up pack to continue using MVP Builder.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Button
            type="button"
            className="h-auto justify-between gap-3 px-4 py-3"
            onClick={() => {
              onOpenChange(false);
              navigate('/pricing');
            }}
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Upgrade your plan
            </span>
            <span className="text-xs opacity-80">Compare plans</span>
          </Button>

          <div className="pt-2">
            <div className="mb-2 text-sm font-medium">Or top up your credits</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {CREDIT_PACKS.map((pack) => (
                <Button
                  key={pack.id}
                  type="button"
                  variant="outline"
                  className="h-auto flex-col items-start gap-1 px-3 py-3"
                  onClick={() => void openPackCheckout(pack.id)}
                  disabled={actionLoading}
                >
                  <span className="flex items-center gap-1.5 font-semibold">
                    <CreditCard className="h-4 w-4" />
                    {pack.label}
                  </span>
                  <span className="text-xs text-muted-foreground">+{pack.credits} Credits</span>
                  {pendingPackId === pack.id && (
                    <span className="text-xs text-muted-foreground">Opening checkout...</span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
