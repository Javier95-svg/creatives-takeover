import { useState, useCallback } from 'react';
import { DemoScenario, getDemoScenario, getRandomScenario } from '@/utils/demoDataSeeder';

interface DemoState {
  currentScenario: DemoScenario | null;
  isInDemoMode: boolean;
  currentFeature: string;
  demoStartTime: Date | null;
  featuresExplored: string[];
}

export const useDemoState = () => {
  const [demoState, setDemoState] = useState<DemoState>({
    currentScenario: null,
    isInDemoMode: false,
    currentFeature: 'overview',
    demoStartTime: null,
    featuresExplored: []
  });

  const startDemo = useCallback((scenarioId?: string) => {
    const scenario = scenarioId 
      ? getDemoScenario(scenarioId) || getRandomScenario()
      : getRandomScenario();
    
    setDemoState({
      currentScenario: scenario,
      isInDemoMode: true,
      currentFeature: 'overview',
      demoStartTime: new Date(),
      featuresExplored: ['overview']
    });
  }, []);

  const resetDemo = useCallback(() => {
    setDemoState({
      currentScenario: null,
      isInDemoMode: false,
      currentFeature: 'overview',
      demoStartTime: null,
      featuresExplored: []
    });
  }, []);

  const switchScenario = useCallback((scenarioId: string) => {
    const scenario = getDemoScenario(scenarioId);
    if (scenario) {
      setDemoState(prev => ({
        ...prev,
        currentScenario: scenario,
        featuresExplored: ['overview']
      }));
    }
  }, []);

  const navigateToFeature = useCallback((feature: string) => {
    setDemoState(prev => ({
      ...prev,
      currentFeature: feature,
      featuresExplored: [...new Set([...prev.featuresExplored, feature])]
    }));
  }, []);

  const getDemoMetrics = useCallback(() => {
    const timeSpent = demoState.demoStartTime 
      ? Math.floor((new Date().getTime() - demoState.demoStartTime.getTime()) / 1000)
      : 0;
    
    return {
      timeSpent,
      featuresExplored: demoState.featuresExplored.length,
      currentScenario: demoState.currentScenario?.name,
      completionRate: (demoState.featuresExplored.length / 7) * 100 // 7 total features
    };
  }, [demoState]);

  return {
    ...demoState,
    startDemo,
    resetDemo,
    switchScenario,
    navigateToFeature,
    getDemoMetrics
  };
};
