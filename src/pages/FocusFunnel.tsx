import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

import { ProgressiveFocusFunnel } from '@/components/focus-funnel/ProgressiveFocusFunnel';
import { useLeanStartupStore } from '@/store/leanStartupStore';

const FocusFunnel = () => {
  const { markToolUsed } = useLeanStartupStore();

  useEffect(() => {
    markToolUsed('focus-funnel');
  }, [markToolUsed]);

  return (
    <>
      <Helmet>
        <title>Focus Funnel — Creatives Takeover</title>
      </Helmet>
      <ProgressiveFocusFunnel />
    </>
  );
};

export default FocusFunnel;
