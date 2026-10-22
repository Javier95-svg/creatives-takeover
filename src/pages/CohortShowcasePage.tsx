import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Loader2 } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { IdCard } from '@/components/founder-id/IdCard';
import { usePageAnalytics } from '@/hooks/usePageAnalytics';
import { captureEvent } from '@/lib/analytics';
import { fetchPublicShowcase, showcaseCardPerson } from '@/lib/cohortShowcase';
import '@/components/founder-id/founder-id.css';

const formatDate = (value: string | null) =>
  // English like the rest of the site, whatever the visitor's browser language.
  value ? new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : null;

/**
 * A program's public showcase: the Founder IDs of the startups in a cohort
 * that chose to appear, usable as a demo-day page. The program switches it on
 * and each founder opts in (supabase/migrations/20261022032451_cohort_showcase.sql).
 */
const CohortShowcasePage = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  usePageAnalytics(`/cohort/${slug}`, 'Cohort showcase - Creatives Takeover');

  const query = useQuery({
    queryKey: ['cohort-showcase', slug],
    staleTime: 60_000,
    retry: false,
    queryFn: () => fetchPublicShowcase(slug),
  });

  const showcase = query.data;
  const heading = showcase
    ? [showcase.programName, showcase.cohortName].filter(Boolean).join(' · ')
    : 'Cohort showcase';
  const demoDay = formatDate(showcase?.demoDayDate ?? null);
  const dates = showcase?.startDate && showcase?.endDate
    ? `${formatDate(showcase.startDate)} to ${formatDate(showcase.endDate)}`
    : null;

  return (
    <>
      <SEO
        title={`${heading} | Creatives Takeover`}
        description={showcase
          ? `The startups of ${heading} on Creatives Takeover: each founder's Founder ID, with what they are building and how far they have got.`
          : 'A cohort showcase on Creatives Takeover.'}
        url={`/cohort/${slug}`}
        image="/og-founder-id.png"
        noindex
      />
      <div className="fid relative min-h-screen overflow-x-clip">
        <Navigation />
        <main>
          <section className="fid-ob fid-hero" aria-labelledby="showcase-title">
            <div className="fid-rings" aria-hidden="true"><span /><span /><span /></div>
            <div className="fid-container fid-hero__inner">
              <p className="fid-label fid-label--both">Cohort showcase</p>
              <h1 id="showcase-title" className="fid-h2">
                {showcase?.programName && <span className="fid-foil">{showcase.programName}</span>}
                {showcase?.programName && <br />}
                {showcase?.cohortName ?? 'Cohort showcase'}
              </h1>
              {showcase && (
                <p className="fid-lede">
                  {demoDay ? `Demo day ${demoDay}. ` : ''}
                  {dates ? `${dates}. ` : ''}
                  {showcase.members.length === 1 ? 'One startup' : `${showcase.members.length} startups`} building in public with a Founder ID.
                </p>
              )}
            </div>
          </section>

          <section className="fid-section" style={{ paddingTop: 24 }}>
            <div className="fid-container">
              {query.isLoading ? (
                <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Loading the showcase…
                </p>
              ) : !showcase ? (
                <div className="mx-auto max-w-[520px] text-center">
                  <h2 className="fid-h3">This showcase isn’t public.</h2>
                  <p className="fid-lede mt-3">The program may have turned it off, or the link is wrong. Founder IDs you have the link to still work.</p>
                </div>
              ) : showcase.members.length === 0 ? (
                <div className="mx-auto max-w-[520px] text-center">
                  <h2 className="fid-h3">No startups on the showcase yet.</h2>
                  <p className="fid-lede mt-3">Founders in this cohort appear here once they choose to.</p>
                </div>
              ) : (
                <ul className="grid gap-x-8 gap-y-12 md:grid-cols-2">
                  {showcase.members.map((member) => (
                    <li key={member.username}>
                      <Link
                        to={`/profile/${encodeURIComponent(member.username)}`}
                        className="group block rounded-[20px] transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none"
                        onClick={() => captureEvent('cohort_showcase_card_clicked', { slug })}
                      >
                        <IdCard person={showcaseCardPerson(member)} className="fid-idcard--flat" />
                        <span className="mt-4 flex items-center gap-1.5 text-sm font-medium">
                          {member.startupName ? `${member.name} · ${member.startupName}` : member.name}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default CohortShowcasePage;
