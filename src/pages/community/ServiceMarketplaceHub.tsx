import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Search, Sparkles, Wrench } from "lucide-react";
import SEO, { createBreadcrumbSchema, createOrganizationSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CommunityMentorsWallpaper from "@/components/wallpapers/CommunityMentorsWallpaper";
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
        <CommunityMentorsWallpaper />
        <Navigation />
        <main className="relative z-10 pt-header-offset">
          <section className="py-10 lg:py-14">
            <div className="container mx-auto max-w-6xl px-4 sm:px-6">
              <div className="rounded-3xl border border-border/60 bg-white/80 p-5 shadow-sm backdrop-blur dark:bg-slate-950/70 sm:p-8">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                        Network Marketplace
                      </p>
                      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                        Tailored services that move your business forward.
                      </h1>
                      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                        Sales automation, marketing systems, operational support, and technical help curated for founders and small teams.
                      </p>
                    </div>

                    {isAdmin && (
                      <Button asChild className="self-start rounded-full">
                        <Link to="/marketplace/admin/new">Create Service</Link>
                      </Button>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm dark:bg-slate-900/75 sm:p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="relative w-full lg:max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          placeholder="Search services by name, category, or keyword"
                          aria-label="Search services"
                          className="h-11 min-h-[44px] rounded-full pl-10"
                        />
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Select value={sortBy} onValueChange={handleSortChange}>
                          <SelectTrigger className="w-full sm:w-44">
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
                        variant={category === ALL_CATEGORIES ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleCategoryChange(ALL_CATEGORIES)}
                        className="rounded-full"
                      >
                        All
                      </Button>
                      {SERVICE_CATEGORIES.map((categoryOption) => (
                        <Button
                          key={categoryOption}
                          type="button"
                          variant={category === categoryOption ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleCategoryChange(categoryOption)}
                          className={cn("rounded-full", category === categoryOption && "shadow-sm")}
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
                  <Loader2 className="h-4 w-4 animate-spin" />
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
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading services...</p>
              </div>
            ) : filteredServices.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {filteredServices.map((service, index) => (
                  <ServiceCard key={service.id} service={service} priority={index < 2} />
                ))}
              </div>
            ) : services.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Wrench className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
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
              <Card>
                <CardContent className="p-12 text-center">
                  <Sparkles className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
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
