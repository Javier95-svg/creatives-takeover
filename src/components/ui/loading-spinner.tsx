import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const LoadingSpinner = ({ className, size = "md" }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-primary/20 border-t-primary",
          sizeClasses[size],
          className
        )}
      />
    </div>
  );
};

export default LoadingSpinner;