import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Coins } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { CreditActivityCard } from "@/components/CreditActivityCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function PurchaseHistory() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Purchase History | Creatives Takeover</title>
        <meta name="description" content="Review your purchased credit packs and credit activity." />
      </Helmet>
      <Navigation />
      <main className="container mx-auto max-w-4xl px-6 pb-16 pt-header-offset">
        {loading ? null : user ? (
          <div className="space-y-6">
            <header className="space-y-2 pt-6">
              <div className="flex items-center gap-2 text-primary">
                <Coins className="h-5 w-5" />
                <span className="text-sm font-semibold">Account</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Purchase History</h1>
              <p className="text-muted-foreground">Your purchased credit packs and complete credit ledger.</p>
            </header>
            <CreditActivityCard />
          </div>
        ) : (
          <div className="py-24 text-center">
            <h1 className="text-3xl font-bold">Sign in to view your purchase history</h1>
            <Button className="mt-6" asChild>
              <Link to="/login?return=%2Fpurchase-history">Sign in</Link>
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
