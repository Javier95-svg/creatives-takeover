import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import { useSearchParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCredits } from "@/hooks/useCredits";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [details, setDetails] = useState<{ added?: number; balance?: number; message?: string }>({});
  const { refreshBalance } = useCredits();

  useEffect(() => {
    const verify = async () => {
      if (!sessionId) return;
      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId },
        });
        if (error) throw error;
        if (data?.success) {
          await refreshBalance();
          setStatus("success");
          setDetails({ added: data.credits_added, balance: data.new_balance });
          toast.success(`Credits added: ${data.credits_added}`);
        } else {
          setStatus("error");
          setDetails({ message: data?.error || "Payment not completed" });
          toast.error(data?.error || "Payment not completed");
        }
      } catch (e: any) {
        setStatus("error");
        setDetails({ message: e?.message || "Something went wrong" });
        toast.error(e?.message || "Verification failed");
      }
    };
    verify();
  }, [sessionId, refreshBalance]);

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Payment Success | Extra Credits Added</title>
        <meta name="description" content="Your one-time credit purchase was successful. Credits have been added to your account." />
        <link rel="canonical" href="/payment-success" />
      </Helmet>
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-lg mx-auto text-center">
          {status === "verifying" && (
            <>
              <h1 className="text-2xl font-semibold mb-2">Verifying your payment…</h1>
              <p className="text-muted-foreground mb-6">Please wait while we confirm your purchase and add your credits.</p>
            </>
          )}
          {status === "success" && (
            <>
              <h1 className="text-3xl font-semibold mb-2">Payment confirmed</h1>
              <p className="text-muted-foreground mb-6">
                {details.added} credits have been added to your account. Your new balance is {details.balance} credits.
              </p>
              <div className="flex gap-3 justify-center">
                <Button asChild>
                  <Link to="/credits">View Credits</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/dream2plan">Start Using Credits</Link>
                </Button>
              </div>
            </>
          )}
          {status === "error" && (
            <>
              <h1 className="text-3xl font-semibold mb-2">Payment issue</h1>
              <p className="text-muted-foreground mb-6">{details.message}</p>
              <div className="flex gap-3 justify-center">
                <Button asChild>
                  <Link to="/credits">Back to Credits</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}