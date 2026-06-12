import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { id: 'channels', label: 'Channel Recs' },
  { id: 'positioning', label: 'Positioning' },
  { id: 'messaging', label: 'Messaging' },
  { id: 'action-plan', label: '30-Day Plan' },
  { id: 'checklist', label: 'Launch Checklist' },
  { id: 'metrics', label: 'Metrics' },
];

const GTMBriefSidebar: React.FC = () => {
  const [activeId, setActiveId] = useState('channels');

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveId(id); },
        { rootMargin: '-30% 0px -60% 0px' }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="hidden lg:flex flex-col gap-1 sticky top-24 w-44 shrink-0 self-start">
      <p className="text-label font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-2">Contents</p>
      {SECTIONS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => scrollTo(id)}
          className={cn(
            'text-left text-sm px-3 py-1.5 rounded-md transition-all duration-200',
            activeId === id
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          )}
        >
          {label}
        </button>
      ))}
    </nav>
  );
};

export default GTMBriefSidebar;
