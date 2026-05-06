import { Helmet } from 'react-helmet-async';

import { ReferralSubtab } from '@/components/dashboard/ReferralSubtab';

const ReferralDashboardPage = () => {
  return (
    <>
      <Helmet>
        <title>Referral Program — Creatives Takeover</title>
      </Helmet>
      <div className="mx-auto max-w-5xl">
        <ReferralSubtab />
      </div>
    </>
  );
};

export default ReferralDashboardPage;
