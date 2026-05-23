import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Building2,
  CheckCircle2,
  FileText,
  FlaskConical,
  Globe2,
  Layers3,
  RefreshCw,
  Save,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { SocialButtons } from "@/components/social/SocialButtons";
import MobileFormOptimizer from "@/components/MobileFormOptimizer";
import { useAuth } from "@/contexts/AuthContext";
import { COUNTRY_OPTIONS } from "@/data/countries";
import { MENTOR_EXPERTISE_OPTIONS } from "@/data/mentorExpertise";
import {
  type StartupProfileFormValues,
  useStartupCommandCenter,
} from "@/hooks/useStartupCommandCenter";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const STAGE_OPTIONS = [
  { value: "idea", label: "Idea" },
  { value: "prototype", label: "Prototype" },
  { value: "mvp", label: "MVP" },
  { value: "launch", label: "Launch" },
  { value: "growth", label: "Growth" },
  { value: "scale", label: "Scale" },
];

type PeerSuggestion = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  startup_name: string | null;
  startup_industry: string[] | null;
  country: string | null;
};

function emptyForm(): StartupProfileFormValues {
  return {
    startupName: "",
    industries: [],
    country: "",
    supportAreasNeeded: [],
    description: "",
    tagline: "",
    stage: "",
    websiteUrl: "",
    positioningLine: "",
    targetMarket: "",
    revenueModel: "",
    links: {
      pitchDeck: "",
      waitlist: "",
      demo: "",
      loom: "",
      website: "",
    },
  };
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

function getOverlap(left: string[], right: string[] | null | undefined) {
  const rightSet = new Set((right ?? []).map(normalizeText));
  return left.filter((item) => rightSet.has(normalizeText(item)));
}

function formatFreshness(value?: string | null) {
  if (!value) return "Not saved yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently updated";
  return formatDistanceToNow(date, { addSuffix: true });
}

function joinList(values: string[] | null | undefined, fallback = "Not captured yet") {
  if (!values?.length) return fallback;
  return values.join(", ");
}

function splitIndustryInput(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function SourceBadge({ children }: { children: string }) {
  return (
    <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-[11px] text-primary">
      {children}
    </Badge>
  );
}

function SectionPanel({
  title,
  icon: Icon,
  source,
  children,
  className,
}: {
  title: string;
  icon: typeof Target;
  source?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border/70 bg-card/95 p-5 shadow-sm", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
          <h2 className="font-space-grotesk text-lg font-semibold text-foreground">{title}</h2>
        </div>
        {source ? <SourceBadge>{source}</SourceBadge> : null}
      </div>
      {children}
    </section>
  );
}

function FieldValue({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="min-w-0 rounded-md border border-border/70 bg-background/70 p-3">
      <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">{value || "Not captured yet"}</p>
    </div>
  );
}

function BulletList({ values, empty }: { values: string[] | null | undefined; empty: string }) {
  if (!values?.length) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <ul className="space-y-2">
      {values.map((value) => (
        <li key={value} className="flex gap-2 text-sm leading-6 text-muted-foreground">
          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
          <span>{value}</span>
        </li>
      ))}
    </ul>
  );
}

function HomeSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)]">
      <div className="space-y-4">
        <Skeleton className="h-44 rounded-lg" />
        <Skeleton className="h-60 rounded-lg" />
        <Skeleton className="h-52 rounded-lg" />
      </div>
      <Skeleton className="h-[620px] rounded-lg" />
    </div>
  );
}

