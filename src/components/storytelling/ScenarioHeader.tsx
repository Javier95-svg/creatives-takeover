interface ScenarioHeaderProps {
  hook: string;
  quote?: boolean;
}

export const ScenarioHeader = ({ hook, quote = true }: ScenarioHeaderProps) => {
  if (quote) {
    return (
      <div className="mb-4">
        <div className="relative pl-4 border-l-2 border-primary/30">
          <p className="text-base sm:text-lg font-semibold text-foreground leading-relaxed italic">
            "{hook}"
          </p>
          <div className="absolute -left-1 top-0 text-primary text-2xl opacity-50">"</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <p className="text-base sm:text-lg font-semibold text-foreground leading-relaxed">
        {hook}
      </p>
    </div>
  );
};

