import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, Loader2, Search, Sparkles, Wrench } from "lucide-react";
import SEO, { createBreadcrumbSchema, createCollectionSchema, createOrganizationSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ServiceDirectoryRow } from "@/components/service-marketplace/ServiceDirectoryRow";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useServices } from "@/hooks/useServices";
import type { MarketplaceService, ServiceCategory } from "@/types/serviceMarketplace";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS } from "@/types/serviceMarketplace";
import { resolveServiceMessageUserId } from "@/utils/serviceMarketplace";
import { cn } from "@/lib/utils";

const ALL_CATEGORIES = "all";
type CategoryFilter = ServiceCategory | typeof ALL_CATEGORIES;

const PARTNER_APPLY_PATH = "/apply?as=marketplace";

function sortServices(services: MarketplaceService[], sortBy: string) {
  const result = [...services];

  switch (sortBy) {
    case "newest":
      return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case "featured":
      return result.sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.name.localeCompare(b.name));
    case "alphabetical":
    default:
      return result.sort((a, b) => a.name.localeCompare(b.name));
  }
}

const hasDeck = (service: MarketplaceService) => Boolean(service.pitch_deck_url);
const hasMessaging = (service: MarketplaceService) => Boolean(resolveServiceMessageUserId(service));

const pluralPartners = (count: number) => `${count} partner${count === 1 ? "" : "s"}`;

