import { shipMvpIn14Days } from '@/data/journeys/shipMvpIn14Days';
import JourneyLayout from '@/components/journeys/JourneyLayout';

export default function MvpJourney() {
  return <JourneyLayout journey={shipMvpIn14Days} />;
}
