import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, ChevronDown, User, Mail, Calendar, Shield } from "lucide-react";

export const AuthDebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, session, loading } = useAuth();

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          size="sm"
          className="glass shadow-lg"
        >
          <Shield className="w-4 h-4 mr-2" />
          Auth Debug
          <ChevronUp className="w-4 h-4 ml-2" />
        </Button>
      ) : (
        <Card className="glass shadow-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Auth Debug Panel
              </div>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span>Status:</span>
              <Badge variant={loading ? "secondary" : user ? "default" : "destructive"}>
                {loading ? "Loading" : user ? "Authenticated" : "Anonymous"}
              </Badge>
            </div>

            {/* User Info */}
            {user && (
              <>
                <div className="flex items-start gap-2">
                  <User className="w-3 h-3 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {user.user_metadata?.full_name || 'No name'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Mail className="w-3 h-3 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{user.email}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Calendar className="w-3 h-3 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Session Info */}
            {session && (
              <div className="pt-2 border-t border-border/50">
                <div className="text-muted-foreground mb-1">Session:</div>
                <div className="font-mono text-xs truncate">
                  {session.access_token.substring(0, 20)}...
                </div>
                <div className="text-muted-foreground">
                  Expires: {new Date(session.expires_at! * 1000).toLocaleTimeString()}
                </div>
              </div>
            )}

            {/* No auth state */}
            {!loading && !user && (
              <div className="text-center text-muted-foreground py-2">
                No user authenticated
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};