import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="relative flex items-center justify-center gap-1.5 w-auto px-2"
          aria-label={isDark ? "Currently in dark mode - Switch to light mode" : "Currently in light mode - Switch to dark mode"}
        >
          {/* Sun icon on the left - active in light mode */}
          <Sun className={`h-4 w-4 transition-all duration-300 ${
            !isDark 
              ? 'opacity-100 scale-110 text-yellow-500 dark:text-yellow-400' 
              : 'opacity-30 scale-100 text-muted-foreground'
          }`} />
          
          {/* Moon icon on the right - active in dark mode */}
          <Moon className={`h-4 w-4 transition-all duration-300 ${
            isDark 
              ? 'opacity-100 scale-110 text-blue-400' 
              : 'opacity-30 scale-100 text-muted-foreground'
          }`} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isDark ? "Dark mode active - Click to switch to light mode" : "Light mode active - Click to switch to dark mode"}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default ThemeToggle;
