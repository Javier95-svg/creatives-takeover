import { FormEvent, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search as SearchIcon, UserPlus } from "lucide-react";

import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type FounderResult = {
  id: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  creative_niche: string | null;
  startup_name: string | null;
  startup_stage: string | null;
  startup_tagline: string | null;
  location: string | null;
};

const Search = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get("q") || "";
  const initialStage = searchParams.get("stage") || "";
  const [query, setQuery] = useState(initialQuery);
  const [stage, setStage] = useState(initialStage);
  const [results, setResults] = useState<FounderResult[]>([]);
  const [loading, setLoading] = useState(true);

  const stageOptions = useMemo(() => ["idea", "validation", "mvp", "launch", "scaling"], []);

  useEffect(() => {
    let cancelled = false;

    const loadResults = async () => {
      setLoading(true);
      try {
        let request = supabase
          .from("public_profiles")
          .select("id, username, full_name, avatar_url, bio, creative_niche, startup_name, startup_stage, startup_tagline, location")
          .limit(20);

        if (initialQuery) {
          const escaped = initialQuery.replace(/[%_,().]/g, "").trim();
          request = request.or(`username.ilike.%${escaped}%,full_name.ilike.%${escaped}%,startup_name.ilike.%${escaped}%`);
        }

        if (initialStage) {
          request = request.eq("startup_stage", initialStage);
        }

        const { data, error } = await request;
        if (error) throw error;
        if (!cancelled) setResults((data || []) as FounderResult[]);
      } catch (error) {
        console.error("Unable to search founders", error);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadResults();

    return () => {
      cancelled = true;
    };
  }, [initialQuery, initialStage]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (stage) params.set("stage", stage);
    navigate(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Search Founders | Creatives Takeover</title>
      </Helmet>
      <Navigation />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6 lg:pt-32">
        <div className="space-y-4 text-center">
          <Badge variant="secondary" className="rounded-full">Founder discovery</Badge>
          <h1 className="text-4xl font-semibold tracking-tight">Find founders building near your stage</h1>
          <p className="text-muted-foreground">
            Search by founder name, username, startup, niche, or stage.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:grid-cols-[1fr_180px_auto]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search founders, startups, or niches"
          />
          <select
            value={stage}
            onChange={(event) => setStage(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All stages</option>
            {stageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <Button type="submit">
            <SearchIcon className="h-4 w-4" />
            Search
          </Button>
        </form>

        <div className="mt-8 space-y-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="h-28 p-5" />
              </Card>
            ))
          ) : results.length > 0 ? (
            results.map((profile) => {
              const name = profile.full_name || profile.username || "Founder";
              const initials = name.slice(0, 2).toUpperCase();
              return (
                <Card key={profile.id || profile.username} className="transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={profile.avatar_url || undefined} alt={name} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">{name}</h2>
                        {profile.startup_stage ? <Badge variant="outline">{profile.startup_stage}</Badge> : null}
                        {profile.creative_niche ? <Badge variant="secondary">{profile.creative_niche}</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {profile.startup_name || profile.startup_tagline || profile.bio || "Building on Creatives Takeover"}
                      </p>
                    </div>
                    {profile.username ? (
                      <Button variant="outline" asChild>
                        <Link to={`/profile/${profile.username}`}>
                          <UserPlus className="h-4 w-4" />
                          View
                        </Link>
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No founders matched that search yet.
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Search;
