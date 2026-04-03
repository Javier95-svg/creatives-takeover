import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getActivationGateState, getActivationRoute, type ActivationIntent, type ActivationGateVariant } from '@/lib/retentionSystem';

interface ActivationGateState {
  loading: boolean;
  variant: ActivationGateVariant;
  activationIntent: ActivationIntent | null;
  firstArtifactType: string | null;
}

export function useActivationGate() {
  const { user } = useAuth();
  const [state, setState] = useState<ActivationGateState>({
    loading: Boolean(user),
    variant: 'control',
    activationIntent: null,
    firstArtifactType: null,
  });

  useEffect(() => {
    if (!user) {
      setState({
        loading: false,
        variant: 'control',
        activationIntent: null,
        firstArtifactType: null,
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
        });
      } catch (error) {
        console.error('Failed to resolve activation gate state', error);
        if (cancelled) return;
        setState({
          loading: false,
          variant: 'control',
          activationIntent: null,
          firstArtifactType: null,
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
    state.variant === 'forced_gate' &&
    !state.firstArtifactType;

  const redirectUrl = state.activationIntent
    ? getActivationRoute(state.activationIntent)
    : '/onboarding';

  return {
    ...state,
    shouldEnforceGate,
    redirectUrl,
  };
}
