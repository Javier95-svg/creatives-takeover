import type { MVPProjectType } from '@/lib/mvp-builder/project';

export interface MVPProjectTypeOption {
  id: MVPProjectType;
  label: string;
  description: string;
}

export const MVP_PROJECT_TYPE_OPTIONS: MVPProjectTypeOption[] = [
  {
    id: 'web-app',
    label: 'Web App',
    description: 'General-purpose product flows, forms, and app-like interactions.',
  },
  {
    id: 'landing-page',
    label: 'Landing Page',
    description: 'Marketing-led pages, launches, and conversion-focused sites.',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Metrics-heavy interfaces with filters, charts, and overview panels.',
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    description: 'Listings, discovery flows, profiles, and browsing experiences.',
  },
  {
    id: 'directory',
    label: 'Directory',
    description: 'Searchable collections of people, tools, or resources.',
  },
  {
    id: 'internal-tool',
    label: 'Internal Tool',
    description: 'Operational tools, admin panels, and workflow utilities.',
  },
];

export const MVP_DEFAULT_PROJECT_TYPE: MVPProjectType = 'web-app';

export function sanitizeMVPProjectType(value: string | null | undefined): MVPProjectType {
  return (
    MVP_PROJECT_TYPE_OPTIONS.find((option) => option.id === value)?.id ??
    MVP_DEFAULT_PROJECT_TYPE
  );
}

export function getMVPProjectTypeLabel(projectType?: MVPProjectType | null): string {
  return (
    MVP_PROJECT_TYPE_OPTIONS.find((option) => option.id === projectType)?.label ??
    'Web App'
  );
}
