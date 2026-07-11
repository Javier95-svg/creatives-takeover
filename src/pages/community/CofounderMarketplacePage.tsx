import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { AlertCircle, Check, Clock3, Filter, Handshake, Inbox, Loader2, Plus, Search, SlidersHorizontal, Users, X } from 'lucide-react';
import SEO, { createBreadcrumbSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import CommunityCofoundersWallpaper from '@/components/wallpapers/CommunityCofoundersWallpaper';
import { CofounderListingCard } from '@/components/cofounder-marketplace/CofounderListingCard';
import { CofounderInterestDialog } from '@/components/cofounder-marketplace/CofounderInterestDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import {
  blockCofounderInterest, browseCofounderListings, cofounderKeys, getCofounderInterests, getCofounderMatches,
  getMyCofounderListing, renewCofounderListing, respondCofounderInterest,
  reportCofounderTarget, sendCofounderInterest, setCofounderListingStatus, submitCofounderMatchFeedback, toggleCofounderSave, withdrawCofounderInterest,
} from '@/lib/cofounderMarketplace';
import { COFOUNDER_MARKETPLACE_FLAGS } from '@/lib/cofounderMarketplaceFlags';
import { trackCofounderMarketplaceEvent, trackCofounderMarketplaceEventOnce } from '@/lib/cofounderMarketplaceAnalytics';
import { toast } from 'sonner';
import type { CofounderBrowseFilters, CofounderInterest, CofounderInterestReason, CofounderListing, CofounderListingType, CofounderWorkMode } from '@/types/cofounderMarketplace';

type MarketplaceTab = 'recommended' | 'browse' | 'requests' | 'mine';

function FilterFields({ filters, setFilter, clear }: {
  filters: CofounderBrowseFilters;
  setFilter: (key: keyof CofounderBrowseFilters, value: string) => void;
  clear: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><p className="font-semibold">Filters</p><Button variant="ghost" size="sm" onClick={clear}>Clear all</Button></div>
      <div className="space-y-2"><Label htmlFor="listing-type">Listing type</Label><select id="listing-type" className="h-11 w-full rounded-md border bg-background px-3" value={filters.listingType ?? ''} onChange={(e) => setFilter('listingType', e.target.value)}><option value="">All founders</option><option value="building">Building · seeking</option><option value="joining">Open to join</option></select></div>
      <div className="space-y-2"><Label htmlFor="stage-filter">Stage</Label><select id="stage-filter" className="h-11 w-full rounded-md border bg-background px-3" value={filters.stage ?? ''} onChange={(e) => setFilter('stage', e.target.value)}><option value="">Any stage</option><option value="idea">Idea</option><option value="building-mvp">Building MVP</option><option value="mvp-ready">MVP ready</option><option value="early-users">Early users</option><option value="funded">Funded / revenue</option></select></div>
      <div className="space-y-2"><Label htmlFor="work-filter">Work mode</Label><select id="work-filter" className="h-11 w-full rounded-md border bg-background px-3" value={filters.workMode ?? ''} onChange={(e) => setFilter('workMode', e.target.value)}><option value="">Any mode</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="in_person">In person</option><option value="flexible">Flexible</option></select></div>
      <div className="space-y-2"><Label htmlFor="commitment-filter">Commitment</Label><select id="commitment-filter" className="h-11 w-full rounded-md border bg-background px-3" value={filters.commitment ?? ''} onChange={(e) => setFilter('commitment', e.target.value)}><option value="">Any commitment</option><option value="Full-time">Full-time</option><option value="Part-time">Part-time</option><option value="Evenings/weekends">Evenings/weekends</option><option value="Flexible">Flexible</option></select></div>
      <div className="space-y-2"><Label htmlFor="skill-filter">Skill</Label><Input id="skill-filter" value={filters.skill ?? ''} onChange={(e) => setFilter('skill', e.target.value)} placeholder="Engineering, sales…" /></div>
      <div className="space-y-2"><Label htmlFor="industry-filter">Industry</Label><Input id="industry-filter" value={filters.industry ?? ''} onChange={(e) => setFilter('industry', e.target.value)} placeholder="FinTech, climate…" /></div>
      <div className="space-y-2"><Label htmlFor="location-filter">Location</Label><Input id="location-filter" value={filters.location ?? ''} onChange={(e) => setFilter('location', e.target.value)} placeholder="Bogotá, London…" /></div>
      <div className="space-y-2"><Label htmlFor="timezone-filter">Timezone</Label><Input id="timezone-filter" value={filters.timezone ?? ''} onChange={(e) => setFilter('timezone', e.target.value)} placeholder="America/Bogota" /></div>
      <label className="flex min-h-11 items-center gap-3 rounded-md border p-3 text-sm"><input type="checkbox" checked={Boolean(filters.savedOnly)} onChange={(e)=>setFilter('savedOnly',e.target.checked?'true':'')} />Saved only</label>
    </div>
  );
}

