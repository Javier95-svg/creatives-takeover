import { Navigate, useParams } from 'react-router-dom';

/**
 * Compatibility component for stale bundles and direct imports. The public
 * route is also redirected in App.tsx; keeping this component inert guarantees
 * that no legacy client can charge credits merely by opening a calendar.
 */
export default function MentorBookingPage() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/mentorship/mentors/${id}` : '/mentorship'} replace />;
}
