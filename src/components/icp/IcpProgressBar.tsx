interface IcpProgressBarProps {
  progress: number;
  pulse?: boolean;
  className?: string;
  shellOffset?: boolean;
}

export function IcpProgressBar({ progress, pulse = false, className = "", shellOffset = false }: IcpProgressBarProps) {
  return (
    <div className={`fixed inset-x-0 z-40 h-[3px] bg-[#E5E7EB] ${shellOffset ? "top-[88px] md:top-[94px]" : "top-0"} ${className}`}>
      <div
        className={`h-full bg-[#32b8c6] transition-[width] duration-300 ease-out ${pulse ? "animate-pulse" : ""}`}
        style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
      />
    </div>
  );
}
