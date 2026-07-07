import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BarChart3, LifeBuoy, Loader2, Megaphone, Search, Settings2, SlidersHorizontal, Sparkles, Wrench } from "lucide-react";
import SEO, { createBreadcrumbSchema, createOrganizationSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ServiceMarketplaceWallpaper from "@/components/wallpapers/ServiceMarketplaceWallpaper";
import { ServiceCard } from "@/components/service-marketplace/ServiceCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useServices } from "@/hooks/useServices";
import type { MarketplaceService, ServiceCategory } from "@/types/serviceMarketplace";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS } from "@/types/serviceMarketplace";
import { cn } from "@/lib/utils";

const ALL_CATEGORIES = "all";
type CategoryFilter = ServiceCategory | typeof ALL_CATEGORIES;

const SERVICE_STACK_ITEMS = [
  { category: "sales" as ServiceCategory, icon: BarChart3, detail: "Pipeline" },
  { category: "marketing" as ServiceCategory, icon: Megaphone, detail: "Demand" },
  { category: "ops" as ServiceCategory, icon: Settings2, detail: "Systems" },
  { category: "tech_support" as ServiceCategory, icon: LifeBuoy, detail: "Support" },
];

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

const ServiceMarketplaceHub = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAdminRole();
  const { fetchServices, loading } = useServices();
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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
      const nextServices = await fetchServices();
      if (!cancelled) {
        setServices(nextServices);
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

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = services.filter((service) => {
      if (category !== ALL_CATEGORIES && service.category !== category) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        service.name.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query) ||
        SERVICE_CATEGORY_LABELS[service.category].toLowerCase().includes(query)
      );
    });

    return sortServices(filtered, sortBy);
  }, [category, searchQuery, services, sortBy]);

  return (
    <>
      <SEO
        title="Founder Service Marketplace | Creatives Takeover"
        description="Browse founder-ready services for sales automation, marketing, operations, workflow automation, and technical support. Review service decks and book discovery calls with credits."
        keywords="founder service marketplace, startup services, sales automation, workflow automation, marketing support, technical support for startups"
        url="/marketplace"
        image="/og-image.png"
        structuredData={[
          createOrganizationSchema(),
          createBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Marketplace", url: "/marketplace" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Founder Service Marketplace",
            "description": "A curated service marketplace for founders and small business owners.",
            "provider": { "@type": "Organization", "name": "Creatives Takeover", "url": "https://creatives-takeover.com" },
            "serviceType": "Founder Services",
            "areaServed": "Worldwide",
            "url": "https://creatives-takeover.com/marketplace",
          },
        ]}
      />
      <div className="relative min-h-screen bg-background">
        <ServiceMarketplaceWallpaper />
        <Navigation />
        <main className="relative z-10 pt-header-offset">
          <section className="py-10 lg:py-14">
            <div className="container mx-auto max-w-6xl px-4 sm:px-6">
              <div className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-white/86 p-5 shadow-[0_28px_80px_-52px_rgba(8,145,178,0.55)] backdrop-blur-xl dark:border-cyan-300/15 dark:bg-slate-950/78 sm:p-8">
                <div className="flex flex-col gap-6">
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-stretch">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
                        Service Marketplace
                      </p>
                      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                        Tailored services that move your business forward.
                      </h1>
                      <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base xl:whitespace-nowrap">
                        Sales automation, marketing systems, operational support, and technical help curated for founders and small teams.
                      </p>
                      {isAdmin && (
                        <Button asChild className="mt-6 rounded-lg bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
                          <Link to="/marketplace/admin/new">Create Service</Link>
                        </Button>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-slate-950 p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_22px_48px_-34px_rgba(15,23,42,0.8)] dark:border-white/10">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                          Operator Stack
                        </p>
                        <div className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_18px_rgba(251,113,133,0.75)]" />
                      </div>
                      <div className="mt-4 grid gap-2">
                        {SERVICE_STACK_ITEMS.map((item) => {
                          const Icon = item.icon;

                          return (
                            <div
                              key={item.category}
                              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-300/12 text-cyan-200">
                                  <Icon className="h-4 w-4" />
                                </span>
                                <span className="truncate text-sm font-semibold">
                                  {SERVICE_CATEGORY_LABELS[item.category]}
                                </span>
                              </div>
                              <span className="text-xs font-medium text-slate-300">
                                {item.detail}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-cyan-500/18 bg-white/72 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur dark:border-cyan-300/12 dark:bg-slate-950/58 sm:p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="relative w-full lg:max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-700/70 dark:text-cyan-300/75" />
                        <Input
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          placeholder="Search services by name, category, or keyword"
                          aria-label="Search services"
                          className="h-11 min-h-[44px] rounded-lg border-slate-200/80 bg-white/90 pl-10 shadow-sm dark:border-white/10 dark:bg-slate-950/80"
                        />
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Select value={sortBy} onValueChange={handleSortChange}>
                          <SelectTrigger className="h-11 w-full rounded-lg border-slate-200/80 bg-white/90 shadow-sm dark:border-white/10 dark:bg-slate-950/80 sm:w-44">
                            <SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Sort services" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="featured">Featured</SelectItem>
                            <SelectItem value="alphabetical">Alphabetical</SelectItem>
                            <SelectItem value="newest">Newest</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCategoryChange(ALL_CATEGORIES)}
                        className={cn(
                          "h-9 rounded-lg border px-3 text-xs font-semibold uppercase tracking-[0.14em] transition",
                          category === ALL_CATEGORIES
                            ? "border-slate-950 bg-slate-950 text-white shadow-sm hover:bg-slate-800 hover:text-white dark:border-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                            : "border-slate-200/80 bg-white/70 text-slate-600 hover:border-cyan-500/40 hover:bg-cyan-50 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-cyan-300/10 dark:hover:text-white",
                        )}
                      >
                        All
                      </Button>
                      {SERVICE_CATEGORIES.map((categoryOption) => (
                        <Button
                          key={categoryOption}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCategoryChange(categoryOption)}
                          className={cn(
                            "h-9 rounded-lg border px-3 text-xs font-semibold uppercase tracking-[0.14em] transition",
                            category === categoryOption
                              ? "border-slate-950 bg-slate-950 text-white shadow-sm hover:bg-slate-800 hover:text-white dark:border-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                              : "border-slate-200/80 bg-white/70 text-slate-600 hover:border-cyan-500/40 hover:bg-cyan-50 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-cyan-300/10 dark:hover:text-white",
                          )}
                        >
                          {SERVICE_CATEGORY_LABELS[categoryOption]}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="container mx-auto max-w-6xl px-4 pb-12 pt-2 sm:px-6">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
                  Loading services...
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {filteredServices.length} service{filteredServices.length === 1 ? "" : "s"} available
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Profiles and pitch decks are free to view.
              </p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center gap-4 py-20">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
                <p className="text-muted-foreground">Loading services...</p>
              </div>
            ) : filteredServices.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {filteredServices.map((service, index) => (
                  <ServiceCard key={service.id} service={service} priority={index < 2} />
                ))}
              </div>
            ) : services.length === 0 ? (
              <Card className="rounded-lg border-cyan-500/20 bg-white/82 shadow-[0_22px_70px_-48px_rgba(8,145,178,0.45)] backdrop-blur dark:bg-slate-950/70">
                <CardContent className="p-12 text-center">
                  <Wrench className="mx-auto mb-4 h-12 w-12 text-cyan-700 dark:text-cyan-300" />
                  <h3 className="mb-2 text-xl font-semibold">No services yet</h3>
                  <p className="mb-6 text-muted-foreground">
                    Service profiles will appear here once they are added to the marketplace.
                  </p>
                  {isAdmin && (
                    <Button asChild>
                      <Link to="/marketplace/admin/new">Create First Service</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-lg border-cyan-500/20 bg-white/82 shadow-[0_22px_70px_-48px_rgba(8,145,178,0.45)] backdrop-blur dark:bg-slate-950/70">
                <CardContent className="p-12 text-center">
                  <Sparkles className="mx-auto mb-4 h-10 w-10 text-rose-600 dark:text-rose-300" />
                  <p className="text-muted-foreground">
                    No services match those filters. Try another category or keyword.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ServiceMarketplaceHub;
