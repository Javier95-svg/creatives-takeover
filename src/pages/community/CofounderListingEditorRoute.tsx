import { useParams } from 'react-router-dom';
import CreateCoFounderPost from '@/pages/community/CreateCoFounderPost';
import EditCoFounderPost from '@/pages/community/EditCoFounderPost';

export default function CofounderListingEditorRoute() {
  const { postId } = useParams();
  return postId ? <EditCoFounderPost /> : <CreateCoFounderPost />;
}
