import { LucideIcon } from "lucide-react";

interface CharacterIntroProps {
  name: string;
  context: string;
  emotion: string;
  icon: LucideIcon;
}

export const CharacterIntro = ({ name, context, emotion, icon: Icon }: CharacterIntroProps) => {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-foreground">{name}</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground italic">{emotion}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{context}</p>
      </div>
    </div>
  );
};

