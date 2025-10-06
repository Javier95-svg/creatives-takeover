import { PersonalizedDashboard } from '@/components/dashboard/PersonalizedDashboard';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <PersonalizedDashboard />;
};

export default Dashboard;
