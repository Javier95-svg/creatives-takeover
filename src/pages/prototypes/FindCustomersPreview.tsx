import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { ToolPageShell } from '@/components/tool-shell/ToolPageShell';
import GTMRouteWallpaper, { GTMRouteChart } from '@/components/wallpapers/GTMRouteWallpaper';
import FindCustomers from '@/components/gtm/research/FindCustomers';
import type { GtmResearch, ProspectRow, ResearchRunRow, ResearchStepRow } from '@/hooks/useGtmResearch';
import type { BusinessProfile, Segment } from '@/lib/gtmResearch';

/**
 * Design preview of GTM Strategist "Find customers" with seeded data, for
 * review before release. Not linked from the product. ?state= start |
 * analyzing | review | researching | results | prospect.
 */

const profile: BusinessProfile = {
  name: 'BrightSmile',
  offering: { text: 'Online booking and reminder software for dental clinics.', sourceUrl: 'https://brightsmile.app/' },
  audience: { text: 'Independent dental clinics with one to three sites.', sourceUrl: 'https://brightsmile.app/about' },
  valueProposition: { text: 'Fewer missed appointments: automatic reminders and easy rescheduling.', sourceUrl: 'https://brightsmile.app/' },
  industry: 'Dental practice software', businessModel: 'B2B SaaS',
  pricing: { text: 'From £49 a month per clinic.', sourceUrl: 'https://brightsmile.app/pricing' },
  proof: [], geography: 'United Kingdom', languages: ['en'],
  contextNotes: ['Your ICP Builder draft targets single-site practices; the website also mentions small groups, so both are proposed below.'],
};

const segments: Segment[] = [
  { id: 'independent-uk-clinics', name: 'Independent UK dental clinics', pain: 'Missed appointments cost the clinic revenue every week.', geography: 'United Kingdom', sizeBand: '1–20 staff', roles: ['Practice manager', 'Principal dentist'], examples: ['Single-site family practices'],
    criteria: [{ id: 'c1', label: 'Independent dental clinic (not part of a corporate group)', mustHave: true }, { id: 'c2', label: 'Based in the United Kingdom', mustHave: true }, { id: 'c3', label: 'Takes appointments online', mustHave: false }] },
  { id: 'small-dental-groups', name: 'Small dental groups', pain: 'Booking rules differ between sites and staff juggle several calendars.', geography: 'United Kingdom', sizeBand: '2–5 sites', roles: ['Operations manager'], examples: ['Regional groups with two to five practices'],
    criteria: [{ id: 'c1', label: 'Runs two to five dental practices', mustHave: true }, { id: 'c2', label: 'Based in the United Kingdom', mustHave: true }] },
  { id: 'private-cosmetic', name: 'Private cosmetic dentistry', pain: 'High-value consultations lost to no-shows.', geography: 'United Kingdom', sizeBand: '', roles: ['Clinic owner'], examples: ['Whitening and aligner studios'],
    criteria: [{ id: 'c1', label: 'Offers cosmetic or aligner treatments', mustHave: true }, { id: 'c2', label: 'Private patients only', mustHave: true }] },
];

const at = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const step = (key: ResearchStepRow['key'], status: ResearchStepRow['status'], log: string | null, minutes: number, batch = 0): ResearchStepRow =>
  ({ id: `${key}-${batch}`, key, batch, status, log, started_at: status === 'queued' ? null : at(minutes), finished_at: status === 'done' ? at(minutes - 0.3) : null, created_at: at(minutes + 0.1) });

const analysisSteps = [
  step('read_site', 'done', 'Read 4 pages on brightsmile.app', 1.2),
  step('understand_business', 'done', 'Understood BrightSmile: Online booking and reminder software for dental clinics.', 0.9),
  step('find_competitors', 'running', null, 0.4),
];
const doneAnalysis = [
  ...analysisSteps.slice(0, 2),
  step('find_competitors', 'done', 'Found 3 competitors', 0.5),
  step('propose_segments', 'done', 'Proposed 3 groups to target · waiting for you to choose', 0.2),
];
const researchSteps = [
  ...doneAnalysis,
  step('discover_companies', 'done', 'Searched 4 queries · 23 new companies to check (23 so far)', 3),
  step('qualify_companies', 'done', 'Checked 10 websites · 7 match your criteria', 2, 0),
  step('qualify_companies', 'running', 'Checked 15 websites · 9 match your criteria', 1, 1),
];

const quote = (criterionId: string, criterion: string, text: string | null, domain: string, verdict: 'met' | 'unknown' = 'met') =>
  ({ criterionId, criterion, verdict, quote: verdict === 'met' ? text : null, sourceUrl: verdict === 'met' ? `https://${domain}/` : null });

