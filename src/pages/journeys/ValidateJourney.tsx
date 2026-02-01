import { validateIn7Days } from '@/data/journeys/validateIn7Days';
import JourneyLayout from '@/components/journeys/JourneyLayout';

export default function ValidateJourney() {
  return <JourneyLayout journey={validateIn7Days} />;
}
