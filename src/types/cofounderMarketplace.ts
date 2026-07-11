export type CofounderListingType = 'building' | 'joining';
export type CofounderListingStatus = 'draft' | 'active' | 'paused' | 'expired' | 'closed' | 'archived';
export type CofounderWorkMode = 'remote' | 'hybrid' | 'in_person' | 'flexible';
export type CofounderInterestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired' | 'blocked';
export type CofounderInterestReason = 'complementary_skills' | 'shared_industry' | 'shared_stage' | 'custom_fit';

export interface CofounderAuthor {
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  emailVerified?: boolean;
  profileComplete?: boolean;
  linkedInAdded?: boolean;
  githubAdded?: boolean;
  responsiveFounder?: boolean;
}

export interface CofounderListing {
  id: string;
  userId?: string;
  listingType: CofounderListingType;
  headline: string;
  summary: string;
  startupName: string | null;
  startupStage: string | null;
  industries: string[];
  skillsOffered: string[];
  skillsSought: string[];
  commitment: string | null;
  timezone: string;
  workMode: CofounderWorkMode;
  location: string | null;
  experienceLevel: string | null;
  values: string[];
  equityRange: string | null;
  status: CofounderListingStatus;
  publishedAt: string | null;
  expiresAt: string | null;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
  author?: CofounderAuthor;
  saved?: boolean;
  isOwner?: boolean;
  score?: number;
  reasons?: string[];
}

export interface CofounderListingInput {
  id?: string;
  listingType: CofounderListingType;
  headline: string;
  summary: string;
  startupName: string;
  startupStage: string;
  industries: string[];
  skillsOffered: string[];
  skillsSought: string[];
  commitment: string;
  timezone: string;
  workMode: CofounderWorkMode;
  location: string;
  experienceLevel: string;
  values: string[];
  equityRange: string;
}

export interface CofounderBrowseFilters {
  listingId?: string;
  query?: string;
  listingType?: CofounderListingType | '';
  stage?: string;
  commitment?: string;
  workMode?: CofounderWorkMode | '';
  industry?: string;
  skill?: string;
  location?: string;
  timezone?: string;
  sort?: 'recently_active' | 'newest';
  savedOnly?: boolean;
  includeOwn?: boolean;
}

export interface CofounderListingPage {
  items: CofounderListing[];
  nextCursor: string | null;
}

export interface CofounderInterest {
  id: string;
  listing_id: string;
  sender_id: string;
  recipient_id: string;
  reason_code: CofounderInterestReason;
  introduction: string;
  availability_note: string;
  status: CofounderInterestStatus;
  stop_recommending: boolean;
  conversation_id: string | null;
  created_at: string;
  responded_at: string | null;
  expires_at: string;
  updated_at: string;
  listing?: Pick<CofounderListing, 'id' | 'headline' | 'listingType'>;
  sender?: CofounderAuthor;
  recipient?: CofounderAuthor;
}

export const COFOUNDER_SKILLS = [
  'Engineering', 'Product', 'Design', 'Sales', 'Marketing', 'Operations',
  'Finance', 'Fundraising', 'Data', 'AI', 'Community', 'Customer success',
] as const;

export const COFOUNDER_VALUES = [
  'Speed', 'Craft', 'Transparency', 'Customer obsession', 'Sustainability',
  'Ambition', 'Work-life balance', 'Evidence-led decisions',
] as const;

export const COFOUNDER_STAGES = [
  { value: 'idea', label: 'Idea' },
  { value: 'building-mvp', label: 'Building MVP' },
  { value: 'mvp-ready', label: 'MVP ready' },
  { value: 'early-users', label: 'Early users' },
  { value: 'funded', label: 'Funded / revenue' },
] as const;

export const MATCH_REASON_LABELS: Record<string, string> = {
  complementary_skills: 'Complementary skills',
  shared_industry: 'Shared industry',
  stage_alignment: 'Stage alignment',
  recently_active: 'Recently active',
};

export function createEmptyCofounderListing(timezone = 'UTC'): CofounderListingInput {
  return {
    listingType: 'building', headline: '', summary: '', startupName: '', startupStage: 'idea',
    industries: [], skillsOffered: [], skillsSought: [], commitment: '', timezone,
    workMode: 'flexible', location: '', experienceLevel: '', values: [], equityRange: '',
  };
}

export function validateCofounderListing(input: CofounderListingInput): string[] {
  const errors: string[] = [];
  if (input.headline.trim().length < 10 || input.headline.trim().length > 100) errors.push('Headline must be 10–100 characters.');
  if (input.summary.trim().length < 80 || input.summary.trim().length > 1200) errors.push('Summary must be 80–1,200 characters.');
  if (input.skillsOffered.length === 0) errors.push('Select at least one skill you offer.');
  if (input.skillsSought.length === 0) errors.push('Select at least one skill you seek.');
  if (!input.commitment) errors.push('Select a time commitment.');
  if (!input.timezone) errors.push('Select a timezone.');
  return errors;
}
