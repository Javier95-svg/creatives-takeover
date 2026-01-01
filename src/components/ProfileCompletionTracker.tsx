import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle } from 'lucide-react';

interface ProfileCompletionTrackerProps {
  fullName: string;
  bio: string;
  avatarUrl: string;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
    github?: string;
    website?: string;
  };
}

export const ProfileCompletionTracker = ({
  fullName,
  bio,
  avatarUrl,
  socialLinks,
}: ProfileCompletionTrackerProps) => {
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  const calculateCompletion = () => {
    let completed = 0;
    const total = 4;

    // Check full name (25%)
    if (fullName && fullName.trim().length > 0) completed++;

    // Check bio (25%)
    if (bio && bio.trim().length > 0) completed++;

    // Check avatar (25%)
    if (avatarUrl && avatarUrl.trim().length > 0) completed++;

    // Check at least one social link (25%)
    const hasSocialLink = Object.values(socialLinks).some(
      (link) => link && link.trim().length > 0
    );
    if (hasSocialLink) completed++;

    return Math.round((completed / total) * 100);
  };

  useEffect(() => {
    const percentage = calculateCompletion();
    setCompletionPercentage(percentage);

    // Animate the progress bar
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 300);

    return () => clearTimeout(timer);
  }, [fullName, bio, avatarUrl, socialLinks]);

  const completionItems = [
    { label: 'Full Name', completed: fullName && fullName.trim().length > 0 },
    { label: 'Profile Picture', completed: avatarUrl && avatarUrl.trim().length > 0 },
    { label: 'Bio', completed: bio && bio.trim().length > 0 },
    {
      label: 'Social Link',
      completed: Object.values(socialLinks).some((link) => link && link.trim().length > 0),
    },
  ];

  // Only show if profile is not 100% complete
  if (completionPercentage >= 100) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Complete Your Profile</h3>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {completionPercentage}%
            </span>
          </div>

          <Progress value={animatedPercentage} className="h-2" />

          <div className="grid grid-cols-2 gap-2 pt-2">
            {completionItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-xs">
                {item.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={item.completed ? 'text-foreground' : 'text-muted-foreground'}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {completionPercentage < 100 && (
            <p className="text-xs text-muted-foreground pt-2">
              Complete your profile to unlock the full Creatives Takeover experience
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
