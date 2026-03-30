import { supabase } from '@/integrations/supabase/client';
import {
  buildMentorMarketplaceRoute,
  type MentorRecommendationTrack,
} from '@/lib/mentorDemand';

const NOTIFICATION_IMAGE = '/lovable-uploads/new-favicon.png';

function buildPayload(
  track: MentorRecommendationTrack,
  context?: {
    pmfScore?: number;
    summaryInsight?: string | null;
  },
) {
  if (track === 'validation') {
    const belowThreshold = typeof context?.pmfScore === 'number' && context.pmfScore < 75;

    return {
      slug: 'mentor-demand-validation',
      title: belowThreshold ? 'Need help interpreting your PMF signals?' : 'Pressure-test your validation with a mentor',
      message: belowThreshold
        ? `Your PMF score suggests there is still uncertainty before building. Talk to a validation mentor before you commit more time to the product.`
        : `You have validation evidence in place. A mentor can help you decide what to preserve, what to change, and what to test next.`,
      route: buildMentorMarketplaceRoute({ track: 'validation', source: 'notification' }),
    };
  }

  if (track === 'gtm') {
    return {
      slug: 'mentor-demand-gtm',
      title: 'Pressure-test your GTM plan with a mentor',
      message:
        'You have a GTM plan. Talk to a launch mentor before executing so you can tighten channels, messaging, and first-customer tactics.',
      route: buildMentorMarketplaceRoute({ track: 'gtm', source: 'notification' }),
    };
  }

  if (track === 'mvp') {
    return {
      slug: 'mentor-demand-mvp',
      title: 'Need help scoping the MVP?',
      message:
        'Talk to a product or technical mentor before you build so the first version stays narrow, testable, and realistic.',
      route: buildMentorMarketplaceRoute({ track: 'mvp', source: 'notification' }),
    };
  }

  return {
    slug: 'mentor-demand-fundraising',
    title: 'Need fundraising guidance?',
    message:
      'Talk to a fundraising mentor before outreach so your investor story, materials, and stage positioning are sharper.',
    route: buildMentorMarketplaceRoute({ track: 'fundraising', source: 'notification' }),
  };
}

export async function ensureMentorDemandNotification(
  userId: string,
  track: MentorRecommendationTrack,
  context?: {
    pmfScore?: number;
    summaryInsight?: string | null;
  },
) {
  const payload = buildPayload(track, context);

  try {
    const { data: existing, error: queryError } = await supabase
      .from('community_notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('notification_type', 'platform_update')
      .filter('metadata->>slug', 'eq', payload.slug)
      .limit(1);

    if (queryError) {
      console.error('Failed to check mentor demand notification:', queryError);
      return;
    }

    if (existing && existing.length > 0) {
      return;
    }

    const { error } = await supabase
      .from('community_notifications')
      .insert({
        user_id: userId,
        actor_id: userId,
        notification_type: 'platform_update',
        read: false,
        metadata: {
          slug: payload.slug,
          title: payload.title,
          message: payload.message,
          route: payload.route,
          image_url: NOTIFICATION_IMAGE,
        },
      });

    if (error) {
      console.error('Failed to create mentor demand notification:', error);
    }
  } catch (error) {
    console.error('Unexpected mentor demand notification error:', error);
  }
}
