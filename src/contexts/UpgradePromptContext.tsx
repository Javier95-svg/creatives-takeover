import { createContext, useCallback, useContext, useState } from "react";
import UpgradePromptDialog, {
  UpgradePromptDialogProps,
} from "@/components/UpgradePromptDialog";

type UpgradePromptOptions = Omit<UpgradePromptDialogProps, "open" | "onOpenChange">;

interface UpgradePromptContextValue {
  openUpgradePrompt: (options: UpgradePromptOptions) => void;
  closeUpgradePrompt: () => void;
}

const UpgradePromptContext = createContext<UpgradePromptContextValue | undefined>(
  undefined
);

export const UpgradePromptProvider = ({ children }: { children: React.ReactNode }) => {
  const [prompt, setPrompt] = useState<UpgradePromptOptions | null>(null);

  const openUpgradePrompt = useCallback((options: UpgradePromptOptions) => {
    setPrompt(options);
  }, []);

  const closeUpgradePrompt = useCallback(() => {
    setPrompt(null);
  }, []);

  return (
    <UpgradePromptContext.Provider value={{ openUpgradePrompt, closeUpgradePrompt }}>
      {children}
      <UpgradePromptDialog
        open={Boolean(prompt)}
        onOpenChange={(open) => {
          if (!open) {
            setPrompt(null);
          }
        }}
        {...(prompt || {})}
      />
    </UpgradePromptContext.Provider>
  );
};

export const useUpgradePrompt = () => {
  const context = useContext(UpgradePromptContext);
  if (!context) {
    throw new Error("useUpgradePrompt must be used within UpgradePromptProvider");
  }
  return context;
};
