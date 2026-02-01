import { get5PayingUsersIn30Days } from '@/data/journeys/get5PayingUsersIn30Days';
import JourneyLayout from '@/components/journeys/JourneyLayout';

export default function FirstCustomersJourney() {
  return <JourneyLayout journey={get5PayingUsersIn30Days} />;
}
