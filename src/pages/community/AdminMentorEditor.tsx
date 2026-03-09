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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Loader2, ArrowLeft, Trash2, Upload, DollarSign, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mentor, CURRENCY_OPTIONS, MentorCurrency, getCurrencySymbol } from "@/types/mentor";
import { logInfo, logError, logWarn } from "@/lib/logger";
import { handleError } from "@/lib/errors";

const EXPERTISE_OPTIONS = [
  "Product Development",
  "Growth Marketing",
  "Sales",
  "Business Development",
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
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateMentorInput>({
    name: "",
    picture: null,
    bio: "",
    hourly_rate: 10000, // $100 default for 8-week program (stored in cents)
    hourly_rate_per_hour: 0, // $0 default for per-hour rate (stored in cents)
    currency: 'USD', // Default currency
    expertise: [],
    universities: [],
    is_active: true,
    is_featured: false,
    linkedin_url: null,
    twitter_x_url: null,
    website_url: null,
    calendly_url: null,
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
        hourly_rate_per_hour: found.hourly_rate_per_hour || 0,
        currency: (found.currency as MentorCurrency) || 'USD',
        expertise: found.expertise || [],
        universities: found.universities || [],
        is_active: found.is_active !== false,
        is_featured: found.is_featured === true,
        linkedin_url: found.linkedin_url || null,
        twitter_x_url: found.twitter_x_url || null,
        website_url: found.website_url || null,
        calendly_url: found.calendly_url || null,
      });
      if (found.picture) {
        setPicturePreview(found.picture);
      }
    }
  };

  const handlePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      logInfo('No file selected');
      toast.error('No file selected');
      return;
    }

    // Check if mentor ID exists (required for existing mentors)
    if (!mentor?.id && id && id !== 'new') {
      toast.error('Mentor ID not found. Please refresh the page and try again.');
      logError('Mentor ID missing', new Error('Mentor ID missing'), { id, mentor: mentor?.id });
      return;
    }

    logInfo('Starting picture upload', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      mentorId: mentor?.id || 'new mentor',
      pageId: id
    });

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
      toast.loading('Uploading picture...', { id: 'upload-picture' });

      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to storage - EXACT same pattern as Account page (which works!)
      // Use folder structure: mentorId/timestamp.ext (like user.id/timestamp.jpg in Account)
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileId = mentor?.id || 'temp';
      const fileName = `${fileId}/${Date.now()}.${fileExt}`;

      logInfo('Uploading to storage (Account page pattern)', { 
        fileName, 
        bucket: 'mentor-pictures',
        fileId,
        hasMentorId: !!mentor?.id
      });

      // Use EXACT same upload options as Account page handleCropComplete
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('mentor-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,  // Allow overwrite (Account uses false, but we want overwrite)
          contentType: file.type
        });

      if (uploadError) {
        logError('Storage upload error', uploadError);
        toast.error(`Upload failed: ${uploadError.message || 'Storage error'}`, { id: 'upload-picture' });
        throw uploadError;
      }

      logInfo('File uploaded to storage', { path: uploadData.path });

      // Get public URL - same pattern as Account page
      const { data: { publicUrl } } = supabase.storage
        .from('mentor-pictures')
        .getPublicUrl(fileName);

      logInfo('Public URL generated', { publicUrl });

      // Update formData with picture URL
      setFormData((prev) => ({
        ...prev,
        picture: publicUrl,
      }));

      // Update picturePreview to show the actual uploaded URL (not just base64 preview)
      setPicturePreview(publicUrl);

      // Save picture immediately to database if mentor exists
      if (mentor?.id) {
        logInfo('Saving picture URL to database for mentor', { mentorId: mentor.id });
        toast.loading('Saving to database...', { id: 'save-picture' });

        const { data: updateData, error: dbError } = await supabase
          .from('mentors')
          .update({ picture: publicUrl })
          .eq('id', mentor.id)
          .select();

        if (dbError) {
          logError('Database update error', dbError);
          toast.error(`Failed to save picture: ${dbError.message || 'Database error'}`, { id: 'save-picture' });
          throw dbError;
        }

        logInfo('Picture saved to database', { mentorId: mentor.id });
        
        // Update the mentor state to reflect the new picture
        setMentor({ ...mentor, picture: publicUrl });
        toast.success('Picture uploaded and saved successfully!', { id: 'save-picture' });
      } else {
        toast.success('Picture uploaded successfully! It will be saved when you create the mentor.', { id: 'upload-picture' });
      }
    } catch (error) {
      const appError = handleError(error);
      logError('Error in handlePictureUpload', appError);
      toast.error(`Failed to upload picture: ${appError.message || 'Unknown error'}`, { id: 'upload-picture' });
      
      // Reset preview on error
      if (mentor?.picture) {
        setPicturePreview(mentor.picture);
      } else {
        setPicturePreview(null);
      }
    } finally {
      setUploadingPicture(false);
      // Clear the file input
      if (event.target) {
        event.target.value = '';
      }
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

  const [universityInput, setUniversityInput] = useState("");

  const addUniversity = () => {
    if (universityInput.trim()) {
      setFormData((prev) => {
        const current = prev.universities || [];
        if (!current.includes(universityInput.trim())) {
          return { ...prev, universities: [...current, universityInput.trim()] };
        }
        return prev;
      });
      setUniversityInput("");
    }
  };

  const removeUniversity = (university: string) => {
    setFormData((prev) => {
      const current = prev.universities || [];
      return { ...prev, universities: current.filter((u) => u !== university) };
    });
  };

  const handleSave = async () => {
    logInfo('Save button clicked', { mentor: mentor?.id });
    
    // Validation
    if (!formData.name || !formData.bio) {
      toast.error("Please fill in name and bio");
      return;
    }

    if (formData.hourly_rate < 10000) {
      toast.error("8 Week Coaching Program Fee must be at least $100");
      return;
    }

    try {
      setSaving(true);
      logInfo('Starting save operation');

      // Ensure all fields are explicitly included in the save payload
      const saveData: CreateMentorInput = {
        name: formData.name,
        bio: formData.bio,
        hourly_rate: formData.hourly_rate,
        hourly_rate_per_hour: formData.hourly_rate_per_hour || 0,
        currency: formData.currency || 'USD',
        picture: formData.picture || null,
        expertise: formData.expertise || [],
        universities: formData.universities || [], // Explicitly include universities
        is_active: formData.is_active !== undefined ? formData.is_active : true,
        is_featured: formData.is_featured !== undefined ? formData.is_featured : false,
        linkedin_url: formData.linkedin_url || null,
        twitter_x_url: formData.twitter_x_url || null,
        website_url: formData.website_url || null,
        calendly_url: formData.calendly_url || null,
      };

      // Debug: Log saveData to verify all fields are included
      logInfo('Saving mentor with data', {
        name: saveData.name,
        bioLength: saveData.bio.length,
        hourly_rate: saveData.hourly_rate,
        expertise: saveData.expertise?.length || 0,
        universities: saveData.universities?.length || 0,
        hasPicture: !!saveData.picture,
        is_active: saveData.is_active,
        is_featured: saveData.is_featured
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
    } catch (error) {
      const appError = handleError(error);
      logError('Error in handleSave', appError);
      toast.error(`Failed to save mentor: ${appError.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
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
                disabled={loading || saving || uploadingPicture}
              >
                {(loading || saving) ? (
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
                  <AvatarImage 
                    src={picturePreview || formData.picture || undefined} 
                    alt={formData.name || 'Mentor'}
                    className="object-cover"
                  />
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
                <div>
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={formData.website_url || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, website_url: e.target.value || null }))
                    }
                    placeholder="https://example.com"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional personal or company website URL
                  </p>
                </div>
                <div>
                  <Label htmlFor="calendly_url">Calendly URL *</Label>
                  <Input
                    id="calendly_url"
                    type="url"
                    value={formData.calendly_url || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, calendly_url: e.target.value || null }))
                    }
                    placeholder="https://calendly.com/username"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Required: Calendly link for discovery call bookings
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

              {/* Currency Selector */}
              <div>
                <Label htmlFor="currency" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Currency
                </Label>
                <Select
                  value={formData.currency || 'USD'}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, currency: value as MentorCurrency }))
                  }
                >
                  <SelectTrigger className="mt-1 w-full md:w-64">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} — {c.code} ({c.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Select the currency for both the hourly rate and 8-week coaching program fee.
                </p>
              </div>

              {/* Hourly Rate */}
              <div>
                <Label htmlFor="hourly_rate_per_hour" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Hourly Rate ({formData.currency || 'USD'})
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-muted-foreground">{getCurrencySymbol(formData.currency)}</span>
                  <Input
                    id="hourly_rate_per_hour"
                    type="number"
                    min="0"
                    step="10"
                    value={((formData.hourly_rate_per_hour || 0) / 100).toFixed(0)}
                    onChange={(e) => {
                      const dollars = parseFloat(e.target.value) || 0;
                      setFormData((prev) => ({
                        ...prev,
                        hourly_rate_per_hour: Math.round(dollars * 100),
                      }));
                    }}
                    placeholder="150"
                    className="flex-1"
                  />
                  <span className="text-muted-foreground text-sm">per hour</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the per-hour consulting rate (e.g., 150 for {getCurrencySymbol(formData.currency)}150/hour). Enter 0 if not offering hourly consulting.
                </p>
              </div>

              {/* 8 Week Coaching Program Fee */}
              <div>
                <Label htmlFor="hourly_rate" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  8 Week Coaching Program Fee ({formData.currency || 'USD'}) *
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-muted-foreground">{getCurrencySymbol(formData.currency)}</span>
                  <Input
                    id="hourly_rate"
                    type="number"
                    min="100"
                    step="50"
                    value={(formData.hourly_rate / 100).toFixed(0)}
                    onChange={(e) => {
                      const dollars = parseFloat(e.target.value) || 0;
                      setFormData((prev) => ({
                        ...prev,
                        hourly_rate: Math.round(dollars * 100),
                      }));
                    }}
                    placeholder="1000"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the 8-week coaching program fee (e.g., 1000 for {getCurrencySymbol(formData.currency)}1,000). Minimum: {getCurrencySymbol(formData.currency)}100
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

              {/* Universities */}
              <div>
                <Label>Universities</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="text"
                    value={universityInput}
                    onChange={(e) => setUniversityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addUniversity();
                      }
                    }}
                    placeholder="Enter university name (e.g., Harvard University)"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addUniversity}
                  >
                    Add
                  </Button>
                </div>
                {formData.universities && formData.universities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.universities.map((university) => (
                      <Badge
                        key={university}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {university}
                        <button
                          type="button"
                          onClick={() => removeUniversity(university)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Add universities or educational institutions the mentor attended.
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

