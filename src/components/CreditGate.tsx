import UpgradePromptDialog from "@/components/UpgradePromptDialog";

interface CreditGateProps {
  isOpen: boolean;
  onClose: () => void;
  requiredCredits: number;
  feature: string;
  onPurchase?: () => void;
}

export function CreditGate({
  isOpen,
  onClose,
  requiredCredits,
  feature,
  onPurchase,
}: CreditGateProps) {
  return (
    <UpgradePromptDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      reason="credits"
      requiredCredits={requiredCredits}
      featureName={feature}
      onUpgrade={onPurchase}
    />
  );
}
