import { AlertCircle, Frown, Meh, Smile, TrendingUp } from "lucide-react";

interface EmotionalIndicatorProps {
  emotion: 'frustrated' | 'anxious' | 'uncertain' | 'hopeful' | 'confident';
  intensity?: 'low' | 'medium' | 'high';
}

export const EmotionalIndicator = ({ emotion, intensity = 'medium' }: EmotionalIndicatorProps) => {
  const getEmotionConfig = () => {
    switch (emotion) {
      case 'frustrated':
        return {
          icon: Frown,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          label: 'Frustrated'
        };
      case 'anxious':
        return {
          icon: AlertCircle,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/20',
          label: 'Anxious'
        };
      case 'uncertain':
        return {
          icon: Meh,
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/20',
          label: 'Uncertain'
        };
      case 'hopeful':
        return {
          icon: TrendingUp,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
          label: 'Hopeful'
        };
      case 'confident':
        return {
          icon: Smile,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20',
          label: 'Confident'
        };
      default:
        return {
          icon: Meh,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
          borderColor: 'border-muted/20',
          label: 'Neutral'
        };
    }
  };

  const config = getEmotionConfig();
  const Icon = config.icon;
  const size = intensity === 'high' ? 'w-4 h-4' : intensity === 'medium' ? 'w-3.5 h-3.5' : 'w-3 h-3';

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${config.bgColor} border ${config.borderColor}`}>
      <Icon className={`${size} ${config.color}`} />
      <span className={`text-caption font-medium ${config.color}`}>{config.label}</span>
    </div>
  );
};

