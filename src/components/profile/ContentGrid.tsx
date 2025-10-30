import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users, Calendar, FileText, Lightbulb, Target, HelpCircle, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ContentItem {
  id: string;
  title: string;
  content: string;
  content_type: string;
  created_at: string;
  tags: string[];
  upvotes: number;
  comment_count: number;
}

interface ContentGridProps {
  items: ContentItem[];
  isOwnProfile: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const contentTypeConfig = {
  post: { icon: MessageCircle, label: "Post", color: "bg-blue-500/10 text-blue-500" },
  diary: { icon: FileText, label: "Diary", color: "bg-purple-500/10 text-purple-500" },
  prompt: { icon: Lightbulb, label: "Prompt", color: "bg-yellow-500/10 text-yellow-500" },
  pitch: { icon: Target, label: "Pitch", color: "bg-green-500/10 text-green-500" },
  feedback: { icon: HelpCircle, label: "Feedback", color: "bg-orange-500/10 text-orange-500" },
};

export const ContentGrid = ({ items, isOwnProfile, onEdit, onDelete }: ContentGridProps) => {
  if (items.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No content yet</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((item) => {
        const contentType = item.content_type || "post";
        const config = contentTypeConfig[contentType as keyof typeof contentTypeConfig] || contentTypeConfig.post;
        const Icon = config.icon;

        return (
          <Card key={item.id} className="p-4 hover:shadow-lg transition-all group">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <Badge variant="outline" className={config.color}>
                  <Icon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
                
                {isOwnProfile && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit?.(item.id)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete?.(item.id)} className="text-destructive">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Content */}
              <Link to={`/community?post=${item.id}`} className="block space-y-2">
                <h3 className="text-base font-semibold line-clamp-2 hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {item.content}
                </p>
              </Link>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 3).map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {item.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{item.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {item.upvotes}
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {item.comment_count}
                </div>
                <div className="flex items-center gap-1 ml-auto">
                  <Calendar className="h-3 w-3" />
                  {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
