import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Download, Mail, Check } from 'lucide-react';
import { toast } from 'sonner';

interface EmailPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  email: {
    subject: string;
    subject_variations: string[];
    body: string;
  };
  investorName?: string;
  investorEmail?: string;
}

export const EmailPreview: React.FC<EmailPreviewProps> = ({
  isOpen,
  onClose,
  email,
  investorName,
  investorEmail
}) => {
  const [selectedSubject, setSelectedSubject] = useState(email.subject);
  const [editedBody, setEditedBody] = useState(email.body);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const fullEmail = `Subject: ${selectedSubject}\n\n${editedBody}`;
    navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    toast.success('Email copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const fullEmail = `Subject: ${selectedSubject}\n\n${editedBody}`;
    const blob = new Blob([fullEmail], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-to-${investorName?.toLowerCase().replace(/\s+/g, '-') || 'investor'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Email downloaded!');
  };

  const handleSendEmail = () => {
    if (investorEmail) {
      const mailtoLink = `mailto:${investorEmail}?subject=${encodeURIComponent(selectedSubject)}&body=${encodeURIComponent(editedBody)}`;
      window.location.href = mailtoLink;
    } else {
      toast.info('Investor email not available. Please copy the email and send manually.');
      handleCopy();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generated Cold Email</DialogTitle>
          <DialogDescription>
            Review and customize your email before sending to {investorName || 'the investor'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Subject Line Selection */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger id="subject">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {email.subject_variations.map((subj, index) => (
                  <SelectItem key={index} value={subj}>
                    {subj}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose from {email.subject_variations.length} subject line variations
            </p>
          </div>

          {/* Custom Subject Input (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="custom-subject">Or Enter Custom Subject</Label>
            <Input
              id="custom-subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              placeholder="Enter custom subject line"
            />
          </div>

          {/* Email Body Editor */}
          <div className="space-y-2">
            <Label htmlFor="body">Email Body</Label>
            <Textarea
              id="body"
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Word count: {editedBody.split(/\s+/).filter(Boolean).length} words
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>

            <Button
              onClick={handleDownload}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download as Text
            </Button>

            {investorEmail && (
              <Button
                onClick={handleSendEmail}
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Open in Email Client
              </Button>
            )}

            <Button
              onClick={onClose}
              variant="secondary"
              className="ml-auto"
            >
              Done
            </Button>
          </div>

          {/* Tips */}
          <div className="mt-4 p-3 rounded-md bg-muted/50 text-sm">
            <p className="font-medium mb-2">Tips for sending:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Personalize the opening line with a specific detail about the investor</li>
              <li>Keep the email under 150 words for better response rates</li>
              <li>Follow up after 7-10 days if no response</li>
              <li>Test different subject lines with A/B testing if sending to multiple investors</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

