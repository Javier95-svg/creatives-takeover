import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(255),
  linkedin_url: z.string().url("Invalid LinkedIn URL").max(500),
  portfolio_url: z.string().url("Invalid URL").max(500).optional().or(z.literal("")),
  cover_message: z.string().max(500, "Cover message must be less than 500 characters").optional(),
  cv_file: z.instanceof(File).refine((file) => file.size <= MAX_FILE_SIZE, {
    message: "File size must be less than 5MB",
  }).refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), {
    message: "Only PDF and DOC/DOCX files are accepted",
  }),
});

type FormData = z.infer<typeof formSchema>;

interface JobApplicationFormProps {
  isOpen: boolean;
  onClose: () => void;
  position: {
    id: string;
    title: string;
  } | null;
}

const JobApplicationForm = ({ isOpen, onClose, position }: JobApplicationFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { user } = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      linkedin_url: "",
      portfolio_url: "",
      cover_message: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!position) return;

    setIsSubmitting(true);
    try {
      // Upload CV file
      const fileExt = data.cv_file.name.split(".").pop();
      const fileName = `${user?.id || "guest"}_${Date.now()}.${fileExt}`;
      const filePath = `${user?.id || "guest"}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("cv-uploads")
        .upload(filePath, data.cv_file);

      if (uploadError) throw uploadError;

      // Create job application
      const { data: applicationData, error: insertError } = await supabase
        .from("job_applications")
        .insert({
          user_id: user?.id || null,
          position_id: position.id,
          name: data.name,
          email: data.email,
          linkedin_url: data.linkedin_url,
          portfolio_url: data.portfolio_url || null,
          cv_file_path: filePath,
          cover_message: data.cover_message || null,
          status: "pending",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Send notification email to admins
      try {
        await supabase.functions.invoke('notify-job-application', {
          body: {
            application_id: applicationData.id,
            position_title: position.title,
            applicant_name: data.name,
            applicant_email: data.email,
            linkedin_url: data.linkedin_url,
            portfolio_url: data.portfolio_url || null,
            cover_message: data.cover_message || 'No cover message provided'
          }
        });
      } catch (notifyError) {
        console.error('Notification error:', notifyError);
        // Don't fail the application if notification fails
      }

      setSubmitSuccess(true);
      toast({
        title: "Application Submitted!",
        description: "Thank you for applying. We'll review your application and get back to you soon.",
      });

      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSubmitSuccess(false);
    onClose();
  };

  if (!position) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply for {position.title}</DialogTitle>
          <DialogDescription>
            Fill out the form below to submit your application. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        {submitSuccess ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h3 className="text-xl font-semibold">Application Submitted!</h3>
            <p className="text-muted-foreground text-center">
              Thank you for your interest. We'll be in touch soon.
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="linkedin_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn Profile *</FormLabel>
                    <FormControl>
                      <Input placeholder="https://linkedin.com/in/yourprofile" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="portfolio_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portfolio/Website (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://yourportfolio.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cv_file"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Resume/CV * (PDF, DOC, DOCX - Max 5MB)</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer px-4 py-2 border border-input rounded-md hover:bg-accent transition-colors">
                          <Upload className="h-4 w-4" />
                          <span className="text-sm">
                            {value ? value.name : "Choose File"}
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) onChange(file);
                            }}
                            {...field}
                          />
                        </label>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cover_message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Message (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us why you're interested in this position..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default JobApplicationForm;
