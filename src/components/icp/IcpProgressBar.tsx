interface IcpProgressBarProps {
  progress: number;
  pulse?: boolean;
  className?: string;
}

export function IcpProgressBar({ progress, pulse = false, className = "" }: IcpProgressBarProps) {
  return (
    <div className={`fixed inset-x-0 top-0 z-50 h-[3px] bg-[#E5E7EB] ${className}`}>
      <div
        className={`h-full bg-[#32b8c6] transition-[width] duration-300 ease-out ${pulse ? "animate-pulse" : ""}`}
        style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
      />
    </div>
  );
}