function RequestCard({ interest, incoming, pending, onAction }: { interest: CofounderInterest; incoming: boolean; pending: boolean; onAction: (action: 'accept' | 'decline' | 'decline_stop' | 'withdraw' | 'block' | 'report') => void }) {
  return (
    <Card><CardContent className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><Badge variant={interest.status === 'accepted' ? 'default' : 'secondary'}>{interest.status}</Badge><p className="mt-2 text-xs text-muted-foreground">{incoming ? 'Incoming request' : 'Sent request'} · {new Date(interest.created_at).toLocaleDateString()}</p></div><Button asChild variant="ghost" size="sm"><Link to={`/co-founder/listing/${interest.listing_id}`}>View listing</Link></Button></div>
      <p className="text-sm leading-6">{interest.introduction}</p><p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground"><Clock3 className="mr-2 inline h-4 w-4" />{interest.availability_note}</p>
      {interest.status === 'pending' && incoming && <div className="flex flex-wrap gap-2"><Button disabled={pending} onClick={() => onAction('accept')}><Check className="mr-2 h-4 w-4" />Accept & chat</Button><Button disabled={pending} variant="outline" onClick={() => onAction('decline')}><X className="mr-2 h-4 w-4" />Decline</Button><Button disabled={pending} variant="ghost" onClick={() => onAction('decline_stop')}>Decline & stop suggesting</Button><Button disabled={pending} variant="ghost" onClick={() => onAction('report')}>Report</Button><Button disabled={pending} variant="ghost" className="text-destructive" onClick={() => onAction('block')}>Block sender</Button></div>}
      {interest.status === 'pending' && !incoming && <Button disabled={pending} variant="outline" onClick={() => onAction('withdraw')}>Withdraw request</Button>}
      {interest.status === 'accepted' && interest.conversation_id && <Button asChild><Link to={`/messages?conversationId=${interest.conversation_id}`}>Open conversation</Link></Button>}
    </CardContent></Card>
  );
}

