import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, ThumbsUp, Award, TrendingUp, Zap, Users, Target } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const CommunityDemo = () => {
  const navigate = useNavigate();
  const [likedPosts, setLikedPosts] = useState<number[]>([]);

  const demoPosts = [
    {
      id: 1,
      author: "Sarah Chen",
      username: "@sarahbuilds",
      reputation: 1250,
      badge: "Rising Star",
      avatar: "SC",
      timeAgo: "2h ago",
      title: "🎉 Just hit $10K MRR with my SaaS! Here's what worked",
      content: "After 8 months of building in public, my project management tool finally crossed $10K monthly recurring revenue. Key lessons: niche down, talk to users daily, and don't overthink pricing.",
      likes: 234,
      comments: 45,
      tags: ["Success Story", "SaaS", "MRR"],
      trending: true
    },
    {
      id: 2,
      author: "Mike Rodriguez",
      username: "@mikestartup",
      reputation: 850,
      badge: "Community Helper",
      avatar: "MR",
      timeAgo: "5h ago",
      title: "Need advice: Should I quit my job to go full-time?",
      content: "My side project is making $3K/month consistently. Day job pays $6K/month. Family of 3. Have 6 months runway saved. Too early or time to take the leap?",
      likes: 89,
      comments: 67,
      tags: ["Advice Needed", "Full-Time", "Decision"],
      trending: false
    },
    {
      id: 3,
      author: "Emma Thompson",
      username: "@emmacreates",
      reputation: 2100,
      badge: "Top Contributor",
      avatar: "ET",
      timeAgo: "1d ago",
      title: "Free resource: My complete email marketing templates",
      content: "I've spent 3 years perfecting these email sequences. They converted 23% of my leads into paying customers. Sharing them free for the community. Link in comments!",
      likes: 456,
      comments: 123,
      tags: ["Free Resource", "Marketing", "Templates"],
      trending: true
    },
    {
      id: 4,
      author: "David Park",
      username: "@davidbuilds",
      reputation: 650,
      badge: "Newcomer",
      avatar: "DP",
      timeAgo: "3h ago",
      title: "Day 1 of 100: Building my startup in public",
      content: "Starting my 100-day journey to launch my AI writing assistant. Today: validated the problem with 20 customer interviews. All said they'd pay $50/month. Let's go!",
      likes: 178,
      comments: 34,
      tags: ["Build in Public", "Day 1", "AI"],
      trending: false
    }
  ];

  const dailyChallenge = {
    title: "Share Your Weekly Win",
    description: "What's one thing you accomplished this week, no matter how small?",
    reward: "+50 XP",
    participants: 234
  };

  const leaderboard = [
    { rank: 1, name: "Alex Martinez", points: 5420, badge: "🏆" },
    { rank: 2, name: "Jordan Lee", points: 4890, badge: "🥈" },
    { rank: 3, name: "Sam Wilson", points: 4210, badge: "🥉" }
  ];

  const handleLike = (postId: number) => {
    if (likedPosts.includes(postId)) {
      setLikedPosts(likedPosts.filter(id => id !== postId));
      toast.success("Like removed");
    } else {
      setLikedPosts([...likedPosts, postId]);
      toast.success("Post liked! +5 XP");
    }
  };

  const handleNewPost = () => {
    toast.info("Sign up to create your first post!");
    navigate("/login");
  };

  const handleCompleteChallenge = () => {
    toast.success("Challenge completed! +50 XP earned! 🎉");
  };

  const handleReply = () => {
    toast.info("Sign up to join the conversation!");
    navigate("/login");
  };

  const handleComment = () => {
    toast.info("Sign up to comment on posts!");
    navigate("/login");
  };

  const handleSignUp = () => {
    navigate("/login");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-chart-1/10 to-chart-1/5 p-8 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-lg bg-chart-1/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-chart-1" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Community Demo</h2>
            <p className="text-muted-foreground">Connect, share, and grow with fellow entrepreneurs</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <Badge variant="secondary" className="text-sm">
            🏆 Reputation System
          </Badge>
          <Badge variant="secondary" className="text-sm">
            🎯 Daily Challenges
          </Badge>
          <Badge variant="secondary" className="text-sm">
            🤝 Peer Feedback
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Community Feed</h3>
            <Button onClick={handleNewPost}>
              <MessageSquare className="w-4 h-4 mr-2" />
              New Post
            </Button>
          </div>

          {demoPosts.map((post) => (
            <Card key={post.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {post.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{post.author}</p>
                        <Badge variant="outline" className="text-xs">
                          {post.badge}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {post.username} · {post.reputation} rep · {post.timeAgo}
                      </p>
                    </div>
                  </div>
                  {post.trending && (
                    <Badge className="bg-primary/20 text-primary">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Trending
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-bold text-lg mb-2">{post.title}</h4>
                  <p className="text-muted-foreground">{post.content}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id)}
                      className={likedPosts.includes(post.id) ? "text-primary" : ""}
                    >
                      <ThumbsUp className={`w-4 h-4 mr-2 ${likedPosts.includes(post.id) ? 'fill-current' : ''}`} />
                      {post.likes + (likedPosts.includes(post.id) ? 1 : 0)}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleComment}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {post.comments}
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleReply}>Reply</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Daily Challenge */}
          <Card className="bg-gradient-to-br from-chart-3/10 to-chart-3/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Daily Challenge
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold mb-1">{dailyChallenge.title}</p>
                <p className="text-sm text-muted-foreground">{dailyChallenge.description}</p>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  <Zap className="w-3 h-3 mr-1" />
                  {dailyChallenge.reward}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {dailyChallenge.participants} participated
                </span>
              </div>
              <Button className="w-full" size="sm" onClick={handleCompleteChallenge}>
                Complete Challenge
              </Button>
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Top Contributors
              </CardTitle>
              <CardDescription>This week's leaderboard</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((user) => (
                  <div key={user.rank} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{user.badge}</span>
                      <div>
                        <p className="font-semibold text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.points} points</p>
                      </div>
                    </div>
                    <Badge variant="outline">#{user.rank}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Your Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Your Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Reputation</span>
                  <Badge>425 points</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Streak</span>
                  <Badge variant="secondary">7 days 🔥</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Posts</span>
                  <Badge variant="outline">12</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Helpful Votes</span>
                  <Badge variant="outline">89</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">Join the Community</h3>
            <p className="text-muted-foreground mb-4">
              Connect with 10,000+ entrepreneurs building their dreams
            </p>
            <Button size="lg" onClick={handleSignUp}>
              <Users className="w-5 h-5 mr-2" />
              Sign Up Free
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommunityDemo;
