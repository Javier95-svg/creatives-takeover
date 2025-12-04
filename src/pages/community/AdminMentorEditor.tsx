import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useMentors, CreateMentorInput } from "@/hooks/useMentors";
import { useAuth } from "@/contexts/AuthContext";
import { Save, X, Loader2, ArrowLeft, Trash2, Upload, DollarSign, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mentor } from "@/types/mentor";

const EXPERTISE_OPTIONS = [
  "Product Development",
  "Marketing & Growth",
  "Sales & Business Development",
  "Fundraising",
  "Operations",
  "Strategy",
  "Finance",
  "Legal",
  "HR & Team Building",
  "Technology",
  "Design",
  "Content Creation",
];

const AdminMentorEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === "admin@creatives-takeover.com";
  const {
    fetchMentorById,
    createMentor,
    updateMentor,
    deleteMentor,
    loading,
  } = useMentors();

  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateMentorInput>({
    name: "",
    picture: null,
    bio: "",
    hourly_rate: 10000, // $100/hr default
    expertise: [],
    is_active: true,
    is_featured: false,
    linkedin_url: null,
    twitter_x_url: null,
  });

  useEffect(() => {
    if (!isAdmin) {
      toast.error("Only admins can access this page");
      navigate("/community");
      return;
    }

    if (id && id !== "new") {
      loadMentor(id);
    }
  }, [id, isAdmin, navigate]);

  const loadMentor = async (mentorId: string) => {
    const found = await fetchMentorById(mentorId);

    if (found) {
      setMentor(found);
      setFormData({
        name: found.name,
        picture: found.picture || null,
        bio: found.bio,
        hourly_rate: found.hourly_rate,
        expertise: found.expertise || [],
        is_active: found.is_active !== false,
        is_featured: found.is_featured === true,
        linkedin_url: found.linkedin_url || null,
        twitter_x_url: found.twitter_x_url || null,
      });
      if (found.picture) {
        setPicturePreview(found.picture);
      }
    }
  };

  const handlePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.');
      return;
    }

    const maxSize = 5242880; // 5MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    try {
      setUploadingPicture(true);

      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${mentor?.id || 'temp'}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('mentor-pictures')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('mentor-pictures')
        .getPublicUrl(fileName);

      // Update formData with picture URL
      setFormData((prev) => ({
        ...prev,
        picture: publicUrl,
      }));

      // Save picture immediately to database if mentor exists
      // For new mentors, picture URL is saved in formData and will be included when creating the mentor
      if (mentor?.id) {
        const { error: dbError } = await supabase
          .from('mentors')
          .update({ picture: publicUrl })
          .eq('id', mentor.id);

        if (dbError) {
          console.error('Error saving picture to database:', dbError);
          toast.error(`Failed to save picture: ${dbError.message || 'Database error'}`);
          throw dbError;
        }
        
        // Update the mentor state to reflect the new picture
        setMentor({ ...mentor, picture: publicUrl });
        toast.success('Picture uploaded and saved successfully!');
      } else {
        toast.success('Picture uploaded successfully! It will be saved when you create the mentor.');
      }
    } catch (error: any) {
      console.error('Error uploading picture:', error);
      toast.error('Failed to upload picture');
    } finally {
      setUploadingPicture(false);
      event.target.value = '';
    }
  };

  const handleRemovePicture = () => {
    setFormData((prev) => ({
      ...prev,
      picture: null,
    }));
    setPicturePreview(null);
    toast.success('Picture removed');
  };

  const toggleExpertise = (expertise: string) => {
    setFormData((prev) => {
      const current = prev.expertise || [];
      const newExpertise = current.includes(expertise)
        ? current.filter((e) => e !== expertise)
        : [...current, expertise];
      return { ...prev, expertise: newExpertise };
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.bio) {
      toast.error("Please fill in name and bio");
      return;
    }

    if (formData.hourly_rate < 1000) {
      toast.error("Hourly rate must be at least $10/hr");
      return;
    }

    // Ensure picture is explicitly included in the save payload
    const saveData: CreateMentorInput = {
      ...formData,
      picture: formData.picture || null, // Explicitly include picture field
    };

    // Debug: Log saveData to verify picture is included
    console.log('Saving mentor with data:', {
      ...saveData,
      picture: saveData.picture ? `Picture URL: ${saveData.picture.substring(0, 50)}...` : 'No picture URL'
    });

    let result: Mentor | null = null;
    if (mentor) {
      result = await updateMentor(mentor.id, saveData);
    } else {
      result = await createMentor(saveData);
    }

    if (result) {
      toast.success(mentor ? "Mentor updated!" : "Mentor created!");
      navigate(`/community/mentors/${result.id}`);
    } else {
      toast.error("Failed to save mentor. Please check the console for details.");
    }
  };

  const handleDelete = async () => {
    if (!mentor) return;

    if (confirm("Are you sure you want to delete this mentor?")) {
      const success = await deleteMentor(mentor.id);
      if (success) {
        navigate("/community");
      }
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/community">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold">
                  {mentor ? "Edit Mentor" : "Create New Mentor"}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {mentor ? `Editing: ${mentor.name}` : "Create a new mentor profile"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {mentor && (
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Mentor Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Picture Upload */}
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={picturePreview || undefined} />
                  <AvatarFallback className="text-2xl">
                    {formData.name ? formData.name[0].toUpperCase() : <User className="h-12 w-12" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Label>Profile Picture</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handlePictureUpload}
                      disabled={uploadingPicture}
                      className="cursor-pointer"
                    />
                    {(picturePreview || formData.picture) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemovePicture}
                        disabled={uploadingPicture}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a profile picture (max 5MB). Supported: JPEG, PNG, WebP, GIF.
                  </p>
                </div>
              </div>

              {/* Name */}
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter mentor's full name"
                  className="mt-1"
                />
              </div>

              {/* Social Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                  <Input
                    id="linkedin_url"
                    type="url"
                    value={formData.linkedin_url || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, linkedin_url: e.target.value || null }))
                    }
                    placeholder="https://linkedin.com/in/username"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional LinkedIn profile URL
                  </p>
                </div>
                <div>
                  <Label htmlFor="twitter_x_url">X (Twitter) URL</Label>
                  <Input
                    id="twitter_x_url"
                    type="url"
                    value={formData.twitter_x_url || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, twitter_x_url: e.target.value || null }))
                    }
                    placeholder="https://x.com/username"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional X (Twitter) profile URL
                  </p>
                </div>
              </div>

              {/* Bio */}
              <div>
                <Label htmlFor="bio">Bio *</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  placeholder="Enter mentor's bio and background..."
                  rows={8}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Provide a comprehensive bio about the mentor's experience and expertise.
                </p>
              </div>

              {/* Hourly Rate */}
              <div>
                <Label htmlFor="hourly_rate" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Hourly Rate (USD) *
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    id="hourly_rate"
                    type="number"
                    min="10"
                    step="5"
                    value={(formData.hourly_rate / 100).toFixed(0)}
                    onChange={(e) => {
                      const dollars = parseFloat(e.target.value) || 0;
                      setFormData((prev) => ({
                        ...prev,
                        hourly_rate: Math.round(dollars * 100),
                      }));
                    }}
                    placeholder="100"
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">/hr</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the hourly rate in dollars (e.g., 100 for $100/hr). Minimum: $10/hr
                </p>
              </div>

              {/* Expertise */}
              <div>
                <Label>Expertise Areas</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {EXPERTISE_OPTIONS.map((expertise) => {
                    const isSelected = formData.expertise?.includes(expertise) || false;
                    return (
                      <Button
                        key={expertise}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleExpertise(expertise)}
                      >
                        {expertise}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Select all relevant expertise areas for this mentor.
                </p>
              </div>

              {/* Status Toggles */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is_active">Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Mentor is accepting new bookings
                    </p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_active: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is_featured">Featured</Label>
                    <p className="text-xs text-muted-foreground">
                      Show on featured mentors section
                    </p>
                  </div>
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_featured: checked }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminMentorEditor;

