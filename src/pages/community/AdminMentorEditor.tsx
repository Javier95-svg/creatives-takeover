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
import { useAdminRole } from "@/hooks/useAdminRole";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Loader2, ArrowLeft, Trash2, Upload, DollarSign, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mentor, CURRENCY_OPTIONS, MentorCurrency, getCurrencySymbol } from "@/types/mentor";
import { logInfo, logError, logWarn } from "@/lib/logger";
import { handleError } from "@/lib/errors";
import {
  getAdminMentorDiscoverySettings,
  createMentorAvailabilityAccess,
  updateAdminMentorDiscoverySettings,
} from "@/services/discoveryCallService";

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
  const { loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();
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
  const [discoverySettings, setDiscoverySettings] = useState({
    notificationEmail: "",
    enabled: false,
    legacyProvider: "other",
    legacyBookingUrl: "",
    bookingMode: "request" as 'request' | 'instant' | 'hybrid',
    schedulingTimezone: "UTC",
    minimumNoticeHours: 72,
    bookingWindowDays: 60,
    bufferMinutes: 0,
    allowRequestFallback: true,
    availabilityRules: [] as Array<{ weekday: number; startLocalTime: string; endLocalTime: string; enabled: boolean }>,
  });
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
    nationality: null,
  });

  useEffect(() => {
    if (authLoading || adminLoading) {
      return;
    }

    if (!isAdmin) {
      toast.error("Only admins can access this page");
      navigate("/mentorship", { replace: true });
      return;
    }

    if (id && id !== "new") {
      void loadMentor(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  }, [adminLoading, authLoading, id, isAdmin, navigate]);

  const loadMentor = async (mentorId: string) => {
    const [found, settingsResponse] = await Promise.all([
      fetchMentorById(mentorId),
      getAdminMentorDiscoverySettings(mentorId).catch(() => ({ success: false, settings: null })),
    ]);

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
        nationality: found.nationality || null,
      });
      if (found.picture) {
        setPicturePreview(found.picture);
      }
      if (settingsResponse.settings) {
        setDiscoverySettings({
          notificationEmail: settingsResponse.settings.notification_email,
          enabled: settingsResponse.settings.discovery_calls_enabled,
          legacyProvider: settingsResponse.settings.legacy_provider || 'other',
          legacyBookingUrl: settingsResponse.settings.legacy_booking_url || '',
          bookingMode: settingsResponse.settings.booking_mode || 'request',
          schedulingTimezone: settingsResponse.settings.scheduling_timezone || 'UTC',
          minimumNoticeHours: settingsResponse.settings.minimum_notice_hours ?? 72,
          bookingWindowDays: settingsResponse.settings.booking_window_days ?? 60,
          bufferMinutes: settingsResponse.settings.buffer_minutes ?? 0,
          allowRequestFallback: settingsResponse.settings.allow_request_fallback !== false,
          availabilityRules: (settingsResponse.settings.availability_rules ?? []).map((rule) => ({
            weekday: rule.weekday,
            startLocalTime: rule.start_local_time?.slice(0, 5) ?? '09:00',
            endLocalTime: rule.end_local_time?.slice(0, 5) ?? '17:00',
            enabled: rule.enabled,
          })),
        });
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
          .select('id, picture');

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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(discoverySettings.notificationEmail.trim())) {
      toast.error("A valid Discovery Call notification email is required");
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
        nationality: formData.nationality || null,
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
        const settingsResult = await updateAdminMentorDiscoverySettings({
          mentorId: result.id,
          notificationEmail: discoverySettings.notificationEmail.trim(),
          discoveryCallsEnabled: discoverySettings.enabled,
          bookingMode: discoverySettings.bookingMode,
          schedulingTimezone: discoverySettings.schedulingTimezone,
          minimumNoticeHours: discoverySettings.minimumNoticeHours,
          bookingWindowDays: discoverySettings.bookingWindowDays,
          bufferMinutes: discoverySettings.bufferMinutes,
          allowRequestFallback: discoverySettings.allowRequestFallback,
          availabilityRules: discoverySettings.availabilityRules,
          legacyProvider: discoverySettings.legacyProvider === 'manual' ? 'other' : discoverySettings.legacyProvider,
          legacyBookingUrl: discoverySettings.legacyBookingUrl.trim() || null,
        });
        if (!settingsResult.success) throw new Error(settingsResult.error || 'Mentor saved, but Discovery Call settings failed to save.');
        toast.success(mentor ? "Mentor updated!" : "Mentor created!");
        navigate(`/mentorship/mentors/${result.id}`);
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
        navigate("/mentorship");
      }
    }
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <h1 className="mt-4 text-xl font-semibold">Checking admin access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Mentor editing is restricted to admins.
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <h1 className="mt-4 text-xl font-semibold">Redirecting to mentors</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Admin editing is restricted, so this page is redirecting you back to the mentor marketplace.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-header-offset pb-16">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/mentorship">
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
                      className={uploadingPicture ? "pointer-events-none cursor-not-allowed opacity-50" : "cursor-pointer"}
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
                  <Label htmlFor="discovery_notification_email">Discovery Call notification email *</Label>
                  <Input id="discovery_notification_email" type="email" required value={discoverySettings.notificationEmail} onChange={(e) => setDiscoverySettings((current) => ({ ...current, notificationEmail: e.target.value }))} placeholder="mentor@example.com" className="mt-1" />
                  <p className="mt-1 text-xs text-muted-foreground">Private. Request and booking emails are delivered here.</p>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div><Label htmlFor="discovery_enabled">Discovery Calls enabled</Label><p className="text-xs text-muted-foreground">Allows founders to request a tracked, free 30-minute call.</p></div>
                  <Switch id="discovery_enabled" checked={discoverySettings.enabled} disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(discoverySettings.notificationEmail.trim())} onCheckedChange={(enabled) => setDiscoverySettings((current) => ({ ...current, enabled }))} />
                </div>
                <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                  <div><Label htmlFor="discovery_booking_mode">Booking mode</Label><Select value={discoverySettings.bookingMode} onValueChange={(bookingMode) => setDiscoverySettings((current) => ({ ...current, bookingMode: bookingMode as 'request' | 'instant' | 'hybrid' }))}><SelectTrigger id="discovery_booking_mode" className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="request">Three-time request</SelectItem><SelectItem value="instant">Instant availability</SelectItem><SelectItem value="hybrid">Instant + request fallback</SelectItem></SelectContent></Select></div>
                  <div><Label htmlFor="discovery_timezone">Scheduling timezone</Label><Input id="discovery_timezone" value={discoverySettings.schedulingTimezone} onChange={(e) => setDiscoverySettings((current) => ({ ...current, schedulingTimezone: e.target.value }))} placeholder="America/Bogota" className="mt-1" /></div>
                  <div><Label htmlFor="discovery_notice">Minimum notice (hours)</Label><Input id="discovery_notice" type="number" min={1} max={720} value={discoverySettings.minimumNoticeHours} onChange={(e) => setDiscoverySettings((current) => ({ ...current, minimumNoticeHours: Number(e.target.value) }))} className="mt-1" /></div>
                  <div><Label htmlFor="discovery_window">Booking window (days)</Label><Input id="discovery_window" type="number" min={1} max={60} value={discoverySettings.bookingWindowDays} onChange={(e) => setDiscoverySettings((current) => ({ ...current, bookingWindowDays: Number(e.target.value) }))} className="mt-1" /></div>
                  <div><Label htmlFor="discovery_buffer">Calendar buffer (minutes)</Label><Input id="discovery_buffer" type="number" min={0} max={120} value={discoverySettings.bufferMinutes} onChange={(e) => setDiscoverySettings((current) => ({ ...current, bufferMinutes: Number(e.target.value) }))} className="mt-1" /></div>
                  <div className="flex items-center justify-between rounded-lg border p-3"><div><Label htmlFor="discovery_fallback">Request fallback</Label><p className="text-xs text-muted-foreground">Allow three-time requests when no slot works.</p></div><Switch id="discovery_fallback" checked={discoverySettings.allowRequestFallback} onCheckedChange={(allowRequestFallback) => setDiscoverySettings((current) => ({ ...current, allowRequestFallback }))} /></div>
                  {mentor?.id && <div className="sm:col-span-2"><Button type="button" variant="outline" onClick={async () => { const response = await createMentorAvailabilityAccess(mentor.id); if (!response.success || !response.url) { toast.error(response.error || 'Unable to create secure availability link'); return; } await navigator.clipboard.writeText(response.url); toast.success('Secure 30-day mentor availability link copied'); }}>Copy secure mentor availability link</Button><p className="mt-1 text-xs text-muted-foreground">Send this private no-login link to the mentor so they can publish weekly hours, time off, and optionally connect Google Calendar.</p></div>}
                </div>
                <details className="rounded-lg border p-4">
                  <summary className="cursor-pointer font-medium">Legacy booking reference</summary>
                  <p className="my-3 text-xs text-muted-foreground">Retained for admin reference only. These values are never shown as founder booking actions.</p>
                  <Label htmlFor="legacy_provider">Provider</Label>
                  <Select value={discoverySettings.legacyProvider} onValueChange={(legacyProvider) => setDiscoverySettings((current) => ({ ...current, legacyProvider }))}><SelectTrigger id="legacy_provider" className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="calendly">Calendly</SelectItem><SelectItem value="koalendar">Koalendar</SelectItem><SelectItem value="google_calendar">Google Calendar</SelectItem><SelectItem value="cal_com">Cal.com</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select>
                  <Label htmlFor="legacy_booking_url" className="mt-3 block">Booking URL</Label>
                  <Input id="legacy_booking_url" type="url" value={discoverySettings.legacyBookingUrl} onChange={(e) => setDiscoverySettings((current) => ({ ...current, legacyBookingUrl: e.target.value }))} placeholder="https://…" className="mt-1" />
                </details>
                <div>
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nationality: e.target.value || null }))
                    }
                    placeholder="Hungary"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Country name or ISO code used to show the mentor flag
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
                        disabled={loading || saving || uploadingPicture}
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
                    disabled={loading || saving || uploadingPicture}
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
                          disabled={loading || saving || uploadingPicture}
                          className="ml-1 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
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
