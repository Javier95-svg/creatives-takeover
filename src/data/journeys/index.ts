import type { JourneyDefinition, JourneySlug } from '@/types/journey';
import { validateIn7Days } from './validateIn7Days';
import { shipMvpIn14Days } from './shipMvpIn14Days';
import { get5PayingUsersIn30Days } from './get5PayingUsersIn30Days';

export const journeyDefinitions: Record<JourneySlug, JourneyDefinition> = {
  validate: validateIn7Days,
  mvp: shipMvpIn14Days,
  'first-customers': get5PayingUsersIn30Days,
};

export { validateIn7Days, shipMvpIn14Days, get5PayingUsersIn30Days };