export default function CofounderMarketplacePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const matchingEnabled = Boolean(useFeatureFlagEnabled(COFOUNDER_MARKETPLACE_FLAGS.matching));
  const requestsEnabled = Boolean(useFeatureFlagEnabled(COFOUNDER_MARKETPLACE_FLAGS.requests));
  const trustEnabled = Boolean(useFeatureFlagEnabled(COFOUNDER_MARKETPLACE_FLAGS.trust));
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get('tab') as MarketplaceTab | null;
  const tab: MarketplaceTab = requestedTab && ['recommended', 'browse', 'requests', 'mine'].includes(requestedTab) ? requestedTab : (user && matchingEnabled ? 'recommended' : 'browse');
  const [interestListing, setInterestListing] = useState<CofounderListing | null>(null);
  const filters = useMemo<CofounderBrowseFilters>(() => ({
    query: params.get('q') ?? '', listingType: (params.get('type') ?? '') as CofounderListingType | '', stage: params.get('stage') ?? '',
    workMode: (params.get('mode') ?? '') as CofounderWorkMode | '', commitment: params.get('commitment') ?? '', skill: params.get('skill') ?? '', industry: params.get('industry') ?? '', location: params.get('location') ?? '', timezone: params.get('timezone') ?? '', sort: (params.get('sort') as 'recently_active'|'newest'|null) ?? 'recently_active', savedOnly: params.get('saved') === 'true',
  }), [params]);
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => key !== 'sort' && Boolean(value)).length;

  useEffect(() => { trackCofounderMarketplaceEventOnce(user?.id, 'cofounder_marketplace_viewed', 'cofounder_listing', `marketplace:${tab}`, { authenticated: Boolean(user), tab }); }, [tab, user]);
  const browseQuery = useInfiniteQuery({ queryKey: cofounderKeys.browse(filters), queryFn: ({ pageParam }) => browseCofounderListings(filters, pageParam), initialPageParam: null as string | null, getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined, staleTime: 30_000 });
  const matchesQuery = useQuery({ queryKey: cofounderKeys.matches(filters), queryFn: () => getCofounderMatches(filters), enabled: Boolean(user && matchingEnabled && tab === 'recommended'), staleTime: 30_000 });
  const interestsQuery = useQuery({ queryKey: cofounderKeys.interests(user?.id), queryFn: () => getCofounderInterests(user!.id), enabled: Boolean(user && requestsEnabled && tab === 'requests') });
  const mineQuery = useQuery({ queryKey: cofounderKeys.mine(user?.id), queryFn: () => getMyCofounderListing(user!.id), enabled: Boolean(user && tab === 'mine') });
  const shownData = tab === 'recommended' ? matchesQuery.data?.items : browseQuery.data?.pages.flatMap((page)=>page.items);
  const shownLoading = tab === 'recommended' ? matchesQuery.isLoading : browseQuery.isLoading;
  const shownError = tab === 'recommended' ? matchesQuery.isError : browseQuery.isError;

  useEffect(() => { if (!shownLoading && shownData?.length === 0) trackCofounderMarketplaceEvent('cofounder_empty_results', { tab, active_filters: activeFilterCount }); }, [activeFilterCount, shownData, shownLoading, tab]);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: cofounderKeys.all });
  const saveMutation = useMutation({ mutationFn: ({ listing, saved }: { listing: CofounderListing; saved: boolean }) => toggleCofounderSave(listing.id, user!.id, saved), onSuccess: (_, variables) => { void invalidate(); trackCofounderMarketplaceEvent('cofounder_listing_saved', { listing_id:variables.listing.id, saved:!variables.saved }); toast.success('Saved listings updated.'); }, onError: () => toast.error('Could not update this saved listing.') });
  const interestMutation = useMutation({ mutationFn: ({ listing, reason, intro, availability }: { listing: CofounderListing; reason: CofounderInterestReason; intro: string; availability: string }) => sendCofounderInterest(listing.id, reason, intro, availability), onSuccess: (_, variables) => { void invalidate(); trackCofounderMarketplaceEvent('cofounder_interest_sent',{listing_id:variables.listing.id}); setInterestListing(null); toast.success('Interest request sent.'); }, onError: (error: Error) => toast.error(error.message) });
  const feedbackMutation = useMutation({ mutationFn: (listing: CofounderListing) => submitCofounderMatchFeedback(listing.id,user!.id,'not_relevant'), onSuccess: (_,listing) => { void invalidate(); trackCofounderMarketplaceEvent('cofounder_match_feedback',{listing_id:listing.id,feedback:'not_relevant'}); toast.success('Match removed from recommendations.'); }, onError: (error:Error)=>toast.error(error.message) });
  const requestMutation = useMutation({ mutationFn: ({ interest, action }: { interest: CofounderInterest; action: 'accept' | 'decline' | 'decline_stop' | 'withdraw' | 'block' | 'report' }) => action === 'withdraw' ? withdrawCofounderInterest(interest.id) : action === 'block' ? blockCofounderInterest(interest.id) : action === 'report' ? reportCofounderTarget(null,interest.id,'other','Reported from a co-founder interest request.') : respondCofounderInterest(interest.id, action === 'decline_stop' ? 'decline' : action, action === 'decline_stop'), onSuccess: (data: any, variables) => { void invalidate(); if(variables.action==='accept'||variables.action==='decline'||variables.action==='decline_stop')trackCofounderMarketplaceEvent(variables.action==='accept'?'cofounder_interest_accepted':'cofounder_interest_declined',{interest_id:variables.interest.id}); if (variables.action === 'accept' && data?.conversation_id) { trackCofounderMarketplaceEvent('cofounder_conversation_started',{interest_id:variables.interest.id}); navigate(`/messages?conversationId=${data.conversation_id}`); } else toast.success(variables.action==='report'?'Report submitted for review.':'Request updated.'); }, onError: (error: Error) => toast.error(error.message) });
  const listingMutation = useMutation({ mutationFn: ({ id, action }: { id: string; action: 'pause' | 'renew' }) => action === 'renew' ? renewCofounderListing(id, `cofounder-renew:${id}:${crypto.randomUUID()}`) : setCofounderListingStatus(id, 'paused'), onSuccess: (_,variables) => { void invalidate(); if(variables.action==='renew')trackCofounderMarketplaceEvent('cofounder_listing_renewed',{listing_id:variables.id}); toast.success('Listing updated.'); }, onError: (error: Error) => toast.error(error.message) });

  const setFilter = (key: keyof CofounderBrowseFilters, value: string) => {
    const keyMap: Record<string, string> = { query: 'q', listingType: 'type', workMode: 'mode', commitment: 'commitment', stage: 'stage', skill: 'skill', industry: 'industry', location: 'location', timezone: 'timezone', savedOnly: 'saved', sort: 'sort' };
    const next = new URLSearchParams(params); const urlKey = keyMap[key]; if (value) next.set(urlKey, value); else next.delete(urlKey); next.set('tab', tab); setParams(next, { replace: true });
    trackCofounderMarketplaceEvent(key === 'query' ? 'cofounder_search_used' : 'cofounder_filter_applied', { filter: key, has_value: Boolean(value) });
  };
  const clearFilters = () => { const next = new URLSearchParams(); next.set('tab', tab); setParams(next); };
  const openInterest = (listing: CofounderListing) => { if (!user) { trackCofounderMarketplaceEvent('cofounder_public_signup_started', { listing_id: listing.id }); navigate(`/signup?source=cofounder-interest&return=${encodeURIComponent(`/co-founder/listing/${listing.id}`)}`); return; } setInterestListing(listing); };
  const changeTab = (value: string) => { const next = new URLSearchParams(params); next.set('tab', value); setParams(next); };
  const items = shownData ?? [];
  useEffect(() => {
    if (tab !== 'recommended' || !user) return;
    items.slice(0, 10).forEach((listing) => trackCofounderMarketplaceEventOnce(user.id, 'cofounder_match_viewed', 'cofounder_listing', listing.id, { listing_id: listing.id, score: listing.score }));
  }, [items, tab, user]);

  return <div className="relative min-h-screen overflow-hidden bg-background"><SEO title="Find a Co-Founder Marketplace" description="Discover compatible startup co-founders through transparent matching and qualified introductions." url="/co-founder" structuredData={[createBreadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Find a Co-Founder', url: '/co-founder' }])]} /><CommunityCofoundersWallpaper /><div className="relative z-10"><Navigation /><main className="container mx-auto px-4 pb-16 pt-header-offset sm:px-6">
    <section className="flex flex-col gap-5 py-8 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-3xl"><Badge className="mb-3" variant="secondary"><Handshake className="mr-1.5 h-4 w-4" />Founder marketplace</Badge><h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Find the person who makes the company stronger.</h1><p className="mt-3 max-w-2xl text-muted-foreground">Browse real founder opportunities, see transparent compatibility signals, and send qualified interest without cold-message noise.</p></div><Button asChild size="lg" className="h-12 shrink-0"><Link to="/co-founder/create"><Plus className="mr-2 h-5 w-5" />Create listing · 5 credits</Link></Button></section>
    {!user && <Alert className="mb-6 border-primary/30 bg-primary/5"><Users className="h-4 w-4" /><AlertTitle>Real opportunities, identities protected</AlertTitle><AlertDescription>Browse active listing summaries now. Sign up to see founder profiles, compatibility, and express interest.</AlertDescription></Alert>}
    <Tabs value={tab} onValueChange={changeTab}>
      <TabsList className="mb-5 grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-4 lg:w-auto"><TabsTrigger value="recommended" disabled={!user || !matchingEnabled} className="h-11">Recommended</TabsTrigger><TabsTrigger value="browse" className="h-11">Browse</TabsTrigger><TabsTrigger value="requests" disabled={!user} className="h-11">Requests</TabsTrigger><TabsTrigger value="mine" disabled={!user} className="h-11">My listing</TabsTrigger></TabsList>
      <TabsContent value="recommended"><p className="mb-4 text-sm text-muted-foreground">Ranked with transparent compatibility rules. No AI and no credits used.</p></TabsContent>
      <TabsContent value="browse" />
      {(tab === 'browse' || tab === 'recommended') && <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]"><aside className="hidden lg:block"><Card className="sticky top-24"><CardContent className="p-4"><FilterFields filters={filters} setFilter={setFilter} clear={clearFilters} /></CardContent></Card></aside><div>
        <div className="mb-5 flex flex-wrap gap-3"><div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" /><Input className="h-12 pl-10" value={filters.query ?? ''} onChange={(e) => setFilter('query', e.target.value)} placeholder="Search skills, industry, location, or opportunity…" /></div>{tab==='browse'&&<select aria-label="Sort listings" className="h-12 rounded-md border bg-background px-3" value={filters.sort} onChange={(e)=>setFilter('sort',e.target.value)}><option value="recently_active">Recently active</option><option value="newest">Newest</option></select>}<Sheet><SheetTrigger asChild><Button variant="outline" className="h-12 lg:hidden"><SlidersHorizontal className="mr-2 h-4 w-4" />Filters {activeFilterCount > 0 && <Badge className="ml-2">{activeFilterCount}</Badge>}</Button></SheetTrigger><SheetContent className="overflow-y-auto"><SheetHeader><SheetTitle>Refine founders</SheetTitle><SheetDescription>Every active filter changes the marketplace results.</SheetDescription></SheetHeader><div className="mt-6"><FilterFields filters={filters} setFilter={setFilter} clear={clearFilters} /></div></SheetContent></Sheet></div>
        {shownLoading ? <div className="grid gap-5 sm:grid-cols-2" aria-busy="true">{[1,2,3,4].map((n)=><Card key={n} className="h-96 animate-pulse bg-muted/30" />)}</div> : shownError ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Marketplace unavailable</AlertTitle><AlertDescription><Button variant="outline" className="mt-3" onClick={() => tab==='recommended'?matchesQuery.refetch():browseQuery.refetch()}>Retry</Button></AlertDescription></Alert> : items.length === 0 ? <Card><CardContent className="py-14 text-center"><Filter className="mx-auto mb-4 h-10 w-10 text-muted-foreground" /><h2 className="text-xl font-semibold">No founders match these filters</h2><p className="mt-2 text-muted-foreground">Clear a filter or create a listing so compatible founders can find you.</p><Button className="mt-5" variant="outline" onClick={clearFilters}>Clear filters</Button></CardContent></Card> : <><div className="grid gap-5 sm:grid-cols-2">{items.map((listing)=><CofounderListingCard key={listing.id} listing={listing} authenticated={Boolean(user)} onSave={user ? (item)=>saveMutation.mutate({listing:item,saved:Boolean(item.saved)}) : undefined} onInterest={openInterest} onNotRelevant={tab==='recommended'?(item)=>feedbackMutation.mutate(item):undefined} />)}</div>{tab==='browse'&&browseQuery.hasNextPage&&<div className="mt-6 text-center"><Button variant="outline" disabled={browseQuery.isFetchingNextPage} onClick={()=>browseQuery.fetchNextPage()}>{browseQuery.isFetchingNextPage&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Load more founders</Button></div>}</>}
      </div></div>}
      <TabsContent value="requests">{!requestsEnabled ? <Card><CardContent className="py-14 text-center"><Inbox className="mx-auto mb-4 h-10 w-10 text-muted-foreground" /><h2 className="text-xl font-semibold">Qualified requests are coming next</h2><p className="mt-2 text-muted-foreground">This release is still controlled by the requests feature flag.</p></CardContent></Card> : interestsQuery.isLoading ? <Loader2 className="mx-auto my-20 h-8 w-8 animate-spin" /> : <div className="grid gap-6 lg:grid-cols-2"><section><h2 className="mb-3 text-lg font-semibold">Incoming</h2><div className="space-y-3">{interestsQuery.data?.filter((item)=>item.recipient_id===user?.id).map((item)=><RequestCard key={item.id} interest={item} incoming pending={requestMutation.isPending} onAction={(action)=>requestMutation.mutate({interest:item,action})} />)}{!interestsQuery.data?.some((item)=>item.recipient_id===user?.id)&&<p className="text-sm text-muted-foreground">No incoming requests yet.</p>}</div></section><section><h2 className="mb-3 text-lg font-semibold">Sent</h2><div className="space-y-3">{interestsQuery.data?.filter((item)=>item.sender_id===user?.id).map((item)=><RequestCard key={item.id} interest={item} incoming={false} pending={requestMutation.isPending} onAction={(action)=>requestMutation.mutate({interest:item,action})} />)}{!interestsQuery.data?.some((item)=>item.sender_id===user?.id)&&<p className="text-sm text-muted-foreground">You have not sent an interest request.</p>}</div></section></div>}</TabsContent>
      <TabsContent value="mine">{mineQuery.isLoading ? <Loader2 className="mx-auto my-20 h-8 w-8 animate-spin" /> : !mineQuery.data ? <Card><CardContent className="py-14 text-center"><Handshake className="mx-auto mb-4 h-10 w-10 text-muted-foreground" /><h2 className="text-xl font-semibold">Create your marketplace listing</h2><p className="mx-auto mt-2 max-w-md text-muted-foreground">Say what you are building—or what you want to join—and get explainable recommendations.</p><Button asChild className="mt-5"><Link to="/co-founder/create">Create listing · 5 credits</Link></Button></CardContent></Card> : <div className="mx-auto max-w-2xl"><CofounderListingCard listing={{...mineQuery.data,isOwner:true}} authenticated onInterest={()=>{}} /><div className="mt-4 flex flex-wrap gap-3"><Button asChild variant="outline"><Link to={`/co-founder/edit/${mineQuery.data.id}`}>Edit listing</Link></Button>{mineQuery.data.status === 'active' ? <Button variant="outline" disabled={listingMutation.isPending} onClick={()=>listingMutation.mutate({id:mineQuery.data!.id,action:'pause'})}>Pause listing</Button> : <Button disabled={listingMutation.isPending} onClick={()=>listingMutation.mutate({id:mineQuery.data!.id,action:'renew'})}>Renew · 5 credits</Button>}</div>{trustEnabled && <p className="mt-4 text-sm text-muted-foreground">Trust status is derived from verified email and your real profile fields.</p>}</div>}</TabsContent>
    </Tabs>
  </main><Footer /></div><CofounderInterestDialog listing={interestListing} open={Boolean(interestListing)} pending={interestMutation.isPending} onOpenChange={(open)=>!open&&setInterestListing(null)} onSubmit={(reason,intro,availability)=>interestListing&&interestMutation.mutate({listing:interestListing,reason,intro,availability})} /></div>;
}
