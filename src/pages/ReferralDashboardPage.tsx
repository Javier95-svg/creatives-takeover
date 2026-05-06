import { Helmet } from 'react-helmet-async';
import { Navigate } from 'react-router-dom';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ReferralSubtab } from '@/components/dashboard/ReferralSubtab';
import { useAuth } from '@/contexts/AuthContext';

const ReferralDashboardPage = () => {
  const { user, loading } = useAuth();

  if (!loading && !user) {
    return <Navigate to="/signup" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Referral Program — Creatives Takeover</title>
      </Helmet>
      <DashboardLayout
        title="Referral Program"
        subtitle="Your referral link, invite progress, and reward status in one place."
        maxWidthClassName="max-w-5xl"
      >
        <ReferralSubtab />
      </DashboardLayout>
    </>
  );
};

export default ReferralDashboardPage;