const prospect = (id: string, name: string, domain: string, tier: 'A' | 'B' | 'C', score: number, location: string, description: string,
  quotes: Array<string | null>, extra: Partial<ProspectRow> = {}): ProspectRow => ({
  id, run_id: 'preview-run', domain, name, description, location, size_band: null, industry: 'Dentistry', fit_score: score, fit_tier: tier,
  criteria: [
    quote('c1', segments[0].criteria[0].label, quotes[0], domain, quotes[0] ? 'met' : 'unknown'),
    quote('c2', segments[0].criteria[1].label, quotes[1], domain, quotes[1] ? 'met' : 'unknown'),
    quote('c3', segments[0].criteria[2].label, quotes[2], domain, quotes[2] ? 'met' : 'unknown'),
  ],
  contact_routes: [{ kind: 'contact_page', value: `https://${domain}/contact`, sourceUrl: `https://${domain}/` }, { kind: 'generic_email', value: `hello@${domain}`, sourceUrl: `https://${domain}/contact` }],
  suggested_roles: ['Practice manager', 'Principal dentist'], blocked: false, status: 'new', feedback: null, pipeline_entry_id: null, contact_id: null,
  last_checked_at: at(2), signals: [], contact: null,
  draft: tier === 'C' ? null : {
    id: `draft-${id}`, language: 'en', status: 'draft', edited: false, chosen_variant: 'a', sent_at: null, replied_at: null,
    subject: `Fewer missed appointments at ${name}`,
    body: `Hi {{first_name}},\n\nI saw on your site that ${name} ${quotes[2] ? 'takes bookings online' : 'is an independent practice'}. Missed appointments are one of the costs independent clinics tell us hurt most.\n\nBrightSmile sends automatic reminders and lets patients reschedule in one tap, so fewer slots go empty.\n\nWould a 15-minute call next week be useful? Happy to show you how it works with your current booking flow.\n\nBrightSmile`,
    variant_b_subject: `Empty chairs at ${name}?`,
    variant_b_body: `Hi {{first_name}},\n\nMost independent clinics lose a few appointments a week to no-shows. BrightSmile sends automatic reminders and lets patients reschedule in one tap, so those slots get filled.\n\nWould you be open to a 15-minute call to see if it fits how ${name} books today?\n\nBrightSmile`,
  },
  ...extra,
});

const prospects: ProspectRow[] = [
  prospect('p1', 'Smiles Leeds', 'smilesleeds.co.uk', 'A', 100, 'Leeds, United Kingdom', 'Family-run independent dental clinic in central Leeds.', ['Smiles is an independent, family-run dental clinic', 'dental clinic in Leeds, United Kingdom', 'Book your appointment online any time'], {
    signals: [
      { kind: 'hiring', text: 'Smiles Leeds is hiring a dental receptionist to manage bookings', sourceUrl: 'https://smilesleeds.co.uk/careers', date: '2026-10-21' },
      { kind: 'expansion', text: 'Smiles Leeds opens a second surgery in Headingley', sourceUrl: 'https://www.yorkshireeveningpost.co.uk/', date: '2026-08-04' },
    ],
  }),
  prospect('p2', 'Harbour Dental', 'harbourdental.co.uk', 'A', 100, 'Bristol, United Kingdom', 'Independent practice offering NHS and private care.', ['We are a proudly independent practice, not part of a corporate chain', 'Harbourside, Bristol, England', 'Request an appointment online']),
  prospect('p3', 'The Dental Studio Bath', 'dentalstudiobath.co.uk', 'A', 95, 'Bath, United Kingdom', 'Independent private dental studio.', ['an independent dental studio owned by our principal dentist', 'located in the centre of Bath, Somerset', null]),
  prospect('p4', 'Northgate Family Dentistry', 'northgatedentistry.co.uk', 'A', 92, 'Chester, United Kingdom', 'Independent family dental practice.', ['an independent family dental practice since 1998', 'Northgate Street, Chester, United Kingdom', null], { status: 'shortlisted' }),
  prospect('p5', 'Gentle Dental Glasgow', 'gentledentalglasgow.co.uk', 'B', 77, 'Glasgow, United Kingdom', 'Independent clinic focused on nervous patients.', ['Gentle Dental is an independent clinic for nervous patients', null, 'Book online or call us']),
  prospect('p6', 'Riverside Dental Care', 'riversidedentalcare.co.uk', 'B', 74, 'Nottingham, United Kingdom', 'Independent dental practice by the river.', ['Riverside is an independent practice', null, null], { status: 'in_pipeline' }),
  prospect('p7', 'Bright Teeth Clinic', 'brightteethclinic.co.uk', 'B', 71, 'Cardiff, United Kingdom', 'Independent clinic offering general and cosmetic dentistry.', [null, 'Cathedral Road, Cardiff, Wales', 'Book a consultation online']),
  prospect('p8', 'Oak Tree Dental', 'oaktreedental.co.uk', 'C', 0, '—', 'Found by search; their site blocks automated reading.', [null, null, null], { blocked: true, description: null, location: null }),
];

