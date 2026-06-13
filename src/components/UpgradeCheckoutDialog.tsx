import { SubscriptionTier } from "@/hooks/useSubscription";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Crown, CreditCard } from "lucide-react";
import { useEffect } from "react";

export interface CheckoutFormState {
  fullName: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface UpgradeCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: SubscriptionTier | null;
  formData: CheckoutFormState;
  onFormChange: (field: keyof CheckoutFormState, value: string) => void;
  onSubmit: () => Promise<void> | void;
  submitting?: boolean;
  hasSavedAddress?: boolean;
}

const fieldBaseClasses =
  "text-sm font-medium leading-none after:content-['*'] after:ml-0.5 after:text-destructive";

export function UpgradeCheckoutDialog({
  open,
  onOpenChange,
  tier,
  formData,
  onFormChange,
  onSubmit,
  submitting = false,
  hasSavedAddress = false,
}: UpgradeCheckoutDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    if (tier) {
      const focusTimer = window.setTimeout(() => {
        const input = document.getElementById("upgrade-full-name") as
          | HTMLInputElement
          | null;
        input?.focus();
      }, 150);

      return () => window.clearTimeout(focusTimer);
    }
  }, [open, tier]);

  const formattedPrice =
    tier && tier.price_cents > 0
      ? `$${(tier.price_cents / 100).toFixed(2)}`
      : "Free";

  const featureList = Array.isArray(tier?.features)
    ? tier?.features
    : tier?.features && typeof tier.features === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(tier.features as unknown as string);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return (tier?.features as unknown as string)
              .split(",")
              .map((f) => f.trim())
              .filter(Boolean);
          }
        })()
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="gap-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="h-5 w-5 text-primary" />
              Secure Plan Upgrade
            </DialogTitle>
            {tier ? (
              <Badge variant="secondary" className="capitalize">
                {tier.tier_name}
              </Badge>
            ) : null}
          </div>
          <DialogDescription>
            We&apos;ve pre-filled what we already know. Confirm your details and
            continue to checkout—your fields on Stripe will match automatically.
          </DialogDescription>
          {hasSavedAddress ? (
            <div className="rounded-md bg-success/10 px-3 py-2 text-xs text-success dark:bg-success/10 dark:text-success">
              Billing details loaded from your last upgrade attempt. Review and
              update anything that has changed.
            </div>
          ) : null}
        </DialogHeader>

        {tier ? (
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium capitalize">
                  {tier.tier_name} plan
                </p>
                <p className="text-xs text-muted-foreground">
                  {tier.monthly_credits} credits / month
                </p>
              </div>
              <div className="flex items-center gap-2 text-lg font-semibold">
                {formattedPrice}
                {tier.price_cents > 0 ? (
                  <span className="text-xs font-normal text-muted-foreground">
                    billed monthly
                  </span>
                ) : null}
              </div>
            </div>
            {featureList && featureList.length > 0 ? (
              <ul className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                {featureList.slice(0, 4).map((feature, index) => (
                  <li key={`${feature}-${index}`} className="flex items-start gap-2">
                    <Crown className="mt-0.5 h-3 w-3 flex-shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
                {featureList.length > 4 ? (
                  <li className="text-primary">
                    + {featureList.length - 4} more premium features
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>
        ) : null}

        <form
          className="grid gap-4 pt-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label
                htmlFor="upgrade-full-name"
                className={cn(fieldBaseClasses, {
                  "after:hidden": Boolean(formData.fullName),
                })}
              >
                Full name
              </Label>
              <Input
                id="upgrade-full-name"
                autoComplete="name"
                placeholder="Taylor Creator"
                value={formData.fullName}
                onChange={(event) =>
                  onFormChange("fullName", event.target.value)
                }
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="upgrade-email"
                className={cn(fieldBaseClasses, {
                  "after:hidden": Boolean(formData.email),
                })}
              >
                Email
              </Label>
              <Input
                id="upgrade-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(event) =>
                  onFormChange("email", event.target.value)
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label
              htmlFor="upgrade-address-line1"
              className={cn(fieldBaseClasses, {
                "after:hidden": Boolean(formData.addressLine1),
              })}
            >
              Billing address
            </Label>
            <Input
              id="upgrade-address-line1"
              autoComplete="address-line1"
              placeholder="123 Creative Ave"
              value={formData.addressLine1}
              onChange={(event) =>
                onFormChange("addressLine1", event.target.value)
              }
            />
            <Input
              id="upgrade-address-line2"
              autoComplete="address-line2"
              placeholder="Suite, floor, etc. (optional)"
              value={formData.addressLine2}
              onChange={(event) =>
                onFormChange("addressLine2", event.target.value)
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label
                htmlFor="upgrade-city"
                className={cn(fieldBaseClasses, {
                  "after:hidden": Boolean(formData.city),
                })}
              >
                City
              </Label>
              <Input
                id="upgrade-city"
                autoComplete="address-level2"
                placeholder="Austin"
                value={formData.city}
                onChange={(event) => onFormChange("city", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="upgrade-state"
                className={cn(fieldBaseClasses, {
                  "after:hidden": Boolean(formData.state),
                })}
              >
                State / Province
              </Label>
              <Input
                id="upgrade-state"
                autoComplete="address-level1"
                placeholder="TX"
                value={formData.state}
                onChange={(event) => onFormChange("state", event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr]">
            <div className="grid gap-2">
              <Label
                htmlFor="upgrade-postal"
                className={cn(fieldBaseClasses, {
                  "after:hidden": Boolean(formData.postalCode),
                })}
              >
                Postal code
              </Label>
              <Input
                id="upgrade-postal"
                autoComplete="postal-code"
                placeholder="73301"
                value={formData.postalCode}
                onChange={(event) =>
                  onFormChange("postalCode", event.target.value)
                }
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label
                htmlFor="upgrade-country"
                className={cn(fieldBaseClasses, {
                  "after:hidden": Boolean(formData.country),
                })}
              >
                Country / Region
              </Label>
              <Input
                id="upgrade-country"
                autoComplete="country-name"
                placeholder="United States"
                value={formData.country}
                onChange={(event) =>
                  onFormChange("country", event.target.value)
                }
              />
            </div>
          </div>
        </form>

        <DialogFooter className="pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={() => onSubmit()} disabled={submitting}>
            {submitting ? "Preparing checkout..." : "Continue to checkout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UpgradeCheckoutDialog;

