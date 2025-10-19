import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus, LogIn, X } from "lucide-react";

interface SignInModalProps {
  open: boolean;
  onClose: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  triggerAction?: 'like' | 'comment' | 'repost' | 'post' | null;
}

const SignInModal: React.FC<SignInModalProps> = ({ open, onClose, onSignIn, onSignUp, triggerAction }) => {
  const getActionMessage = () => {
    switch (triggerAction) {
      case 'like':
        return {
          title: '❤️ Love This Content?',
          description: 'Sign up to like posts, support fellow entrepreneurs, and build your reputation in the community.'
        };
      case 'comment':
        return {
          title: '💬 Have Something to Share?',
          description: 'Join the conversation! Sign up to comment, get feedback, and connect with entrepreneurs worldwide.'
        };
      case 'repost':
        return {
          title: '🔄 Want to Share This?',
          description: 'Sign up to repost content, grow your network, and showcase your entrepreneurial interests.'
        };
      case 'post':
        return {
          title: '✍️ Ready to Share Your Story?',
          description: 'Sign up to post your journey, get AI insights, and connect with a supportive community of entrepreneurs.'
        };
      default:
        return {
          title: '🚀 Join Our Community',
          description: 'Connect with fellow entrepreneurs and grow your business together in our supportive community.'
        };
    }
  };

  const message = getActionMessage();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-sm sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-center">
              {message.title}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-base text-center">
            {message.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
            <Button onClick={onSignIn} className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
            <Button onClick={onSignUp} variant="outline" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Sign Up
            </Button>
          </div>
          
          <div className="text-center bg-primary/10 rounded-lg p-3 border border-primary/20">
            <p className="text-sm font-medium text-primary">
              💼 <span className="font-bold">Growing community</span> of entrepreneurs
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Join thousands building successful businesses together
            </p>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <h4 className="font-medium mb-2">What you can do as a member:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Vote on posts and comments</li>
              <li>• Share your entrepreneurial journey</li>
              <li>• Comment and engage with the community</li>
              <li>• Bookmark posts for later</li>
              <li>• Get AI insights on your posts</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignInModal;