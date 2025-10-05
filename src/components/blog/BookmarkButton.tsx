import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface BookmarkButtonProps {
  postId: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
  className?: string;
}

const BookmarkButton = ({ 
  postId, 
  variant = "ghost", 
  size = "sm",
  showLabel = false,
  className 
}: BookmarkButtonProps) => {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const bookmarked = isBookmarked(postId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await toggleBookmark(postId);
      toast({
        title: bookmarked ? "Bookmark removed" : "Bookmarked!",
        description: bookmarked 
          ? "Article removed from your bookmarks" 
          : "Article saved to your bookmarks",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update bookmark. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn(
        "group transition-all duration-200",
        bookmarked && "text-primary",
        className
      )}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark article"}
    >
      {bookmarked ? (
        <>
          <BookmarkCheck className={cn(
            "transition-transform group-hover:scale-110",
            showLabel ? "mr-2" : "",
            size === "sm" ? "h-4 w-4" : "h-5 w-5"
          )} />
          {showLabel && "Bookmarked"}
        </>
      ) : (
        <>
          <Bookmark className={cn(
            "transition-transform group-hover:scale-110",
            showLabel ? "mr-2" : "",
            size === "sm" ? "h-4 w-4" : "h-5 w-5"
          )} />
          {showLabel && "Bookmark"}
        </>
      )}
    </Button>
  );
};

export default BookmarkButton;
