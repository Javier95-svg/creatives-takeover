import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

interface PointsAnimationProps {
  points: number;
  onComplete?: () => void;
}

const PointsAnimation = ({ points, onComplete }: PointsAnimationProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none animate-fade-in">
      <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg animate-[bounce_1s_ease-in-out] flex items-center gap-2">
        <Plus className="w-5 h-5" />
        <span className="text-2xl font-bold">{points}</span>
        <span className="text-lg">points!</span>
      </div>
    </div>
  );
};

export default PointsAnimation;
