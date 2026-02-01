// ============================================================
// JOURNEY DATA TYPES (static content, defined in data files)
// ============================================================

export type JourneySlug = 'validate' | 'mvp' | 'first-customers';

export type DayStatus = 'locked' | 'available' | 'in-progress' | 'completed';

/** A single real-world founder example embedded in a day */
export interface FounderExample {
  company: string;
  founderName?: string;
  quote: string;
  lesson: string;
}

/** An actionable template the user can copy/fill in */
export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  content: string; // markdown
  placeholders?: string[];
}

/** A single task within a day */
export interface DayTask {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  deliverable: string;
  template?: TaskTemplate;
  toolLink?: {
    label: string;
    href: string;
  };
}

/** A single day in a journey */
export interface JourneyDay {
  dayNumber: number;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  tasks: DayTask[];
  founderExample: FounderExample;
  proTip?: string;
}

/** The complete journey definition */
export interface JourneyDefinition {
  slug: JourneySlug;
  title: string;
  tagline: string;
  description: string;
  totalDays: number;
  icon: string; // Lucide icon name
  color: string; // Tailwind color key
  days: JourneyDay[];
  prerequisites?: JourneySlug[];
  nextJourney?: JourneySlug;
}

// ============================================================
// JOURNEY PROGRESS TYPES (persisted in Zustand/localStorage)
// ============================================================

export interface DayTaskProgress {
  taskId: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface DayProgress {
  dayNumber: number;
  status: DayStatus;
  startedAt?: string;
  completedAt?: string;
  tasks: Record<string, DayTaskProgress>;
}

export interface JourneyProgress {
  journeySlug: JourneySlug;
  startedAt: string;
  currentDay: number;
  days: Record<number, DayProgress>;
  completedAt?: string;
}
