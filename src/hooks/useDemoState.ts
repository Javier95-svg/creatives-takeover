import { useState, useCallback } from 'react';
import { DemoScenario, getDemoScenario, getRandomScenario } from '@/utils/demoDataSeeder';

interface DemoState {
  currentService: 'overview' | 'bizmap' | 'prompts' | 'insighta' | 'community';
  servicesExplored: string[];
  currentScenario: DemoScenario | null;
  isInDemoMode: boolean;
  demoStartTime: Date | null;
  interactionCount: number;
}

export const useDemoState = () => {
  const [demoState, setDemoState] = useState<DemoState>({
    currentService: 'overview',
    servicesExplored: [],
    currentScenario: null,
    isInDemoMode: false,
    demoStartTime: null,
    interactionCount: 0
  });

  const startDemo = useCallback((service: 'bizmap' | 'prompts' | 'insighta' | 'community' = 'bizmap', scenarioId?: string) => {
    const scenario = scenarioId 
      ? getDemoScenario(scenarioId) || getRandomScenario()
      : getRandomScenario();
    
    setDemoState({
      currentService: service,
      servicesExplored: [service],
      currentScenario: scenario,
      isInDemoMode: true,
      demoStartTime: new Date(),
      interactionCount: 0
    });
  }, []);

  const resetDemo = useCallback(() => {
    setDemoState({
      currentService: 'overview',
      servicesExplored: [],
      currentScenario: null,
      isInDemoMode: false,
      demoStartTime: null,
      interactionCount: 0
    });
  }, []);

  const switchScenario = useCallback((scenarioId: string) => {
    const scenario = getDemoScenario(scenarioId);
    if (scenario) {
      setDemoState(prev => ({
        ...prev,
        currentScenario: scenario,
        servicesExplored: ['bizmap']
      }));
    }
  }, []);

  const navigateToService = useCallback((service: 'overview' | 'bizmap' | 'prompts' | 'insighta' | 'community') => {
    setDemoState(prev => ({
      ...prev,
      currentService: service,
      servicesExplored: [...new Set([...prev.servicesExplored, service])],
      interactionCount: prev.interactionCount + 1
    }));
  }, []);

  const getDemoMetrics = useCallback(() => {
    const timeSpent = demoState.demoStartTime 
      ? Math.floor((new Date().getTime() - demoState.demoStartTime.getTime()) / 1000)
      : 0;
    
    return {
      timeSpent,
      servicesExplored: demoState.servicesExplored.length,
      currentScenario: demoState.currentScenario?.name,
      completionRate: (demoState.servicesExplored.length / 4) * 100, // 4 main services
      interactionCount: demoState.interactionCount
    };
  }, [demoState]);

  return {
    ...demoState,
    startDemo,
    resetDemo,
    switchScenario,
    navigateToService,
    getDemoMetrics
  };
};