function StartupProfileSection() {
  const { user } = useAuth();
  const { model, loading, saving, error, refresh, updateManualProfile } = useStartupCommandCenter();
  const [form, setForm] = useState<StartupProfileFormValues>(emptyForm);
  const [industryInput, setIndustryInput] = useState("");
  const [peerSuggestions, setPeerSuggestions] = useState<PeerSuggestion[]>([]);
  const [peerLoading, setPeerLoading] = useState(false);
  const [peerError, setPeerError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      startupName: model.manual.startupName,
      industries: model.manual.industries,
      country: model.manual.country,
      supportAreasNeeded: model.manual.supportAreasNeeded,
      description: model.manual.description,
      tagline: model.manual.tagline,
      stage: model.manual.stage,
      websiteUrl: model.manual.websiteUrl,
      positioningLine: model.manual.positioningLine,
      targetMarket: model.manual.targetMarket,
      revenueModel: model.manual.revenueModel,
      links: {
        pitchDeck: model.manual.links.pitchDeck || "",
        waitlist: model.manual.links.waitlist || "",
        demo: model.manual.links.demo || "",
        loom: model.manual.links.loom || "",
        website: model.manual.links.website || "",
      },
    });
    setIndustryInput(model.manual.industries.join(", "));
  }, [model.manual]);

  useEffect(() => {
    if (!user?.id) return;

    const industries = model.manual.industries;
    const country = model.manual.country;

    if (!industries.length && !country) {
      setPeerSuggestions([]);
      return;
    }

    let cancelled = false;
    setPeerLoading(true);
    setPeerError(null);

    supabase
      .from("public_profiles")
      .select("id, full_name, avatar_url, startup_name, startup_industry, country")
      .not("id", "eq", user.id)
      .limit(80)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setPeerError("Founder suggestions could not load right now.");
          setPeerSuggestions([]);
          return;
        }

        const ranked = ((data ?? []) as PeerSuggestion[])
          .map((peer) => {
            const overlap = getOverlap(industries, peer.startup_industry);
            const sameCountry = Boolean(country && normalizeText(peer.country) === normalizeText(country));
            const hasSectorMatch = industries.length > 0 && overlap.length > 0;
            return {
              peer,
              overlap,
              score:
                hasSectorMatch || (!industries.length && sameCountry)
                  ? overlap.length * 20 + (sameCountry ? 30 : 0) + (peer.startup_name ? 4 : 0)
                  : 0,
            };
          })
          .filter(({ score }) => score > 0)
          .sort((left, right) => right.score - left.score)
          .map(({ peer }) => peer)
          .slice(0, 6);

        setPeerSuggestions(ranked);
      })
      .finally(() => {
        if (!cancelled) setPeerLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [model.manual.country, model.manual.industries, user?.id]);

  const completionCount = useMemo(() => {
    const fields = [
      model.manual.startupName,
      model.primaryIndustry,
      model.manual.country,
      model.manual.positioningLine || model.generated.icp?.productPositioning,
      model.manual.description,
      model.manual.stage,
      model.generated.icp,
      model.generated.pmf,
      model.generated.techStack,
    ];
    return fields.filter(Boolean).length;
  }, [model]);

  const handleChange = (key: keyof StartupProfileFormValues, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleLinkChange = (key: string, value: string) => {
    setForm((current) => ({
      ...current,
      links: {
        ...current.links,
        [key]: value,
      },
    }));
  };

  const toggleSupportArea = (supportArea: string) => {
    setForm((current) => ({
      ...current,
      supportAreasNeeded: current.supportAreasNeeded.includes(supportArea)
        ? current.supportAreasNeeded.filter((item) => item !== supportArea)
        : [...current.supportAreasNeeded, supportArea],
    }));
  };

  const handleSave = async () => {
    await updateManualProfile({
      ...form,
      industries: splitIndustryInput(industryInput),
    });
  };

  if (loading) return <HomeSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Home · Startup Profile and Founder Network</p>
          <h1 className="font-space-grotesk text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {model.manual.startupName || "Startup command centre"}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            One place for what the platform knows about your startup and who you should meet next.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-2 text-xs text-muted-foreground">
          <span>{completionCount}/9 profile signals captured</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
          <span>Updated {formatFreshness(model.lastUpdatedAt)}</span>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)] lg:items-start">
        <div className="space-y-5">
          <MobileFormOptimizer>
          <SectionPanel title="Startup Profile" icon={Building2}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startup-name">Startup name</Label>
                <Input
                  id="startup-name"
                  value={form.startupName}
                  onChange={(event) => handleChange("startupName", event.target.value)}
                  placeholder="Acme AI"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startup-industry">Industry or sector</Label>
                <Input
                  id="startup-industry"
                  value={industryInput}
                  onChange={(event) => setIndustryInput(event.target.value)}
                  placeholder="Fintech, AI, Healthtech"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startup-stage">Stage</Label>
                <Select value={form.stage || "idea"} onValueChange={(value) => handleChange("stage", value)}>
                  <SelectTrigger id="startup-stage">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_OPTIONS.map((stage) => (
                      <SelectItem key={stage.value} value={stage.value}>
                        {stage.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startup-country">Country</Label>
                <Select value={form.country || "none"} onValueChange={(value) => handleChange("country", value === "none" ? "" : value)}>
                  <SelectTrigger id="startup-country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not captured yet</SelectItem>
                    {COUNTRY_OPTIONS.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startup-website">Website</Label>
                <Input
                  id="startup-website"
                  value={form.websiteUrl}
                  onChange={(event) => handleChange("websiteUrl", event.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="positioning-line">One-line positioning</Label>
                <Input
                  id="positioning-line"
                  value={form.positioningLine}
                  onChange={(event) => handleChange("positioningLine", event.target.value)}
                  placeholder="The fastest way for [customer] to [outcome]."
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="startup-description">Description</Label>
                <Textarea
                  id="startup-description"
                  value={form.description}
                  onChange={(event) => handleChange("description", event.target.value)}
                  placeholder="What are you building and for whom?"
                  className="min-h-24"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target-market">Target market</Label>
                <Input
                  id="target-market"
                  value={form.targetMarket}
                  onChange={(event) => handleChange("targetMarket", event.target.value)}
                  placeholder="B2B SaaS teams, indie creators..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revenue-model">Revenue model</Label>
                <Input
                  id="revenue-model"
                  value={form.revenueModel}
                  onChange={(event) => handleChange("revenueModel", event.target.value)}
                  placeholder="Subscription, marketplace fee..."
                />
              </div>
              <div className="space-y-3 md:col-span-2">
                <Label>Support areas needed</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {MENTOR_EXPERTISE_OPTIONS.map((supportArea) => (
                    <label
                      key={supportArea}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-border/70 bg-background/70 p-2 text-sm"
                    >
                      <Checkbox
                        checked={form.supportAreasNeeded.includes(supportArea)}
                        onCheckedChange={() => toggleSupportArea(supportArea)}
                      />
                      <span>{supportArea}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Input
                aria-label="Pitch deck link"
                value={form.links.pitchDeck}
                onChange={(event) => handleLinkChange("pitchDeck", event.target.value)}
                placeholder="Pitch deck link"
              />
              <Input
                aria-label="Waitlist link"
                value={form.links.waitlist}
                onChange={(event) => handleLinkChange("waitlist", event.target.value)}
                placeholder="Waitlist link"
              />
              <Input
                aria-label="Demo link"
                value={form.links.demo}
                onChange={(event) => handleLinkChange("demo", event.target.value)}
                placeholder="Demo link"
              />
              <Input
                aria-label="Loom link"
                value={form.links.loom}
                onChange={(event) => handleLinkChange("loom", event.target.value)}
                placeholder="Loom link"
              />
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Manual fields are optional and can be refined as the startup changes.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => void refresh()} disabled={saving}>
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Refresh
                </Button>
                <Button type="button" onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                  {saving ? "Saving..." : "Save profile"}
                </Button>
              </div>
            </div>
          </SectionPanel>
          </MobileFormOptimizer>

          <div className="grid gap-5 xl:grid-cols-2">
            <SectionPanel title="Ideal Customer" icon={Target} source="From ICP Builder">
              {model.generated.icp ? (
                <div className="space-y-4">
                  <FieldValue label="Industry" value={model.generated.icp.snapshot.industry} />
                  <FieldValue label="Customer" value={model.generated.icp.snapshot.roleLine} />
                  <FieldValue label="Persona" value={model.generated.icp.snapshot.personaName} />
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">Core pain points</p>
                    <BulletList values={model.generated.icp.painPoints} empty="Complete ICP Builder to capture pain points." />
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Complete ICP Builder to automatically populate customer, pain, positioning, and competition fields.
                </p>
              )}
            </SectionPanel>

            <SectionPanel title="Positioning And Competition" icon={Layers3} source="From ICP Builder">
              {model.generated.icp ? (
                <div className="space-y-4">
                  <FieldValue label="Product positioning" value={model.generated.icp.productPositioning} />
                  <FieldValue label="Competitive landscape" value={model.generated.icp.competitiveLandscape} />
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">Competitors</p>
                    <p className="text-sm text-muted-foreground">
                      {joinList(model.generated.icp.competitors, "Named competitors have not been captured yet.")}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Competitive landscape will appear here once the ICP draft includes named alternatives or market context.
                </p>
              )}
            </SectionPanel>

            <SectionPanel title="Validation And PMF" icon={FlaskConical} source="From PMF Lab">
              {model.generated.pmf ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldValue label="PMF score" value={model.generated.pmf.score !== null ? `${model.generated.pmf.score}/100` : null} />
                    <FieldValue label="Verdict" value={model.generated.pmf.verdict} />
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {model.generated.pmf.summaryInsight || "PMF insight saved without a summary."}
                  </p>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">Gaps to address</p>
                    <BulletList values={model.generated.pmf.gaps} empty="No PMF gaps captured yet." />
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Save a PMF Lab report to show validation score, buying signals, gaps, and next experiments here.
                </p>
              )}
            </SectionPanel>

            <SectionPanel title="Tech Stack And Budget" icon={Zap} source="From Tech Stack Builder">
              {model.generated.techStack ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldValue label="Monthly fixed budget" value={`$${model.generated.techStack.budgetTotal.toFixed(2)}`} />
                    <FieldValue label="Variable costs" value={model.generated.techStack.hasVariableCosts ? "Included" : "None flagged"} />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">Selected stack</p>
                    <div className="flex flex-wrap gap-2">
                      {model.generated.techStack.selectedTools.length ? (
                        model.generated.techStack.selectedTools.map((tool) => (
                          <Badge key={tool} variant="secondary" className="rounded-full">
                            {tool}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No selected tools captured.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Save a Tech Stack report to make selected tools and budget visible here.
                </p>
              )}
            </SectionPanel>
          </div>

          <SectionPanel title="Startup Development Cycle Outputs" icon={FileText}>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { label: "Waitlist", item: model.generated.cycle.waitlist, icon: Globe2 },
                { label: "MVP Scope", item: model.generated.cycle.mvp, icon: Layers3 },
                { label: "GTM Plan", item: model.generated.cycle.gtm, icon: TrendingUp },
              ].map(({ label, item, icon: Icon }) => (
                <div key={label} className="rounded-md border border-border/70 bg-background/70 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    <p className="text-sm font-semibold">{label}</p>
                  </div>
                  {item ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">
                        {item.summary || "Saved output is available."}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatFreshness(item.updatedAt)}</p>
                    </div>
                  ) : (
                    <p className="text-xs leading-5 text-muted-foreground">No saved output yet.</p>
                  )}
                </div>
              ))}
            </div>
          </SectionPanel>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="rounded-lg border border-border/70 bg-card/95 shadow-sm">
            <div className="border-b border-border/70 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background">
                    <Users className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-space-grotesk text-lg font-semibold">Connect, Share & Grow</h2>
                    <p className="text-xs text-muted-foreground">
                      {model.manual.country ? `Founders near ${model.manual.country}` : "Add your country and sector to improve matches"}
                    </p>
                  </div>
                </div>
                {peerLoading ? <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
              </div>
            </div>

            <div className="max-h-[calc(100dvh-340px)] min-h-[220px] sm:min-h-[320px] overflow-y-auto p-4">
              {!model.manual.industries.length && !model.manual.country ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                  <h3 className="mt-3 text-sm font-semibold">Complete your founder context</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Add a startup sector and country in Startup Profile to discover founders with relevant overlap.
                  </p>
                </div>
              ) : peerLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-28 rounded-lg" />
                  ))}
                </div>
              ) : peerError ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                  {peerError}
                </div>
              ) : peerSuggestions.length ? (
                <div className="space-y-3">
                  {peerSuggestions.map((peer) => {
                    const name = peer.full_name || "Founder";
                    const sectors = peer.startup_industry ?? [];
                    return (
                      <article key={peer.id} className="rounded-lg border border-border/70 bg-background/75 p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-11 w-11 border border-border/60">
                            <AvatarImage src={peer.avatar_url ?? undefined} alt={name} />
                            <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-semibold leading-6 text-foreground">{name}</h3>
                            <p className="truncate text-xs text-muted-foreground">{peer.startup_name || "Startup profile"}</p>
                            {peer.country ? <p className="mt-1 text-xs text-muted-foreground">{peer.country}</p> : null}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {sectors.slice(0, 3).map((sector) => (
                            <Badge key={sector} variant="secondary" className="rounded-full text-[11px]">
                              {sector}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-4">
                          <SocialButtons
                            userId={peer.id}
                            userName={name}
                            profileActionsOnly
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                  <h3 className="mt-3 text-sm font-semibold">No founder matches yet</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Try adding another sector or checking back as more founders complete their profiles.
                  </p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default function StartupHomeCommandCenter() {
  return <StartupProfileSection />;
}