// One reply and one sent message, so the A/B line and the named contact show.
prospects[1] = {
  ...prospects[1], status: 'contacted', contact_id: 'preview-contact',
  contact: { id: 'pc2', full_name: 'Amelia Hart', role: 'Practice Manager', email: 'amelia.hart@harbourdental.co.uk', email_status: 'valid', provider: 'hunter', sources: ['https://harbourdental.co.uk/team'], found_at: at(1) },
  draft: { ...prospects[1].draft!, status: 'replied', sent_at: at(1), replied_at: at(0.5) },
};
prospects[3] = { ...prospects[3], status: 'contacted', draft: { ...prospects[3].draft!, chosen_variant: 'b', status: 'sent_manually', sent_at: at(1) } };

function makeRun(status: ResearchRunRow['status'], counts: ResearchRunRow['counts'], extra: Partial<ResearchRunRow> = {}): ResearchRunRow {
  return {
    id: 'preview-run', status, input: { websiteUrl: 'brightsmile.app' }, business_profile: status === 'analyzing' ? null : profile,
    competitors: status === 'analyzing' ? [] : [
      { name: 'Dentally', domain: 'dentally.com', why: 'Practice management with online booking' },
      { name: 'Practice Plan', domain: 'practiceplan.co.uk', why: 'Patient plans for UK practices' },
      { name: 'Doctolib', domain: 'doctolib.co.uk', why: 'Appointment booking for clinics' },
    ],
    segments: status === 'analyzing' ? [] : segments, selected_segment: ['needs_review', 'analyzing'].includes(status) ? null : segments[0],
    counts, credits_reserved: 10, credits_charged: null, gifted: false, error_code: null, error_detail: null,
    kind: 'initial', parent_run_id: null, cohort_id: null, rerun_used: false, auto_refresh: false, last_refreshed_at: null,
    created_at: at(6), started_at: status === 'analyzing' || status === 'needs_review' ? null : at(4), completed_at: null, ...extra,
  };
}

const noop = async () => undefined;
function previewResearch(run: ResearchRunRow | null, steps: ResearchStepRow[], rows: ProspectRow[]): GtmResearch {
  return { run, root: run, searches: run ? [run] : [], steps, prospects: rows, loading: false, busy: false, analyze: noop, edit: noop, start: noop, cancel: noop,
    followUp: noop, branch: noop, setAutoRefresh: noop, selectSearch: noop, startOver: () => undefined, refresh: async () => run,
    updateProspect: noop, updateDraft: noop, ensureContact: async () => 'preview-contact', markSent: noop, markReplied: noop,
    findContact: async () => ({ found: false, message: 'Preview only.' }) } as unknown as GtmResearch;
}

export default function FindCustomersPreview() {
  const [params] = useSearchParams();
  const state = params.get('state') ?? 'start';
  const research = useMemo(() => {
    switch (state) {
      case 'analyzing': return previewResearch(makeRun('analyzing', {}), analysisSteps, []);
      case 'review': return previewResearch(makeRun('needs_review', {}), doneAnalysis, []);
      case 'researching': return previewResearch(makeRun('running', { candidates: 23, checked: 15, qualified: 9 }), researchSteps, prospects.slice(0, 6));
      case 'results':
      case 'contact':
      case 'prospect': return previewResearch(makeRun('completed', { candidates: 31, checked: 24, qualified: 7, drafts: 7 }, { credits_charged: 4, status: 'partial', completed_at: at(0.5) }), researchSteps, prospects);
      default: return previewResearch(null, [], []);
    }
  }, [state]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <ToolPageShell
          title="GTM Strategist"
          purpose="Pick the channel to reach your first customers, run it for six weeks, and adjust each week from real results."
          theme="gtm"
          wallpaper={<GTMRouteWallpaper />}
          headerArt={<GTMRouteChart />}
        >
          <FindCustomers key={state} projectId={null} plan={null} defaultWebsite="brightsmile.app" research={research} initialOpenId={state === 'prospect' ? 'p1' : state === 'contact' ? 'p2' : undefined} />
        </ToolPageShell>
      </main>
    </div>
  );
}
