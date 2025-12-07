import { CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

interface JourneyMapProps {
  milestones: Array<{
    label: string;
    status: 'problem' | 'struggle' | 'solution';
    description?: string;
  }>;
}

export const JourneyMap = ({ milestones }: JourneyMapProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'problem':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          lineColor: 'bg-red-500/30'
        };
      case 'struggle':
        return {
          icon: AlertCircle,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/30',
          lineColor: 'bg-orange-500/30'
        };
      case 'solution':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          lineColor: 'bg-green-500/30'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
          borderColor: 'border-muted/30',
          lineColor: 'bg-muted/30'
        };
    }
  };

  return (
    <div className="relative py-4">
      {/* Background connector line - gradient from problem to solution */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-green-500/20 z-0" />
      
      <div className="flex items-start justify-between relative z-10">
        {milestones.map((milestone, index) => {
          const config = getStatusConfig(milestone.status);
          const Icon = config.icon;

          return (
            <div key={index} className="flex-1 flex flex-col items-center relative">
              {/* Milestone Icon */}
              <div className={`relative z-10 p-2.5 rounded-full ${config.bgColor} border-2 ${config.borderColor} mb-2 transition-all duration-300 hover:scale-110 shadow-sm backdrop-blur-sm`}>
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>
              
              {/* Milestone Label */}
              <div className="text-center max-w-[80px]">
                <p className="text-[10px] font-semibold text-foreground mb-1 leading-tight">
                  {milestone.label}
                </p>
                {milestone.description && (
                  <p className="text-[9px] text-muted-foreground leading-tight">
                    {milestone.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

