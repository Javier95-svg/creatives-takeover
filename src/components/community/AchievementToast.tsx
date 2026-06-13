import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Star, Award, Zap } from "lucide-react";

interface AchievementToastProps {
  type: 'badge' | 'level_up' | 'milestone';
  title: string;
  description: string;
  icon?: string;
}

export const showAchievementToast = (props: AchievementToastProps) => {
  const getIcon = () => {
    if (props.icon) return <span className="text-2xl">{props.icon}</span>;
    
    switch (props.type) {
      case 'badge':
        return <Award className="w-6 h-6 text-warning" />;
      case 'level_up':
        return <Star className="w-6 h-6 text-purple-500" />;
      case 'milestone':
        return <Zap className="w-6 h-6 text-info" />;
      default:
        return <Trophy className="w-6 h-6 text-primary" />;
    }
  };

  return {
    title: (
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className="font-bold">{props.title}</span>
      </div>
    ),
    description: props.description,
    duration: 5000,
  };
};

// Confetti animation component for special achievements
export const AchievementConfetti = () => {
  useEffect(() => {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 3000);
      }, i * 30);
    }
  }, []);

  return null;
};

// Add to your global CSS (index.css):
/*
.confetti-piece {
  position: fixed;
  width: 10px;
  height: 10px;
  top: -10px;
  z-index: 9999;
  animation: confetti-fall 3s ease-in forwards;
}

@keyframes confetti-fall {
  to {
    transform: translateY(100vh) rotate(360deg);
    opacity: 0;
  }
}
*/
