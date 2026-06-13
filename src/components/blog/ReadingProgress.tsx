import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadingProgressProps {
  readTime: number; // in minutes
  onComplete?: () => void;
}

const ReadingProgress = ({ readTime, onComplete }: ReadingProgressProps) => {
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(readTime);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrolled = window.scrollY;
      const scrollProgress = (scrolled / documentHeight) * 100;
      
      setProgress(Math.min(scrollProgress, 100));

      // Calculate time remaining based on scroll progress
      const remaining = readTime - (readTime * scrollProgress / 100);
      setTimeRemaining(Math.max(Math.ceil(remaining), 0));

      // Check if completed
      if (scrollProgress >= 95 && !isComplete) {
        setIsComplete(true);
        onComplete?.();
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial calculation

    return () => window.removeEventListener("scroll", handleScroll);
  }, [readTime, isComplete, onComplete]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3 gap-4">
          {/* Progress Bar */}
          <div className="flex-1">
            <Progress 
              value={progress} 
              className="h-2"
            />
          </div>

          {/* Time Remaining / Complete Badge */}
          <div className={cn(
            "flex items-center gap-2 text-sm font-medium transition-all duration-300",
            isComplete ? "text-success" : "text-muted-foreground"
          )}>
            {isComplete ? (
              <>
                <CheckCircle className="w-4 h-4 animate-scale-in" />
                <span className="hidden sm:inline">Complete</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">{timeRemaining} min left</span>
                <span className="sm:hidden">{timeRemaining}m</span>
              </>
            )}
          </div>

          {/* Progress Percentage */}
          <div className="text-sm font-semibold text-primary min-w-[3rem] text-right">
            {Math.round(progress)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingProgress;
