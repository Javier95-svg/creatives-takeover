import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock } from "lucide-react";
import { useSocial } from "@/hooks/useSocial";
import { formatDistanceToNow } from "date-fns";

interface FriendRequestsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FriendRequestsModal = ({ open, onOpenChange }: FriendRequestsModalProps) => {
  const { pendingFriendRequests, respondToFriendRequest, loading } = useSocial();

  const handleAccept = (requestId: string) => {
    void respondToFriendRequest(requestId, 'accept');
  };

  const handleDecline = (requestId: string) => {
    void respondToFriendRequest(requestId, 'decline');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[600px] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Friend Requests
            {pendingFriendRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingFriendRequests.length}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {pendingFriendRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending friend requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingFriendRequests.map((request: any) => (
                <div
                  key={request.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card/50"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={request.sender?.avatar_url} />
                    <AvatarFallback>
                      {request.sender?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {request.sender?.full_name || 'Anonymous User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(request.created_at))} ago
                    </p>
                    {request.message && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        "{request.message}"
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAccept(request.id)}
                      disabled={loading}
                      className="min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 p-0 bg-success/10 border-success/20 hover:bg-success/20"
                    >
                      <Check className="h-4 w-4 text-success" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecline(request.id)}
                      disabled={loading}
                      className="min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 p-0 bg-destructive/10 border-destructive/20 hover:bg-destructive/20"
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};