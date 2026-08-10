import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, ShieldCheck } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";

import { AccountWallpaper } from "@/components/AccountWallpaper";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { trackActivity } from "@/lib/activity";
import {
  getPasswordValidationError,
  MIN_PASSWORD_LENGTH,
  PASSWORD_REQUIREMENTS,
} from "@/lib/passwordPolicy";

interface ChangePasswordResponse {
  success: boolean;
  code?: string;
  error?: string;
  notificationSent?: boolean;
}

async function readFunctionError(error: unknown): Promise<string | null> {
  if (!error || typeof error !== "object" || !("context" in error)) return null;

  const context = error.context;
  if (!(context instanceof Response)) return null;

  try {
    const body = await context.clone().json() as ChangePasswordResponse;
    return body.error || null;
  } catch {
    return null;
  }
}

const SecuritySettings = () => {
  const { user, loading: authLoading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!currentPassword) {
      setFormError("Enter your current password.");
      return;
    }

    const passwordError = getPasswordValidationError(newPassword);
    if (passwordError) {
      setFormError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError("New password and confirmation do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke<ChangePasswordResponse>("change-password", {
        body: { currentPassword, newPassword },
      });

      if (error) {
        const serverMessage = await readFunctionError(error);
        throw new Error(serverMessage || "We could not change your password. Please try again.");
      }

      if (!data?.success) {
        throw new Error(data?.error || "We could not change your password. Please try again.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      void trackActivity("security:password_change_completed", {
        source: "settings_security",
        notification_sent: data.notificationSent === true,
      }, user?.id);

      if (data.notificationSent === false) {
        toast.warning("Password changed, but the confirmation email could not be sent.");
      } else {
        toast.success("Password changed. A confirmation email has been sent.");
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "We could not change your password. Please try again.";
      setFormError(message);
      void trackActivity("security:password_change_failed", { source: "settings_security" }, user?.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordInput = (
    id: string,
    label: string,
    value: string,
    setValue: (value: string) => void,
    visible: boolean,
    setVisible: (visible: boolean) => void,
    autoComplete: "current-password" | "new-password",
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete={autoComplete}
          minLength={autoComplete === "new-password" ? MIN_PASSWORD_LENGTH : undefined}
          required
          disabled={isSubmitting}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          disabled={isSubmitting}
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Helmet>
        <title>Security Settings - Creatives Takeover</title>
        <meta name="description" content="Change the password for your Creatives Takeover account." />
      </Helmet>
      <AccountWallpaper />
      <div className="relative z-10">
        <Navigation />
        <main className="container mx-auto px-6 pb-12 pt-header-offset">
          <div className="mx-auto max-w-2xl py-12">
            <div className="mb-8 space-y-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Security settings</h1>
              <p className="text-muted-foreground">Verify your current password before choosing a new one.</p>
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
                  <CardDescription>You must be signed in to change your password.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild><Link to="/login">Sign in</Link></Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Change password
                  </CardTitle>
                  <CardDescription>The confirmation will be sent to {user.email} after the password changes.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    {passwordInput("current-password", "Current password", currentPassword, setCurrentPassword, showCurrentPassword, setShowCurrentPassword, "current-password")}
                    {passwordInput("new-password", "New password", newPassword, setNewPassword, showNewPassword, setShowNewPassword, "new-password")}
                    {passwordInput("confirm-new-password", "Confirm new password", confirmPassword, setConfirmPassword, showConfirmPassword, setShowConfirmPassword, "new-password")}

                    <p className="text-sm text-muted-foreground">{PASSWORD_REQUIREMENTS}</p>
                    {formError && (
                      <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {formError}
                      </p>
                    )}

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                      <Button asChild type="button" variant="ghost">
                        <Link to="/account">Back to account</Link>
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                        {isSubmitting ? "Changing password..." : "Change password"}
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
    </div>
  );
};

export default SecuritySettings;
