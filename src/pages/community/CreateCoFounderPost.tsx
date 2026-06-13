import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Handshake, ArrowLeft, Save } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { AccountWallpaper } from '@/components/AccountWallpaper';
import { getCurrentUtcMonthStart, useMonthlyQuotas } from '@/hooks/useMonthlyQuotas';
import { useSubscription } from '@/hooks/useSubscription';
import { getQuotaStatus, normalizePlan } from '@/config/planPermissions';

const CreateCoFounderPost = () => {
  const { user } = useAuth();
  const { subscriptionData } = useSubscription();
  const { cycleStart } = useMonthlyQuotas();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Form state
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [stage, setStage] = useState('');
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [commitment, setCommitment] = useState('');
  const [location, setLocation] = useState('');
  const [equity, setEquity] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const cofounderTypes = [
    { id: 'technical', label: 'Technical Co-Founder (CTO)', description: 'Engineering, product development' },
    { id: 'business', label: 'Business Co-Founder (CEO/COO)', description: 'Operations, strategy, sales' },
    { id: 'marketing', label: 'Marketing Co-Founder (CMO)', description: 'Growth, branding, customer acquisition' },
    { id: 'design', label: 'Design Co-Founder', description: 'UX/UI, product design' },
    { id: 'finance', label: 'Finance Co-Founder (CFO)', description: 'Fundraising, financial planning' },
  ];

  const currentPlan = normalizePlan(subscriptionData.subscription_tier);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to create a post');
      return;
    }

    if (!projectName || !projectDescription || !stage || lookingFor.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const cycleAnchor = cycleStart ?? getCurrentUtcMonthStart();
      const initialQuota = getQuotaStatus('cofounder_posts', currentPlan);

      if (Number.isFinite(initialQuota.limit)) {
        const { count, error: countError } = await supabase
          .from('cofounder_posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', cycleAnchor);

        if (countError) throw countError;

        const quota = getQuotaStatus('cofounder_posts', currentPlan, count || 0);

        if (!quota.canUse) {
          toast.error(`You've reached your ${quota.limit} co-founder post limit for this month.`);
          return;
        }
      }

      // Create co-founder post
      const { error } = await supabase
        .from('cofounder_posts')
        .insert({
          user_id: user.id,
          project_name: projectName,
          project_description: projectDescription,
          industry,
          stage,
          looking_for: lookingFor,
          commitment,
          location,
          equity_range: equity,
          additional_info: additionalInfo,
          status: 'active',
        });

      if (error) throw error;

      toast.success('Co-founder post created successfully! Your post is now live.');

      // Redirect to co-founders page to see the post
      setTimeout(() => {
        navigate('/co-founder');
      }, 1500);
    } catch (error: any) {
      console.error('Error creating co-founder post:', error);
      toast.error('Failed to create post: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <AccountWallpaper />
        <div className="relative z-10">
          <Navigation />
          <div className="container mx-auto px-6 pt-header-offset">
            <Card className="max-w-md mx-auto backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>
                  Please log in to create a co-founder post.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AccountWallpaper />
      <div className="relative z-10">
        <Navigation />
        <div className="container mx-auto px-6 pt-header-offset pb-12">
          {/* Header */}
          <div className="text-center py-8 space-y-4">
            <div className="inline-flex items-center gap-2 mb-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Handshake className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Find Your Co-Founder</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-white via-info to-purple-200 bg-clip-text text-transparent">
                Create Your Post
              </span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Tell potential co-founders about your project and what you're looking for
            </p>
          </div>

          {/* Form */}
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Information */}
              <Card className="backdrop-blur-sm bg-card/80 border-border/50">
                <CardHeader>
                  <CardTitle>Project Information</CardTitle>
                  <CardDescription>Tell us about your startup or project</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">
                      Project Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="project-name"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g., AI-powered fitness app"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project-description">
                      Project Description <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="project-description"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="Describe your project, vision, and what problem you're solving..."
                      className="min-h-[120px]"
                      maxLength={1000}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {projectDescription.length}/1000 characters
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        placeholder="e.g., HealthTech, FinTech, EdTech"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location / Remote</Label>
                      <Input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g., San Francisco, Remote"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Current Stage */}
              <Card className="backdrop-blur-sm bg-card/80 border-border/50">
                <CardHeader>
                  <CardTitle>Current Stage <span className="text-destructive">*</span></CardTitle>
                  <CardDescription>Where is your project right now?</CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={stage} onValueChange={setStage} required>
                    <div className="space-y-3">
                      {[
                        { value: 'idea', label: 'Just an idea' },
                        { value: 'building-mvp', label: 'Building an MVP' },
                        { value: 'mvp-ready', label: 'MVP is ready' },
                        { value: 'early-users', label: 'Already have early users' },
                        { value: 'funded', label: 'Funded / Revenue generating' },
                      ].map((option) => (
                        <div
                          key={option.value}
                          className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                            stage === option.value
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setStage(option.value)}
                        >
                          <RadioGroupItem value={option.value} id={option.value} />
                          <Label htmlFor={option.value} className="cursor-pointer flex-1">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Looking For */}
              <Card className="backdrop-blur-sm bg-card/80 border-border/50">
                <CardHeader>
                  <CardTitle>What are you looking for? <span className="text-destructive">*</span></CardTitle>
                  <CardDescription>Select all that apply</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {cofounderTypes.map((type) => (
                      <div
                        key={type.id}
                        className="flex items-start space-x-3 p-3 rounded-lg border hover:border-primary/50 transition-all"
                      >
                        <Checkbox
                          id={type.id}
                          checked={lookingFor.includes(type.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setLookingFor([...lookingFor, type.id]);
                            } else {
                              setLookingFor(lookingFor.filter((t) => t !== type.id));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <Label htmlFor={type.id} className="cursor-pointer font-medium">
                            {type.label}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Additional Details */}
              <Card className="backdrop-blur-sm bg-card/80 border-border/50">
                <CardHeader>
                  <CardTitle>Additional Details</CardTitle>
                  <CardDescription>Optional but helpful information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="commitment">Time Commitment</Label>
                    <Input
                      id="commitment"
                      value={commitment}
                      onChange={(e) => setCommitment(e.target.value)}
                      placeholder="e.g., Full-time, Part-time, Weekends"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="equity">Equity Range</Label>
                    <Input
                      id="equity"
                      value={equity}
                      onChange={(e) => setEquity(e.target.value)}
                      placeholder="e.g., 20-30%, Negotiable"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="additional-info">Additional Information</Label>
                    <Textarea
                      id="additional-info"
                      value={additionalInfo}
                      onChange={(e) => setAdditionalInfo(e.target.value)}
                      placeholder="Any other details potential co-founders should know..."
                      className="min-h-[100px]"
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground">
                      {additionalInfo.length}/500 characters
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>

                <Button type="submit" disabled={loading} size="lg">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Post...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Post
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCoFounderPost;
