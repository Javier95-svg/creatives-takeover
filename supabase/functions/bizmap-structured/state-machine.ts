// Deterministic state machine for component collection flow
// NO LLM - pure logic-based state management

import type {
  ComponentType,
  BizMapComponent,
  BizMapSession,
  SessionStatus
} from './types.ts';

const COMPONENT_ORDER: ComponentType[] = [
  'problem',
  'target_user',
  'value_prop',
  'revenue',
  'distribution',
  'costs',
  'risks',
  'assumptions'
];

export interface StateMachineResult {
  nextComponent: ComponentType | null;
  status: SessionStatus;
  completionPercentage: number;
  shouldValidate: boolean;
}

export function getNextState(
  collectedComponents: Partial<Record<ComponentType, BizMapComponent>>,
  currentComponent: ComponentType | null
): StateMachineResult {
  const collectedTypes = Object.keys(collectedComponents) as ComponentType[];
  const collectedCount = collectedTypes.length;

  // Calculate completion percentage
  const completionPercentage = Math.round((collectedCount / COMPONENT_ORDER.length) * 100);

  // Determine if we should validate
  const shouldValidate = collectedCount > 0 && 
    (collectedCount === COMPONENT_ORDER.length || 
     collectedCount % 2 === 0); // Validate every 2 components

  // If all components collected, we're complete
  if (collectedCount === COMPONENT_ORDER.length) {
    return {
      nextComponent: null,
      status: 'complete',
      completionPercentage: 100,
      shouldValidate: true
    };
  }

  // If no components collected yet, start with first
  if (collectedCount === 0) {
    return {
      nextComponent: COMPONENT_ORDER[0],
      status: 'completing',
      completionPercentage: 0,
      shouldValidate: false
    };
  }

  // Find next component to collect
  // Always collect in order, but skip if already collected
  let nextIndex = 0;
  
  if (currentComponent) {
    const currentIndex = COMPONENT_ORDER.indexOf(currentComponent);
    if (currentIndex >= 0) {
      // If current component was just collected, move to next
      if (collectedTypes.includes(currentComponent)) {
        nextIndex = currentIndex + 1;
      } else {
        // Still collecting current component
        return {
          nextComponent: currentComponent,
          status: 'completing',
          completionPercentage,
          shouldValidate
        };
      }
    }
  } else {
    // No current component, find first missing one
    nextIndex = COMPONENT_ORDER.findIndex(comp => !collectedTypes.includes(comp));
    if (nextIndex === -1) {
      // All collected but status not updated
      return {
        nextComponent: null,
        status: 'complete',
        completionPercentage: 100,
        shouldValidate: true
      };
    }
  }

  // Find next uncollected component
  while (nextIndex < COMPONENT_ORDER.length) {
    const nextComponent = COMPONENT_ORDER[nextIndex];
    if (!collectedTypes.includes(nextComponent)) {
      return {
        nextComponent,
        status: 'completing',
        completionPercentage,
        shouldValidate
      };
    }
    nextIndex++;
  }

  // Shouldn't reach here, but handle edge case
  return {
    nextComponent: null,
    status: 'complete',
    completionPercentage: 100,
    shouldValidate: true
  };
}

export function getCollectionProgress(
  collectedComponents: Partial<Record<ComponentType, BizMapComponent>>
): {
  collected: ComponentType[];
  remaining: ComponentType[];
  current: ComponentType | null;
} {
  const collected = Object.keys(collectedComponents) as ComponentType[];
  const remaining = COMPONENT_ORDER.filter(comp => !collected.includes(comp));
  
  const state = getNextState(collectedComponents, null);
  
  return {
    collected,
    remaining,
    current: state.nextComponent
  };
}

export function isValidComponentOrder(
  componentType: ComponentType,
  collectedComponents: Partial<Record<ComponentType, BizMapComponent>>
): boolean {
  const collectedTypes = Object.keys(collectedComponents) as ComponentType[];
  const componentIndex = COMPONENT_ORDER.indexOf(componentType);
  
  if (componentIndex === -1) {
    return false; // Invalid component type
  }

  // Can only collect components in order
  // Allow skipping if previous components are collected
  for (let i = 0; i < componentIndex; i++) {
    if (!collectedTypes.includes(COMPONENT_ORDER[i])) {
      return false; // Missing prerequisite component
    }
  }

  return true;
}

export function getComponentDependencies(componentType: ComponentType): ComponentType[] {
  const componentIndex = COMPONENT_ORDER.indexOf(componentType);
  
  if (componentIndex === -1) {
    return [];
  }

  // Return all components that should be collected before this one
  return COMPONENT_ORDER.slice(0, componentIndex);
}

