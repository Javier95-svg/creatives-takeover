import { Link } from 'react-router-dom';
import { Bookmark, BriefcaseBusiness, Clock3, MapPin, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MATCH_REASON_LABELS, type CofounderListing } from '@/types/cofounderMarketplace';

interface Props {
  listing: CofounderListing;
  authenticated: boolean;
  onSave?: (listing: CofounderListing) => void;
  onInterest?: (listing: CofounderListing) => void;
  onNotRelevant?: (listing: CofounderListing) => void;
}

export function CofounderListingCard({ listing, authenticated, onSave, onInterest, onNotRelevant }: Props) {
  const detailPath = `/co-founder/listing/${listing.id}`;
  return (
    <Card className="flex h-full flex-col border-border/70 bg-card/85 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      <CardHeader className="space-y-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-11 w-11 border">
              <AvatarImage src={listing.author?.avatarUrl ?? undefined} />
              <AvatarFallback>{listing.author?.fullName?.slice(0, 1) ?? (listing.listingType === 'building' ? 'B' : 'J')}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <Badge variant="secondary" className="mb-1">
                {listing.listingType === 'building' ? 'Building · seeking' : 'Open to join'}
              </Badge>
              <p className="truncate text-sm text-muted-foreground">
                {listing.author?.fullName ?? (authenticated ? 'Founder' : 'Founder identity after sign up')}
              </p>
            </div>
          </div>
          {typeof listing.score === 'number' ? (
            <div className="rounded-xl border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-center" aria-label={`${listing.score}% compatibility`}>
              <p className="text-lg font-bold text-primary">{listing.score}%</p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">match</p>
            </div>
          ) : onSave ? (
            <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => onSave(listing)} aria-label={listing.saved ? 'Remove saved listing' : 'Save listing'}>
              <Bookmark className={cn('h-5 w-5', listing.saved && 'fill-primary text-primary')} />
            </Button>
          ) : null}
        </div>
        <div>
          <Link to={detailPath} className="line-clamp-2 text-xl font-semibold leading-tight hover:text-primary">
            {listing.headline}
          </Link>
          {listing.startupName && <p className="mt-1 text-sm font-medium text-muted-foreground">{listing.startupName}</p>}
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{listing.summary}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {listing.startupStage && <Badge variant="outline"><BriefcaseBusiness className="mr-1 h-3 w-3" />{listing.startupStage.replace('-', ' ')}</Badge>}
          {listing.commitment && <Badge variant="outline"><Clock3 className="mr-1 h-3 w-3" />{listing.commitment}</Badge>}
          <Badge variant="outline"><Users className="mr-1 h-3 w-3" />{listing.workMode.replace('_', ' ')}</Badge>
          {(listing.location || listing.timezone) && <Badge variant="outline"><MapPin className="mr-1 h-3 w-3" />{listing.location || listing.timezone}</Badge>}
        </div>
        {listing.skillsSought.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seeking</p>
            <div className="flex flex-wrap gap-1.5">{listing.skillsSought.slice(0, 4).map((skill) => <Badge key={skill}>{skill}</Badge>)}</div>
          </div>
        )}
        {listing.reasons && listing.reasons.length > 0 && (
          <div className="rounded-lg bg-primary/5 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary"><Sparkles className="h-3.5 w-3.5" />Why this match</p>
            <div className="flex flex-wrap gap-1.5">{listing.reasons.map((reason) => <span key={reason} className="text-xs text-muted-foreground">• {MATCH_REASON_LABELS[reason] ?? reason}</span>)}</div>
          </div>
        )}
        {typeof listing.score === 'number' && onNotRelevant && <Button variant="ghost" size="sm" className="px-0 text-muted-foreground" onClick={() => onNotRelevant(listing)}>Not relevant</Button>}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {listing.author?.emailVerified && <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-success" />Email verified</span>}
          <span>Active {formatDistanceToNow(new Date(listing.lastActiveAt), { addSuffix: true })}</span>
        </div>
      </CardContent>
      <CardFooter className="gap-2 border-t pt-4">
        <Button asChild variant="outline" className="h-11 flex-1"><Link to={detailPath}>View details</Link></Button>
        {!listing.isOwner && (
          <Button className="h-11 flex-1" onClick={() => onInterest?.(listing)}>
            {authenticated ? 'Express interest' : 'Sign up to connect'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
