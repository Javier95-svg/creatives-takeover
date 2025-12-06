import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
  variant?: "default" | "destructive" | "warning";
  showIcon?: boolean;
}

/**
 * Reusable error message component with consistent styling
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = "Error",
  message,
  onDismiss,
  className,
  variant = "destructive",
  showIcon = true,
}) => {
  return (
    <Alert
      variant={variant}
      className={cn("relative", className)}
      role="alert"
      aria-live="assertive"
    >
      {showIcon && (
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
      )}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6"
          onClick={onDismiss}
          aria-label="Dismiss error message"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </Alert>
  );
};

