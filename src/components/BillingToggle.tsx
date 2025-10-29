import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface BillingToggleProps {
  onToggle: (isAnnual: boolean) => void;
}

const BillingToggle = ({ onToggle }: BillingToggleProps) => {
  const [isAnnual, setIsAnnual] = useState(false);

  const handleToggle = () => {
    const newValue = !isAnnual;
    setIsAnnual(newValue);
    onToggle(newValue);
  };

  return (
    <div className="flex items-center justify-center gap-4 mb-8 animate-fade-in">
      <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
        Monthly
      </span>
      
      <button
        onClick={handleToggle}
        className="relative w-16 h-8 rounded-full bg-muted hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        role="switch"
        aria-checked={isAnnual}
      >
        <span
          className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-primary transition-transform duration-300 ease-in-out ${
            isAnnual ? 'translate-x-8' : 'translate-x-0'
          }`}
        />
      </button>
      
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
          Annual
        </span>
        <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
          Save 20%
        </Badge>
      </div>
    </div>
  );
};

export default BillingToggle;
