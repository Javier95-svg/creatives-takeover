import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { JourneySlug, DayStatus, DayProgress, JourneyProgress } from '@/types/journey';

interface JourneyStoreState {
  journeys: Record<JourneySlug, JourneyProgress | null>;
  activeJourney: JourneySlug | null;
}

interface JourneyStore extends JourneyStoreState {
  startJourney: (slug: JourneySlug) => void;
  toggleTask: (slug: JourneySlug, dayNumber: number, taskId: string) => void;
  setActiveJourney: (slug: JourneySlug | null) => void;
  resetJourney: (slug: JourneySlug) => void;
  getDayStatus: (slug: JourneySlug, dayNumber: number, totalTasks: number) => DayStatus;
  getJourneyCompletionPercent: (slug: JourneySlug, totalDays: number, tasksPerDay: Record<number, number>) => number;
}

export const useJourneyStore = create<JourneyStore>()(
  persist(
    (set, get) => ({
      journeys: { validate: null, mvp: null, 'first-customers': null },
      activeJourney: null,

      startJourney: (slug) => {
        const existing = get().journeys[slug];
        if (existing) return; // already started

        const progress: JourneyProgress = {
          journeySlug: slug,
          startedAt: new Date().toISOString(),
          currentDay: 1,
          days: {
            1: {
              dayNumber: 1,
              status: 'in-progress',
              startedAt: new Date().toISOString(),
              tasks: {},
            },
          },
        };

        set((state) => ({
          journeys: { ...state.journeys, [slug]: progress },
          activeJourney: slug,
        }));
      },

      toggleTask: (slug, dayNumber, taskId) => {
        set((state) => {
          const journey = state.journeys[slug];
          if (!journey) return state;

          const day = journey.days[dayNumber] || {
            dayNumber,
            status: 'in-progress' as DayStatus,
            startedAt: new Date().toISOString(),
            tasks: {},
          };

          const task = day.tasks[taskId];
          const nowCompleted = !task?.completed;

          const updatedTasks = {
            ...day.tasks,
            [taskId]: {
              taskId,
              completed: nowCompleted,
              completedAt: nowCompleted ? new Date().toISOString() : undefined,
            },
          };

          const updatedDay: DayProgress = {
            ...day,
            tasks: updatedTasks,
          };

          const updatedDays = { ...journey.days, [dayNumber]: updatedDay };

          return {
            journeys: {
              ...state.journeys,
              [slug]: { ...journey, days: updatedDays },
            },
          };
        });
      },

      setActiveJourney: (slug) => set({ activeJourney: slug }),

      resetJourney: (slug) => {
        set((state) => ({
          journeys: { ...state.journeys, [slug]: null },
          activeJourney: state.activeJourney === slug ? null : state.activeJourney,
        }));
      },

      getDayStatus: (slug, dayNumber, totalTasks) => {
        const journey = get().journeys[slug];
        if (!journey) return 'locked';
        if (dayNumber === 1 && journey) return journey.days[1]?.status || 'in-progress';

        // Check if previous day is complete
        const prevDay = journey.days[dayNumber - 1];
        if (!prevDay) return 'locked';

        const prevTaskCount = Object.values(prevDay.tasks).filter((t) => t.completed).length;
        const prevDayComplete = prevTaskCount > 0 && prevTaskCount >= totalTasks;

        if (!prevDayComplete) return 'locked';

        const currentDay = journey.days[dayNumber];
        if (!currentDay) return 'available';

        const completedCount = Object.values(currentDay.tasks).filter((t) => t.completed).length;
        if (completedCount >= totalTasks && totalTasks > 0) return 'completed';

        return completedCount > 0 ? 'in-progress' : 'available';
      },

      getJourneyCompletionPercent: (slug, totalDays, tasksPerDay) => {
        const journey = get().journeys[slug];
        if (!journey) return 0;

        let totalTasks = 0;
        let completedTasks = 0;

        for (let d = 1; d <= totalDays; d++) {
          const dayTaskCount = tasksPerDay[d] || 0;
          totalTasks += dayTaskCount;

          const day = journey.days[d];
          if (day) {
            completedTasks += Object.values(day.tasks).filter((t) => t.completed).length;
          }
        }

        return totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
      },
    }),
    {
      name: 'creatives-journey-progress',
      partialize: (state) => ({
        journeys: state.journeys,
        activeJourney: state.activeJourney,
      }),
    }
  )
);
