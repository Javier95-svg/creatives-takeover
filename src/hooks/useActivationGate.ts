import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getActivationGateState, getActivationRoute, type ActivationIntent, type ActivationGateVariant } from '@/lib/retentionSystem';
import { shouldEnforceActivationGate } from '@/lib/guidedOnboarding';

interface ActivationGateState {
  loading: boolean;
  variant: ActivationGateVariant;
  activationIntent: ActivationIntent | null;
  firstArtifactType: string | null;
  requiresGuidedOnboarding: boolean;
}

export function useActivationGate() {
  const { user } = useAuth();
  const [state, setState] = useState<ActivationGateState>({
    loading: Boolean(user),
    variant: 'control',
    activationIntent: null,
    firstArtifactType: null,
    requiresGuidedOnboarding: false,
  });

  useEffect(() => {
    if (!user) {
      setState({
        loading: false,
        variant: 'control',
        activationIntent: null,
        firstArtifactType: null,
        requiresGuidedOnboarding: false,
      });
      return;
    }

    let cancelled = false;

    const loadState = async () => {
      try {
        const nextState = await getActivationGateState(user.id);
        if (cancelled) return;
        setState({
          loading: false,
          variant: nextState.activationGateVariant,
          activationIntent: nextState.activationIntent,
          firstArtifactType: nextState.firstArtifactType,
          requiresGuidedOnboarding: nextState.requiresGuidedOnboarding,
        });
      } catch (error) {
        console.error('Failed to resolve activation gate state', error);
        if (cancelled) return;
        setState({
          loading: false,
          variant: 'control',
          activationIntent: null,
          firstArtifactType: null,
          requiresGuidedOnboarding: false,
        });
      }
    };

    void loadState();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const shouldEnforceGate =
    !!user &&
    !state.loading &&
    shouldEnforceActivationGate({
      requiresGuidedOnboarding: state.requiresGuidedOnboarding,
      activationGateVariant: state.variant,
      firstArtifactType: state.firstArtifactType,
    });

  const redirectUrl = state.activationIntent
    ? getActivationRoute(state.activationIntent)
    : '/onboarding';

  return {
    ...state,
    shouldEnforceGate,
    redirectUrl,
  };
}
