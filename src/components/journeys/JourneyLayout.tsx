import { useState, useMemo } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SEO, { createBreadcrumbSchema } from '@/components/SEO';
import type { JourneyDefinition, DayStatus } from '@/types/journey';
import { useJourneyStore } from '@/store/journeyStore';
import { useShallow } from 'zustand/react/shallow';
import { journeyRoutes } from '@/data/journeys';
import JourneyHero from './JourneyHero';
import JourneyTimeline from './JourneyTimeline';
import DayCard from './DayCard';
import JourneyCompletionCard from './JourneyCompletionCard';

interface JourneyLayoutProps {
  journey: JourneyDefinition;
}

export default function JourneyLayout({ journey }: JourneyLayoutProps) {
  const { journeys, startJourney, toggleTask, resetJourney } = useJourneyStore(
    useShallow(s => ({ journeys: s.journeys, startJourney: s.startJourney, toggleTask: s.toggleTask, resetJourney: s.resetJourney }))
  );
  const progress = journeys[journey.slug];
  const started = !!progress;

  // Build tasksPerDay map for completion calculation
  const tasksPerDay = useMemo(() => {
    const map: Record<number, number> = {};
    journey.days.forEach((d) => {
      map[d.dayNumber] = d.tasks.length;
    });
    return map;
  }, [journey.days]);

  const completionPercent = useJourneyStore((s) =>
    s.getJourneyCompletionPercent(journey.slug, journey.totalDays, tasksPerDay)
  );

  const currentDay = progress?.currentDay ?? 1;

  // Track which day the user is viewing
  const [selectedDay, setSelectedDay] = useState(currentDay);

  const getDayStatus = (dayNumber: number): DayStatus => {
    if (!started) return dayNumber === 1 ? 'available' : 'locked';

    // Day 1 always at least in-progress when started
    if (dayNumber === 1) {
      const day1 = progress?.days[1];
      if (!day1) return 'in-progress';
      const completed = Object.values(day1.tasks).filter((t) => t.completed).length;
      if (completed >= (tasksPerDay[1] || 0) && (tasksPerDay[1] || 0) > 0) return 'completed';
      return completed > 0 ? 'in-progress' : 'in-progress';
    }

    // Check if previous day is fully complete
    const prevDay = progress?.days[dayNumber - 1];
    if (!prevDay) return 'locked';
    const prevCompleted = Object.values(prevDay.tasks).filter((t) => t.completed).length;
    const prevTotal = tasksPerDay[dayNumber - 1] || 0;
    if (prevCompleted < prevTotal || prevTotal === 0) return 'locked';

    // Previous day is complete, check this day
    const thisDay = progress?.days[dayNumber];
    if (!thisDay) return 'available';
    const thisCompleted = Object.values(thisDay.tasks).filter((t) => t.completed).length;
    const thisTotal = tasksPerDay[dayNumber] || 0;
    if (thisCompleted >= thisTotal && thisTotal > 0) return 'completed';
    return thisCompleted > 0 ? 'in-progress' : 'available';
  };

  const handleToggleTask = (dayNumber: number, taskId: string) => {
    if (!started) return;
    toggleTask(journey.slug, dayNumber, taskId);
  };

  const handleStart = () => {
    startJourney(journey.slug);
    setSelectedDay(1);
  };

  const handleReset = () => {
    resetJourney(journey.slug);
    setSelectedDay(1);
  };

  const selectedDayData = journey.days.find((d) => d.dayNumber === selectedDay);
  const isComplete = completionPercent === 100;

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${journey.title} - Creatives Takeover`,
      description: journey.description,
      url: `https://creatives-takeover.com${journeyRoutes[journey.slug]}`,
    },
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'BizMap AI', url: '/bizmap-ai' },
      { name: journey.title, url: `${journeyRoutes[journey.slug]}` },
    ]),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${journey.title} - Creatives Takeover`}
        description={journey.description}
        keywords={`startup validation, founder journey, ${journey.title.toLowerCase()}, execution plan`}
        url={`${journeyRoutes[journey.slug]}`}
        structuredData={structuredData}
      />
      <Navigation />

      <main>
        <section className="py-20 px-4 relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
            <div
              className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.2), transparent 60%), radial-gradient(circle at 70% 70%, rgba(34, 197, 94, 0.2), transparent 55%)',
                animationDuration: '28s',
              }}
            />
          </div>

          <div className="container mx-auto max-w-4xl relative z-10 space-y-10">
            {/* Hero */}
            <JourneyHero
              journey={journey}
              started={started}
              completionPercent={completionPercent}
              currentDay={currentDay}
              onStart={handleStart}
              onReset={handleReset}
            />

            {/* Timeline */}
            {started && (
              <JourneyTimeline
                days={journey.days}
                selectedDay={selectedDay}
                getDayStatus={getDayStatus}
                onSelectDay={setSelectedDay}
              />
            )}

            {/* Completion Card */}
            {isComplete && started && <JourneyCompletionCard journey={journey} />}

            {/* Day Cards */}
            {started && (
              <div className="space-y-4">
                {selectedDayData ? (
                  <DayCard
                    key={selectedDayData.dayNumber}
                    day={selectedDayData}
                    status={getDayStatus(selectedDayData.dayNumber)}
                    progress={progress?.days[selectedDayData.dayNumber]}
                    isSelected={true}
                    onToggleTask={(taskId) => handleToggleTask(selectedDayData.dayNumber, taskId)}
                  />
                ) : null}

                {/* Show other days collapsed */}
                {journey.days
                  .filter((d) => d.dayNumber !== selectedDay)
                  .map((day) => (
                    <DayCard
                      key={day.dayNumber}
                      day={day}
                      status={getDayStatus(day.dayNumber)}
                      progress={progress?.days[day.dayNumber]}
                      isSelected={false}
                      onToggleTask={(taskId) => handleToggleTask(day.dayNumber, taskId)}
                    />
                  ))}
              </div>
            )}

            {/* Pre-start: show journey overview */}
            {!started && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-center">What you'll do each day</h2>
                {journey.days.map((day) => (
                  <DayCard
                    key={day.dayNumber}
                    day={day}
                    status="locked"
                    isSelected={false}
                    onToggleTask={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