function HelpCards({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-muted/40 p-5">
        <p className="text-base font-bold">Not sure who fits?</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Tell us what you're stuck on and we'll point you to the right partner.
        </p>
        <Link to="/contact" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          Contact our team <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-5">
        <p className="text-base font-bold">Run a service company?</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Apply to be listed. Every application is reviewed by our team.
        </p>
        <Link
          to={PARTNER_APPLY_PATH}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Apply as a partner <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

const ServiceMarketplaceHub = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAdminRole();
  const { fetchServices } = useServices();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyWithDeck, setOnlyWithDeck] = useState(false);
  const [onlyWithMessaging, setOnlyWithMessaging] = useState(false);
  const categoryFromUrl = searchParams.get("category") as CategoryFilter | null;
  const [category, setCategory] = useState<CategoryFilter>(
    categoryFromUrl && (categoryFromUrl === ALL_CATEGORIES || SERVICE_CATEGORIES.includes(categoryFromUrl as ServiceCategory))
      ? categoryFromUrl
      : ALL_CATEGORIES,
  );
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "featured");

  useEffect(() => {
    let cancelled = false;

    const loadServices = async () => {
      try {
        const nextServices = await fetchServices();
        if (!cancelled) {
          setServices(nextServices);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadServices();

    return () => {
      cancelled = true;
    };
  }, [fetchServices]);

  const handleCategoryChange = (nextCategory: CategoryFilter) => {
    setCategory(nextCategory);
    const params = new URLSearchParams(searchParams);
    if (nextCategory === ALL_CATEGORIES) {
      params.delete("category");
    } else {
      params.set("category", nextCategory);
    }
    setSearchParams(params);
  };

  const handleSortChange = (nextSort: string) => {
    setSortBy(nextSort);
    const params = new URLSearchParams(searchParams);
    params.set("sort", nextSort);
    setSearchParams(params);
  };

  // Results filter as you type; the button just takes you to them.
  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(SERVICE_CATEGORIES.map((key) => [key, 0])) as Record<ServiceCategory, number>;
    for (const service of services) counts[service.category] += 1;
    return counts;
  }, [services]);

  const categoryOptions: { key: CategoryFilter; label: string; count: number }[] = [
    { key: ALL_CATEGORIES, label: "All partners", count: services.length },
    ...SERVICE_CATEGORIES.map((key) => ({ key, label: SERVICE_CATEGORY_LABELS[key], count: categoryCounts[key] })),
  ];

  const deckCount = useMemo(() => services.filter(hasDeck).length, [services]);
  const messagingCount = useMemo(() => services.filter(hasMessaging).length, [services]);

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = services.filter((service) => {
      if (category !== ALL_CATEGORIES && service.category !== category) return false;
      if (onlyWithDeck && !hasDeck(service)) return false;
      if (onlyWithMessaging && !hasMessaging(service)) return false;
      if (!query) return true;

      return (
        service.name.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query) ||
        (service.delivered_by_name ?? "").toLowerCase().includes(query) ||
        SERVICE_CATEGORY_LABELS[service.category].toLowerCase().includes(query)
      );
    });

    return sortServices(filtered, sortBy);
  }, [category, onlyWithDeck, onlyWithMessaging, searchQuery, services, sortBy]);

  const hasActiveFilters = category !== ALL_CATEGORIES || onlyWithDeck || onlyWithMessaging || searchQuery.trim() !== "";

  const clearFilters = () => {
    setSearchQuery("");
    setOnlyWithDeck(false);
    setOnlyWithMessaging(false);
    handleCategoryChange(ALL_CATEGORIES);
  };

  return (
    <>
      <SEO
        title="Founder Service Marketplace | Creatives Takeover"
        description="Browse founder-ready services for sales automation, marketing, operations, workflow automation, and technical support. Review service decks and contact providers directly."
        keywords="founder service marketplace, startup services, sales automation, workflow automation, marketing support, technical support for startups"
        url="/marketplace"
        image="/og-founders-compass-2026-09.png"
        structuredData={[
          createOrganizationSchema(),
          createBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Marketplace", url: "/marketplace" },
          ]),
          createCollectionSchema({
            name: "Founder Service Marketplace",
            description: "A curated service marketplace for founders and small business owners.",
            url: "/marketplace",
            items: services.map((service) => ({
              name: service.name,
              url: `/marketplace/${service.slug}`,
              type: "Service",
            })),
          }),
        ]}
      />
      <div className="relative min-h-screen bg-background">
        <Navigation />
        <main className="relative z-10 pt-header-offset">
          <header className="border-b border-border bg-muted/50">
            <div className="container mx-auto flex max-w-7xl flex-col gap-5 px-4 py-9 sm:px-6">
              <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
                <Link to="/" className="hover:text-foreground">
                  Home
                </Link>
                <span className="mx-1.5" aria-hidden="true">/</span>
                <span className="text-foreground">Marketplace</span>
              </nav>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-2xl">
                  <h1 className="font-space-grotesk text-4xl font-bold tracking-tight sm:text-5xl">
                    Service partners
                  </h1>
                  <p className="mt-2.5 text-base leading-relaxed text-muted-foreground sm:text-lg">
                    Companies that work with founders on product, sales and operations. Compare them side by side, read
                    their decks, then message the one that fits.
                  </p>
                </div>
                {isAdmin && (
                  <Button asChild className="self-start rounded-full sm:self-auto">
                    <Link to="/marketplace/admin/new">Create Service</Link>
                  </Button>
                )}
              </div>

              <form onSubmit={handleSearchSubmit} role="search" className="flex max-w-3xl flex-col gap-2.5 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by company, service or skill"
                    aria-label="Search partners"
                    className="h-12 rounded-xl bg-background pl-11 text-base"
                  />
                </div>
                <Button type="submit" className="h-12 rounded-xl bg-foreground px-7 text-base text-background hover:bg-foreground/90">
                  Search
                </Button>
              </form>

              <ul className="flex flex-wrap gap-x-7 gap-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  {isLoading ? (
                    "Partner companies"
                  ) : (
                    <span>
                      <strong className="text-foreground">{services.length}</strong> partner{" "}
                      {services.length === 1 ? "company" : "companies"}
                    </span>
                  )}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  Reviewed and listed by our team
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  Profiles, decks and messages are free
                </li>
              </ul>
            </div>
          </header>

          <div className="container mx-auto grid max-w-7xl gap-8 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside aria-label="Filters" className="flex min-w-0 flex-col gap-6">
              <fieldset className="min-w-0">
                <legend className="mb-2.5 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Category
                </legend>
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
                  {categoryOptions.map((option) => {
                    const isActive = category === option.key;
                    const isEmpty = option.count === 0 && option.key !== ALL_CATEGORIES;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => handleCategoryChange(option.key)}
                        disabled={isEmpty && !isActive}
                        aria-pressed={isActive}
                        className={cn(
                          "flex min-h-11 shrink-0 items-center justify-between gap-3 whitespace-nowrap rounded-full border px-4 text-left text-base transition-colors lg:rounded-lg lg:border-0 lg:px-3",
                          isActive
                            ? "border-primary/30 bg-primary/10 font-bold text-primary"
                            : "border-border font-medium text-foreground hover:bg-muted",
                          isEmpty && !isActive && "cursor-not-allowed text-muted-foreground/70 hover:bg-transparent",
                        )}
                      >
                        <span>{option.label}</span>
                        <span className={cn("text-sm", isActive ? "text-primary" : "text-muted-foreground")}>
                          {isLoading ? "–" : option.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-3">
                <legend className="mb-2.5 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Includes
                </legend>
                <label className="flex min-h-8 cursor-pointer items-center gap-2.5 text-base">
                  <Checkbox className="no-touch-target !min-h-0 !min-w-0 h-5 w-5" checked={onlyWithDeck} onCheckedChange={(checked) => setOnlyWithDeck(checked === true)} />
                  Pitch deck
                  <span className="text-sm text-muted-foreground">({isLoading ? "–" : deckCount})</span>
                </label>
                <label className="flex min-h-8 cursor-pointer items-center gap-2.5 text-base">
                  <Checkbox
                    className="no-touch-target !min-h-0 !min-w-0 h-5 w-5"
                    checked={onlyWithMessaging}
                    onCheckedChange={(checked) => setOnlyWithMessaging(checked === true)}
                  />
                  In-app messaging
                  <span className="text-sm text-muted-foreground">({isLoading ? "–" : messagingCount})</span>
                </label>
              </fieldset>

              <HelpCards className="hidden lg:flex" />
            </aside>

            <section ref={resultsRef} aria-label="Partners" className="min-w-0 scroll-mt-28">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                {isLoading ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading partners...
                  </p>
                ) : (
                  <p className="text-base font-bold text-foreground" aria-live="polite">
                    {pluralPartners(filteredServices.length)}
                  </p>
                )}
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <span id="marketplace-sort-label">Sort by</span>
                  <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className="h-11 w-40 bg-background" aria-labelledby="marketplace-sort-label">
                      <SelectValue placeholder="Sort partners" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="featured">Featured</SelectItem>
                      <SelectItem value="alphabetical">Alphabetical</SelectItem>
                      <SelectItem value="newest">Newest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col gap-3.5" aria-busy="true" aria-label="Loading partners">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div
                      key={index}
                      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
                    >
                      <Skeleton className="aspect-[4/1] w-full rounded-none" />
                      <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_210px]">
                      <div className="space-y-3">
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-14 w-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-11 w-full" />
                        <Skeleton className="h-11 w-full" />
                      </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredServices.length > 0 ? (
                <div className="flex flex-col gap-3.5">
                  {filteredServices.map((service, index) => (
                    <ServiceDirectoryRow key={service.id} service={service} priority={index < 2} />
                  ))}
                </div>
              ) : services.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Wrench className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-xl font-semibold">No partners yet</h3>
                    <p className="mb-6 text-muted-foreground">
                      Partner profiles will appear here once they are added to the marketplace.
                    </p>
                    {isAdmin && (
                      <Button asChild>
                        <Link to="/marketplace/admin/new">Create First Service</Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Sparkles className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">No partners match those filters.</p>
                    {hasActiveFilters && (
                      <Button variant="outline" className="mt-5" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              <HelpCards className="mt-8 lg:hidden" />
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ServiceMarketplaceHub;
