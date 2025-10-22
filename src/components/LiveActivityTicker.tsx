import { useEffect, useState } from "react";
import { Users } from "lucide-react";

const activities = [
  { name: "Sarah", location: "Portland", action: "created her roadmap", time: "2 min ago" },
  { name: "Marcus", location: "Austin", action: "launched his first product", time: "12 min ago" },
  { name: "Emily", location: "Boston", action: "made her first sale ($247)", time: "18 min ago" },
  { name: "Jake", location: "Denver", action: "completed his market research", time: "25 min ago" },
  { name: "Lisa", location: "Seattle", action: "started her 30-day sprint", time: "32 min ago" },
];

export default function LiveActivityTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const activity = activities[currentIndex];

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground/80 animate-fade-in">
      <div className="relative">
        <Users className="w-4 h-4" />
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      </div>
      <span>
        <strong className="text-foreground font-medium">{activity.name}</strong> in {activity.location} {activity.action}
        <span className="text-muted-foreground/60 ml-1">· {activity.time}</span>
      </span>
    </div>
  );
}
