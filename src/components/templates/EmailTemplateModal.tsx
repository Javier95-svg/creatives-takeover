import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Mail, X } from "lucide-react";
import { EmailTemplate } from "@/types/insighta";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";

interface EmailTemplateModalProps {
  template: EmailTemplate | null;
  isOpen: boolean;
  onClose: () => void;
}

const EmailTemplateModal = ({ template, isOpen, onClose }: EmailTemplateModalProps) => {
  const { copyToClipboard } = useEmailTemplates();

  if (!template) return null;

  const handleCopyFull = () => {
    copyToClipboard(template, false);
  };

  const handleCopySubject = () => {
    copyToClipboard(template, true);
  };

  // Highlight variables in text
  const highlightVariables = (text: string) => {
    const parts = text.split(/({{[^}]+}})/g);
    return parts.map((part, idx) => {
      if (part.match(/{{[^}]+}}/)) {
        return (
          <span key={idx} className="bg-primary/10 text-primary px-1 rounded font-mono text-sm">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-2xl mb-2">{template.title}</DialogTitle>
              <DialogDescription className="text-base">
                {template.useCase}
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="outline" className="capitalize">
              {template.category.replace('-', ' ')}
            </Badge>
            {template.tags.map((tag, idx) => (
              <Badge key={idx} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Subject Line */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Subject Line</h3>
              <Button variant="outline" size="sm" onClick={handleCopySubject}>
                <Copy className="h-3 w-3 mr-1" />
                Copy Subject
              </Button>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-mono">{highlightVariables(template.subject)}</p>
            </div>
          </div>

          {/* Email Body */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Email Body</h3>
              <Button onClick={handleCopyFull}>
                <Copy className="h-3 w-3 mr-1" />
                Copy Full Template
              </Button>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                {highlightVariables(template.body)}
              </pre>
            </div>
          </div>

          {/* Variables List */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Variables to Customize</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {template.variables.map((variable, idx) => (
                <div key={idx} className="p-2 bg-primary/5 rounded border border-primary/20">
                  <code className="text-xs text-primary">{variable}</code>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Replace these placeholders with your actual information before sending.
            </p>
          </div>

          {/* Usage Tips */}
          <div className="border-t pt-4">
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-primary mt-1" />
              <div>
                <h4 className="font-semibold text-sm mb-1">Usage Tips</h4>
                <p className="text-sm text-muted-foreground">{template.useCase}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailTemplateModal;
