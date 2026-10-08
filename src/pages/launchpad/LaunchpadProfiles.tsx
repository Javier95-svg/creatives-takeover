import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, MessageCircle, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LaunchpadShell } from '@/components/launchpad/LaunchpadShell';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectory } from '@/hooks/useLaunchpad';
import { ANGEL_SECTOR_OPTIONS } from '@/data/angelSectors';
import { isUserType, USER_TYPE_LABEL, USER_TYPES } from '@/lib/accountTypes';
import { FOUNDER_STAGE_LABELS, founderStageLabel } from '@/lib/bizmapStageOrder';

const ALL = 'all';
const PAGE = 24;
// Legacy sector kept only for existing investor records.
const SECTORS = ANGEL_SECTOR_OPTIONS.filter((sector) => sector !== 'Mobility & Logistics');

export default function LaunchpadProfiles() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [userType, setUserType] = useState(ALL);
  const [stage, setStage] = useState(ALL);
  const [sector, setSector] = useState(ALL);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(query); setLimit(PAGE); }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const directory = useDirectory({
    search,
    userType: userType === ALL ? null : userType,
    stage: stage === ALL ? null : Number(stage),
    sector: sector === ALL ? null : sector,
    limit,
  });
  const rows = directory.data ?? [];
  const filtered = Boolean(search.trim()) || userType !== ALL || stage !== ALL || sector !== ALL;

  return <LaunchpadShell seoTitle="Profiles | Launchpad" title="Profiles"
    intro="Founders, builders, mentors and investors on Creatives Takeover. Find people at your stage or in your sector, then open their profile to follow or connect.">
    <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_10rem_11rem_13rem]">
      <div className="relative sm:col-span-2 lg:col-span-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input aria-label="Search people and startups" placeholder="Search by name or startup" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" />
      </div>
      <Select value={userType} onValueChange={(value) => { setUserType(value); setLimit(PAGE); }}>
        <SelectTrigger aria-label="Account type"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Everyone</SelectItem>
          {USER_TYPES.map((type) => <SelectItem key={type} value={type}>{USER_TYPE_LABEL[type]}s</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={stage} onValueChange={(value) => { setStage(value); setLimit(PAGE); }}>
        <SelectTrigger aria-label="Stage"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Any stage</SelectItem>
          {FOUNDER_STAGE_LABELS.map((label, index) => <SelectItem key={label} value={String(index + 1)}>Stage {index + 1} · {label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={sector} onValueChange={(value) => { setSector(value); setLimit(PAGE); }}>
        <SelectTrigger aria-label="Sector"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Any sector</SelectItem>
          {SECTORS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    {stage !== ALL && <p className="-mt-3 mb-5 text-xs text-muted-foreground">Only people who show their stage on their profile appear when filtering by stage.</p>}

    {directory.isError && <p role="alert" className="text-sm text-destructive">Could not load profiles. <button className="underline" onClick={() => void directory.refetch()}>Retry</button></p>}
    {directory.isPending && <div role="status" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><span className="sr-only">Loading profiles…</span>
      {[0, 1, 2, 3, 4, 5].map((index) => <div key={index} className="h-44 animate-pulse rounded-xl bg-muted/60" />)}
    </div>}
    {directory.isSuccess && rows.length === 0 && <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
      {filtered ? 'No one matches these filters yet.' : 'No profiles to show yet.'}
    </CardContent></Card>}

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((person) => {
        const name = person.full_name || person.username;
        const type = isUserType(person.user_type) ? USER_TYPE_LABEL[person.user_type] : null;
        const stageLabel = founderStageLabel(person.stage);
        const isMe = person.id === user?.id;
        const href = `/profile/${encodeURIComponent(person.username)}`;
        return <Card key={person.id} className="border-border/70 transition-shadow hover:shadow-md">
          <CardContent className="flex h-full flex-col gap-3 p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-11 w-11">
                {person.avatar_url && <AvatarImage src={person.avatar_url} alt="" />}
                <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Link to={href} className="block truncate font-medium underline-offset-4 hover:underline">{name}{isMe && <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>}</Link>
                <p className="truncate text-sm text-muted-foreground">@{person.username}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {type && <Badge variant="secondary" className="text-xs">{type}</Badge>}
              {stageLabel && <Badge variant="outline" className="text-xs">Stage {person.stage} · {stageLabel}</Badge>}
            </div>
            <div className="flex-1 text-sm">
              {person.startup_name && <p className="font-space-grotesk font-semibold">{person.startup_name}</p>}
              {(person.startup_tagline || person.positioning_line) && <p className="line-clamp-2 text-muted-foreground">{person.startup_tagline || person.positioning_line}</p>}
              {person.startup_industry && person.startup_industry.length > 0 && <p className="mt-1 truncate text-xs text-muted-foreground">{person.startup_industry.slice(0, 3).join(' · ')}</p>}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <span className="flex min-w-0 items-center gap-1 truncate">
                {person.location ? <><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{person.location}</> : `${person.post_count} ${person.post_count === 1 ? 'post' : 'posts'}`}
              </span>
              <div className="flex shrink-0 gap-1.5">
                {!isMe && <Button asChild size="sm" variant="ghost" className="h-8 px-2"><Link to={`/messages/${encodeURIComponent(person.username)}`} aria-label={`Message ${name}`}><MessageCircle className="h-4 w-4" /></Link></Button>}
                <Button asChild size="sm" variant="outline" className="h-8"><Link to={href}>View profile</Link></Button>
              </div>
            </div>
          </CardContent>
        </Card>;
      })}
    </div>

    {rows.length >= limit && <div className="mt-6 flex justify-center">
      <Button variant="outline" onClick={() => setLimit(limit + PAGE)} disabled={directory.isFetching}>{directory.isFetching ? 'Loading…' : 'Show more'}</Button>
    </div>}
  </LaunchpadShell>;
}
