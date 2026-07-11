export function isActivationV2Enabled(posthogFlag?: boolean) {
  const killSwitch = import.meta.env.VITE_ONBOARDING_ACTIVATION_V2;
  if (killSwitch === 'false') return false;
  if (typeof posthogFlag === 'boolean') return posthogFlag;
  return import.meta.env.DEV || killSwitch === 'true';
}
