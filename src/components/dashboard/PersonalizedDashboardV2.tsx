import { ReactNode } from 'react';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useActiveSection } from '@/hooks/useActiveSection';
import { useDashboardDailyPrompt } from '@/hooks/useDashboardDailyPrompt';
import { useDashboardInitialization } from '@/hooks/useDashboardInitialization';
import { DailyFounderFeed } from './DailyFounderFeed';
import { DailyGoalModal } from './DailyGoalModal';

interface DashboardContentWrapperProps {
  sectionIds: string[];
  children: ReactNode;
}

const DashboardContentWrapper = ({ sectionIds, children }: DashboardContentWrapperProps) => {
  useActiveSection(sectionIds);

  return <>{children}</>;
};

export const PersonalizedDashboardV2 = () => {
  useDashboardInitialization();

  const {
    showDailyGoal,
    modalMode,
    todaysCheckInId,
    currentStreak,
    hasUnresolvedPrompt,
    unresolvedMode,
    handleDailyGoalOpenChange,
    handlePromptResume,
    handleCheckInComplete,
  } = useDashboardDailyPrompt();

  return (
    <ErrorBoundary>
      <DashboardContentWrapper sectionIds={['daily-feed']}>
        <DailyFounderFeed
          hasUnresolvedPrompt={hasUnresolvedPrompt}
          unresolvedMode={unresolvedMode === 'evening' ? 'end' : 'start'}
          onPromptResume={handlePromptResume}
        />

        <DailyGoalModal
          open={showDailyGoal}
          onOpenChange={handleDailyGoalOpenChange}
          currentStreak={currentStreak}
          mode={modalMode}
          todaysCheckInId={todaysCheckInId}
          onCheckInComplete={handleCheckInComplete}
        />
      </DashboardContentWrapper>
    </ErrorBoundary>
  );
};

