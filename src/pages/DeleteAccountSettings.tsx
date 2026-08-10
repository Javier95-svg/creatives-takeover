import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";

import { AccountWallpaper } from "@/components/AccountWallpaper";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface DeleteAccountResponse {
  success: boolean;
  code?: string;
  error?: string;
  notificationSent?: boolean;
}

async function readFunctionError(error: unknown): Promise<string | null> {
  if (!error || typeof error !== "object" || !("context" in error)) return null;
  if (!(error.context instanceof Response)) return null;

  try {
    const body = await error.context.clone().json() as DeleteAccountResponse;
    return body.error || null;
  } catch {
    return null;
  }
}

function invocationFallback(error: unknown): string {
  const message = error && typeof error === "object" && "message" in error
    ? String(error.message || "")
    : "";

  if (/jwt|unauthorized|session|401/i.test(message)) {
    return "Your session expired. Please sign in again before deleting your account.";
  }
  if (/fetch|relay|function|network|non-2xx|404/i.test(message)) {
    return "The account deletion service is temporarily unavailable. Please try again shortly.";
  }
  return "Your account was not deleted. Please try again.";
}

const hasPasswordIdentity = (user: NonNullable<ReturnType<typeof useAuth>["user"]>) => {
  if (user.identities?.some((identity) => identity.provider === "email")) return true;
  const providers = user.app_metadata?.providers;
  return user.app_metadata?.provider === "email"
    || (Array.isArray(providers) && providers.includes("email"));
};

const DeleteAccountSettings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState("");

  const requiresPassword = user ? hasPasswordIdentity(user) : false;

  const requestConfirmation = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (requiresPassword && !currentPassword) {
      setFormError("Enter your current password.");
      return;
    }
    if (confirmation !== "DELETE") {
      setFormError('Type "DELETE" exactly as shown.');
      return;
    }
    if (!acknowledged) {
      setFormError("Confirm that you understand this action is permanent.");
      return;
    }

    setDialogOpen(true);
  };

  const deleteAccount = async () => {
    setDialogOpen(false);
    setIsDeleting(true);
    setFormError("");

    try {
      const { data, error } = await supabase.functions.invoke<DeleteAccountResponse>("delete-account", {
        body: {
          currentPassword: requiresPassword ? currentPassword : undefined,
          confirmation,
          acknowledged,
        },
      });

      if (error) {
        const serverMessage = await readFunctionError(error);
        throw new Error(serverMessage || invocationFallback(error));
      }
      if (!data?.success) {
        throw new Error(data?.error || "Your account was not deleted. Please try again.");
      }

      try {
        await signOut();
      } catch {
        // Auth state is cleared by the context even if the deleted remote user
        // can no longer accept a sign-out request.
      }

      navigate("/", { replace: true });
      if (data.notificationSent === false) {
        toast.success("Your account was deleted.");
      } else {
        toast.success("Your account was deleted. A confirmation email has been sent.");
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : invocationFallback(error));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Helmet>
        <title>Delete Account - Creatives Takeover</title>
        <meta name="description" content="Permanently delete your Creatives Takeover account." />
      </Helmet>
      <AccountWallpaper />
      <div className="relative z-10">
        <Navigation />
        <main className="container mx-auto px-6 pb-12 pt-header-offset">
          <div className="mx-auto max-w-2xl py-12">
            <div className="mb-8 space-y-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <Trash2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Delete account</h1>
              <p className="text-muted-foreground">Permanently remove your account and personal workspace.</p>
            </div>

            {authLoading ? (
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading account" />
                </CardContent>
              </Card>
            ) : !user ? (
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Sign in required</CardTitle>
                  <CardDescription>You must be signed in to delete your account.</CardDescription>
                </CardHeader>
                <CardContent><Button asChild><Link to="/login">Sign in</Link></Button></CardContent>
              </Card>
            ) : (
              <Card className="border-destructive/40 bg-card/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                    This action cannot be undone
                  </CardTitle>
                  <CardDescription>
                    Deleting {user.email || "your account"} removes your profile, projects, account-owned files, and access. Any active subscription will be canceled first.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={requestConfirmation} className="space-y-5" noValidate>
                    {requiresPassword ? (
                      <div className="space-y-2">
                        <Label htmlFor="delete-current-password">Current password</Label>
                        <div className="relative">
                          <Input
                            id="delete-current-password"
                            name="current-password"
                            type={showPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(event) => setCurrentPassword(event.target.value)}
                            autoComplete="current-password"
                            required
                            disabled={isDeleting}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((visible) => !visible)}
                            disabled={isDeleting}
                            aria-label={`${showPassword ? "Hide" : "Show"} current password`}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Your password is verified securely before deletion.{' '}
                          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
                            Reset it if needed.
                          </Link>
                        </p>
                      </div>
                    ) : (
                      <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                        This social-login account will be verified using your active Supabase session.
                      </p>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="delete-confirmation">Type DELETE to confirm</Label>
                      <Input
                        id="delete-confirmation"
                        name="delete-confirmation"
                        value={confirmation}
                        onChange={(event) => setConfirmation(event.target.value)}
                        autoComplete="off"
                        placeholder="DELETE"
                        required
                        disabled={isDeleting}
                      />
                    </div>

                    <div className="flex items-start gap-3 rounded-md border border-destructive/25 bg-destructive/5 p-3">
                      <input
                        id="delete-acknowledgement"
                        type="checkbox"
                        checked={acknowledged}
                        onChange={(event) => setAcknowledged(event.target.checked)}
                        disabled={isDeleting}
                        className="mt-1 h-4 w-4 accent-destructive"
                      />
                      <Label htmlFor="delete-acknowledgement" className="cursor-pointer font-normal leading-5">
                        I understand that this permanently deletes my account and that deleted data cannot be recovered.
                      </Label>
                    </div>

                    {formError && (
                      <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {formError}
                      </p>
                    )}

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                      <Button asChild type="button" variant="ghost">
                        <Link to="/dashboard/settings">Back to settings</Link>
                      </Button>
                      <Button type="submit" variant="destructive" disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        {isDeleting ? "Deleting account..." : "Delete my account"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
        <Footer />
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This is the final confirmation. Your account data will be removed and any active subscription will be canceled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Keep my account</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void deleteAccount()}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeleteAccountSettings;
