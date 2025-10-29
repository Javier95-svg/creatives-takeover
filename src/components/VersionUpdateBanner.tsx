import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VersionUpdateBannerProps {
  onRefresh: () => void;
}

const VersionUpdateBanner = ({ onRefresh }: VersionUpdateBannerProps) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-fade-in">
      <Alert className="rounded-none border-x-0 border-t-0 bg-primary/10 border-primary/20">
        <AlertCircle className="h-4 w-4 text-primary" />
        <AlertDescription className="flex items-center justify-between w-full">
          <span className="text-sm font-medium">
            A new version is available. Refresh to get the latest updates.
          </span>
          <Button
            onClick={onRefresh}
            size="sm"
            className="ml-4 gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh Now
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default VersionUpdateBanner;
