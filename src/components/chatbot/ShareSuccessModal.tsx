import { CheckCircle, ExternalLink, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ShareSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId?: string;
}

const ShareSuccessModal = ({ open, onOpenChange, postId }: ShareSuccessModalProps) => {
  const navigate = useNavigate();

  const handleViewPost = () => {
    onOpenChange(false);
    navigate('/community');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Your plan is now live!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-center text-muted-foreground">
            Community members will review your business plan and provide valuable feedback soon.
          </p>
          
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">What happens next?</p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Community members will review your plan</li>
                  <li>• You'll receive structured feedback within 24-48h</li>
                  <li>• Use insights to refine before seeking funding</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleViewPost} className="w-full gap-2">
              View in Community
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button 
              onClick={() => onOpenChange(false)} 
              variant="outline"
              className="w-full"
            >
              Continue Planning
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareSuccessModal;
