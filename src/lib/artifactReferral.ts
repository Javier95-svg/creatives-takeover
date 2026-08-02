import { captureEvent } from '@/lib/analytics';

export type PublicArtifactType = 'icp' | 'demo' | 'demo_launch';

export const buildArtifactReferralPath = (artifactType: PublicArtifactType) => {
  const campaign = artifactType === 'icp' ? 'shared-icp' : 'shared-demo';
  return `/?utm_source=public_artifact&utm_medium=referral&utm_campaign=${campaign}`;
};

export const trackArtifactReferralClicked = (
  artifactType: PublicArtifactType,
  placement: 'footer' | 'missing_state',
) => {
  captureEvent('artifact_referral_clicked', {
    artifact_type: artifactType,
    placement,
    source: 'public_artifact',
  });
};
