import { useFeatureFlagEnabled } from 'posthog-js/react';
import { useParams } from 'react-router-dom';
import CreateCoFounderPost from '@/pages/community/CreateCoFounderPost';
import EditCoFounderPost from '@/pages/community/EditCoFounderPost';
import CofounderListingEditorPage from '@/pages/community/CofounderListingEditorPage';
import { COFOUNDER_MARKETPLACE_FLAGS, isCofounderMarketplaceEnvironmentEnabled } from '@/lib/cofounderMarketplaceFlags';

export default function CofounderListingEditorRoute() {
  const { postId } = useParams();
  const release2 = useFeatureFlagEnabled(COFOUNDER_MARKETPLACE_FLAGS.matching);
  if (!isCofounderMarketplaceEnvironmentEnabled() || !release2) return postId ? <EditCoFounderPost /> : <CreateCoFounderPost />;
  return <CofounderListingEditorPage />;
}
