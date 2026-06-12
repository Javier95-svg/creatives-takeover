interface StoryTimelineProps {
  stages: Array<{
    label: string;
    emotion: 'struggle' | 'uncertainty' | 'hope';
    progress: number;
  }>;
}

export const StoryTimeline = ({ stages }: StoryTimelineProps) => {
  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case 'struggle':
        return 'from-red-500/60 to-red-600/40';
      case 'uncertainty':
        return 'from-amber-500/60 to-amber-600/40';
      case 'hope':
        return 'from-green-500/60 to-green-600/40';
      default:
        return 'from-primary/60 to-primary/40';
    }
  };

  return (
    <div className="relative py-3">
      <div className="flex items-center justify-between mb-2">
        {stages.map((stage, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${getEmotionColor(stage.emotion)} mb-1 transition-all duration-500`} />
            <span className="text-caption text-muted-foreground text-center max-w-[60px] leading-tight">
              {stage.label}
            </span>
          </div>
        ))}
      </div>
      <div className="relative h-1 bg-muted rounded-full overflow-hidden">
        {stages.map((stage, index) => {
          const previousProgress = stages.slice(0, index).reduce((sum, s) => sum + s.progress, 0);
          return (
            <div
              key={index}
              className={`absolute left-0 top-0 h-full bg-gradient-to-r ${getEmotionColor(stage.emotion)} transition-all duration-1000 ease-out`}
              style={{
                width: `${stage.progress}%`,
                left: `${previousProgress}%`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

