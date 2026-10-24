import {
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  GraduationCap,
  Handshake,
  LineChart,
  MessageSquare,
  MessagesSquare,
  Rocket,
  Telescope,
  Users,
} from 'lucide-react';

import { DocRow, DocSection } from '@/components/dashboard/DocBlocks';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { useLaunchpadPosts } from '@/hooks/useLaunchpad';
import { launchpadTopic, postPath } from '@/lib/launchpadTopics';

const COMMUNITY_POSTS = 3;

function shortDate(value: string) {
  return new Date(value).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

/** Network: who is waiting on you and who you are meeting. */
function NetworkSection() {
  const { snapshot } = useDashboardData();
  const people = snapshot?.people;
  if (!people) return null;
  const social = snapshot && snapshot.version === 3 ? snapshot.social : null;
  const nextCall = people.upcomingBookings[0] ?? null;
  const mentors = people.savedMentors;

  return (
    <DocSection id="dashboard-network-title" title="Network" icon={Users} action={{ label: 'Open Network', to: '/mentorship' }}>
      <DocRow icon={MessageSquare} label="Messages" value={people.unreadMessages ? `${people.unreadMessages} unread` : 'All read'} muted={!people.unreadMessages} to="/messages" />
      <DocRow
        icon={CalendarClock}
        label="Next call"
        value={nextCall ? `${nextCall.title} · ${shortDate(nextCall.scheduledAt)}` : 'No calls booked'}
        muted={!nextCall}
        to={nextCall ? '/mentorship/my-bookings' : '/mentorship'}
      />
      <DocRow
        icon={GraduationCap}
        label="Saved mentors"
        value={mentors.length ? `${mentors.length} · ${mentors.slice(0, 2).map((mentor) => mentor.name).join(', ')}` : 'None saved yet'}
        muted={!mentors.length}
        to={mentors.length ? '/saved-mentors' : '/mentorship'}
      />
      <DocRow icon={Handshake} label="Co-founder posts" value={`${people.activeCofounderPosts} active`} muted={!people.activeCofounderPosts} to="/co-founder" />
      <DocRow icon={BriefcaseBusiness} label="Marketplace" value={`${people.availableServices} services available`} muted={!people.availableServices} to="/marketplace" />
      {social && social.completedInteractions7 > 0 ? (
        <DocRow
          icon={Users}
          label="This week"
          value={`${social.completedInteractions7} conversations with ${social.uniquePeople7} ${social.uniquePeople7 === 1 ? 'person' : 'people'}`}
        />
      ) : null}
    </DocSection>
  );
}

/** Insighta: traction and the investors and programs you are following up. */
function InsightaSection() {
  const { snapshot } = useDashboardData();
  const business = snapshot?.business;
  if (!business) return null;
  const followUps = snapshot && snapshot.version !== 1 ? snapshot.crossSectionFollowUps.insighta : [];
  const investors = followUps.filter((item) => item.entityType === 'vc').length;
  const programs = followUps.filter((item) => item.entityType === 'accelerator').length;
  const kpi = business.kpis[0] ?? null;

  return (
    <DocSection id="dashboard-insighta-title" title="Insighta" icon={Telescope} action={{ label: 'Open Insighta', to: '/traction-engine' }}>
      <DocRow
        icon={LineChart}
        label="Traction score"
        value={business.tractionScore !== null
          ? `${business.tractionScore}${business.tractionDelta ? ` (${signed(business.tractionDelta)} this week)` : ''}`
          : 'Not measured yet'}
        muted={business.tractionScore === null}
        to="/traction-engine"
      />
      {business.revenue ? (
        <DocRow
          icon={BarChart3}
          label={business.revenue.label}
          value={`${business.revenue.unit ?? ''}${business.revenue.value.toLocaleString('en-GB')}${business.revenue.trend ? ` (${signed(business.revenue.trend)}%)` : ''}`}
          to="/core-metrics"
        />
      ) : null}
      {kpi ? (
        <DocRow
          icon={BarChart3}
          label={kpi.label}
          value={`${kpi.value}${kpi.target ? ` of ${kpi.target}` : ''}${kpi.unit ? ` ${kpi.unit}` : ''}`}
          to="/core-metrics"
        />
      ) : null}
      <DocRow
        icon={Telescope}
        label="Follow-ups"
        value={investors || programs ? `${investors} investors · ${programs} accelerators` : 'None scheduled'}
        muted={!investors && !programs}
        to={programs && !investors ? '/accelerator-hunt' : '/vc-search'}
      />
    </DocSection>
  );
}

/** Community: the newest posts in Rooms, and Launchpad. */
function CommunitySection() {
  const posts = useLaunchpadPosts({ sort: 'new' });
  const latest = (posts.data ?? []).slice(0, COMMUNITY_POSTS);

  return (
    <DocSection id="dashboard-community-title" title="Community" icon={MessagesSquare} action={{ label: 'Open Rooms', to: '/rooms' }}>
      {latest.map((post) => (
        <DocRow
          key={post.id}
          icon={MessagesSquare}
          label={launchpadTopic(post.topic)?.label ?? 'Rooms'}
          value={post.title || post.content}
          to={postPath(post.id)}
        />
      ))}
      {!posts.isLoading && !latest.length ? (
        <DocRow icon={MessagesSquare} label="Rooms" value="Talk shop with founders by stage and skill" muted to="/rooms" />
      ) : null}
      <DocRow icon={Rocket} label="Launchpad" value="This week's launch round" muted to="/launchpad" />
    </DocSection>
  );
}

/** The platform's sections on Overview, each with what matters and a link in. */
export default function DashboardPlatformSections() {
  return (
    <>
      <NetworkSection />
      <InsightaSection />
      <CommunitySection />
    </>
  );
}
