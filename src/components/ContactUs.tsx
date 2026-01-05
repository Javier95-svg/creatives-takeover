import { useState } from "react";
import { Mail, Send, Clock, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ContactUs = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    reason: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Call the contact form submission edge function
      const { data, error } = await supabase.functions.invoke('contact-form-submission', {
        body: {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          reason: formData.reason,
          message: formData.message,
        },
      });

      if (error) {
        console.error('Error submitting contact form:', error);

        // Show fallback error message with admin email
        toast({
          variant: "destructive",
          title: "Oops! Something went wrong",
          description: (
            <div className="flex flex-col gap-2">
              <p>We couldn't send your message through the form.</p>
              <p className="text-sm">
                Please email us directly at{" "}
                <a
                  href="mailto:admin@creatives-takeover.com"
                  className="underline font-medium"
                >
                  admin@creatives-takeover.com
                </a>
              </p>
            </div>
          ),
        });
        setIsSubmitting(false);
        return;
      }

      // Success! Show confirmation message
      toast({
        title: (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Message sent successfully!
          </div>
        ),
        description: "We've received your message and will get back to you within 24 hours. Check your email for confirmation.",
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        role: "",
        reason: "",
        message: "",
      });

      setIsSubmitting(false);
    } catch (error) {
      console.error('Unexpected error:', error);

      // Show fallback error message
      toast({
        variant: "destructive",
        title: "Unable to send message",
        description: (
          <div className="flex flex-col gap-2">
            <p>There was a technical issue. Please try again or email us at:</p>
            <a
              href="mailto:admin@creatives-takeover.com"
              className="underline font-medium"
            >
              admin@creatives-takeover.com
            </a>
          </div>
        ),
      });

      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  return (
    <section
      id="contact-us"
      className="scroll-mt-24 py-20 relative overflow-hidden"
    >
      {/* Wallpaper Background - matching About page style */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />

        {/* Subtle circles */}
        <div
          className="absolute top-10 right-10 w-64 h-64 rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-3xl animate-pulse"
          style={{ animationDuration: "4s" }}
        />
        <div
          className="absolute bottom-20 left-20 w-80 h-80 rounded-full bg-gradient-to-br from-secondary/10 to-transparent blur-3xl animate-pulse"
          style={{ animationDuration: "5s", animationDelay: "1s" }}
        />

        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/70 to-background/90" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <header className="text-center max-w-3xl mx-auto mb-16 animate-slide-up">
          <h2 className="text-5xl font-bold mb-4 gradient-text animate-text-shimmer animate-fade-in leading-relaxed pb-2">
            Let's Build Together
          </h2>
          <p className="text-lg text-foreground/85 leading-relaxed mb-8">
            Whether you're a founder seeking support, an investor exploring
            partnerships, or a mentor wanting to give back—we'd love to hear
            from you. Join a community where collaboration drives innovation.
          </p>

          {/* Trust Signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-foreground/70">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>24-hour response time</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>Founder-led support</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Community-driven</span>
            </div>
          </div>
        </header>

        {/* Contact Form */}
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="glass border-border/60 p-8 md:p-10 animate-fade-in hover:shadow-xl hover:shadow-primary/10 transition-shadow duration-500"
          >
            <div className="space-y-6">
              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Full Name *
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="transition-all duration-300 focus:scale-[1.01]"
                />
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="transition-all duration-300 focus:scale-[1.01]"
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium">
                  I am a... *
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleSelectChange("role", value)}
                  required
                >
                  <SelectTrigger className="transition-all duration-300 focus:scale-[1.01]">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="founder">Founder / Entrepreneur</SelectItem>
                    <SelectItem value="angel_investor">Angel Investor</SelectItem>
                    <SelectItem value="vc">Venture Capitalist</SelectItem>
                    <SelectItem value="accelerator">Accelerator / Incubator</SelectItem>
                    <SelectItem value="mentor">Mentor / Advisor</SelectItem>
                    <SelectItem value="partner">Potential Partner</SelectItem>
                    <SelectItem value="media">Media / Press</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reason for Contact */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm font-medium">
                  Reason for Contact *
                </Label>
                <Select
                  value={formData.reason}
                  onValueChange={(value) => handleSelectChange("reason", value)}
                  required
                >
                  <SelectTrigger className="transition-all duration-300 focus:scale-[1.01]">
                    <SelectValue placeholder="What can we help you with?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Inquiry</SelectItem>
                    <SelectItem value="partnership">Partnership Opportunity</SelectItem>
                    <SelectItem value="investment">Investment Interest</SelectItem>
                    <SelectItem value="mentorship">Mentorship / Guidance</SelectItem>
                    <SelectItem value="support">Platform Support</SelectItem>
                    <SelectItem value="feedback">Feedback / Suggestions</SelectItem>
                    <SelectItem value="media">Media / Press Inquiry</SelectItem>
                    <SelectItem value="collaboration">Collaboration Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Message Textarea */}
              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-medium">
                  Your Message *
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Tell us more about what you're looking for..."
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="transition-all duration-300 focus:scale-[1.01] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Be as detailed as possible to help us provide the best response.
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-unified hover:opacity-90 text-primary-foreground font-semibold text-base h-12 relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-unified opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
              </Button>
            </div>
          </form>

          {/* Alternative Contact */}
          <div className="mt-8 text-center">
            <p className="text-sm text-foreground/70 mb-2">
              Prefer email? Reach us directly at
            </p>
            <a
              href="mailto:contact@creatives-takeover.com"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <Mail className="w-4 h-4" />
              contact@creatives-takeover.com
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactUs;
