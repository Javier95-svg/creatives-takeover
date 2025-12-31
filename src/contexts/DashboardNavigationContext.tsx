import { createContext, useContext, useState, ReactNode } from 'react';

interface DashboardNavigationContextType {
  activeSection: string | null;
  setActiveSection: (section: string | null) => void;
}

const DashboardNavigationContext = createContext<DashboardNavigationContextType | undefined>(
  undefined
);

export const DashboardNavigationProvider = ({ children }: { children: ReactNode }) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <DashboardNavigationContext.Provider value={{ activeSection, setActiveSection }}>
      {children}
    </DashboardNavigationContext.Provider>
  );
};

export const useDashboardNavigation = () => {
  const context = useContext(DashboardNavigationContext);
  if (context === undefined) {
    throw new Error('useDashboardNavigation must be used within a DashboardNavigationProvider');
  }
  return context;
};
