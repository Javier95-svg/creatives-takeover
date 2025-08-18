import React, { useMemo, useState } from "react";
import PostComposer, { ComposerPayload } from "./PostComposer";
import PostCard, { Post } from "./PostCard";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Example assets for demo posts
import heroImg from "@/assets/solopreneur-hero.jpg";
import team1 from "@/assets/team-member-1.jpg";
import team2 from "@/assets/team-member-2.jpg";
import team3 from "@/assets/team-member-3.jpg";

const CommunityFeed: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([
    {
      id: "p1",
      title: "From zero to first 100 customers in 90 days",
      content:
        "I launched a tiny SaaS for invoicing freelancers. Here's the 3-channel approach that got me to 100 paid users...",
      tags: ["saas", "marketing", "bootstrap"],
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      author: { name: "Alex Rivera", avatar: team1 },
      votes: 128,
      commentsCount: 22,
    },
    {
      id: "p2",
      title: "We failed our Kickstarter, but found PMF anyway",
      content:
        "Kickstarter flop taught us more than success would have. We interviewed 25 backers and pivoted to a B2B offer...",
      tags: ["fundraising", "pmf", "hardware"],
      createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      author: { name: "Morgan Lee", avatar: team2 },
      votes: 74,
      commentsCount: 11,
    },
    {
      id: "p3",
      title: "Quit my job, shipped an AI tool in 4 weeks",
      content:
        "Used weekend sprints + public building to stay accountable. Launched on Product Hunt and learned these 5 lessons...",
      tags: ["ai", "launch", "product-hunt"],
      createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      author: { name: "Sam Patel", avatar: team3 },
      votes: 210,
      commentsCount: 35,
    },
  ]);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"hot" | "new" | "top">("hot");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((p) => p.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [posts]);

  const filtered = useMemo(() => {
    let list = posts.filter((p) =>
      (p.title + " " + p.content).toLowerCase().includes(search.toLowerCase())
    );
    if (selectedTag) list = list.filter((p) => p.tags.includes(selectedTag));

    switch (sort) {
      case "new":
        return list.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      case "top":
        return list.slice().sort((a, b) => b.votes - a.votes);
      default:
        // hot (simple heuristic: votes + recency)
        return list
          .slice()
          .sort((a, b) => b.votes + (+new Date(b.createdAt) - Date.now()) / 1e7 - (a.votes + (+new Date(a.createdAt) - Date.now()) / 1e7));
    }
  }, [posts, search, sort, selectedTag]);

  const publish = (payload: ComposerPayload) => {
    const newPost: Post = {
      id: `p-${Date.now()}`,
      title: payload.title,
      content: payload.content,
      image: payload.image,
      tags: payload.tags,
      createdAt: new Date().toISOString(),
      author: { name: "You" },
      votes: 0,
      commentsCount: 0,
    };
    setPosts((prev) => [newPost, ...prev]);
  };

  return (
    <main className="container mx-auto grid min-h-screen gap-6 px-4 py-8 lg:grid-cols-12">
      <section className="lg:col-span-8 space-y-6">

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stories"
              aria-label="Search stories"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="top">Top</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <PostComposer onPublish={publish} />

        <div className="space-y-6">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          {filtered.length === 0 && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No stories match your search.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <aside className="lg:col-span-4 space-y-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-3 text-sm font-semibold tracking-wide">Popular tags</h2>
            <div className="flex flex-wrap gap-2">
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTag((cur) => (cur === t ? null : t))}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors ${
                    selectedTag === t ? "bg-primary/10 border-primary" : "hover:bg-accent"
                  }`}
                  aria-pressed={selectedTag === t}
                >
                  <span>#{t}</span>
                  {selectedTag === t && (
                    <Badge variant="secondary">active</Badge>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="mb-3 text-sm font-semibold tracking-wide">Community rules</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Be kind and constructive.</li>
              <li>No spam or self-promo without value.</li>
              <li>Share real experiences and learnings.</li>
            </ul>
          </CardContent>
        </Card>
      </aside>
    </main>
  );
};

export default CommunityFeed;
