import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Mail, X } from "lucide-react";
import { EmailTemplate } from "@/types/insighta";
import { toast } from "sonner";

interface EmailTemplateModalProps {
  template: EmailTemplate | null;
  isOpen: boolean;
  onClose: () => void;
}

const EmailTemplateModal = ({ template, isOpen, onClose }: EmailTemplateModalProps) => {
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [subjectDraft, setSubjectDraft] = useState("");
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!template) return;
    const initialValues: Record<string, string> = {};
    template.variables.forEach((variable) => {
      initialValues[variable] = "";
    });
    setVariableValues(initialValues);
    setSubjectDraft(template.subject);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  }, [template?.id]);

  if (!template) return null;

  const applyReplacements = (text: string) => {
    return text.replace(/{{[^}]+}}/g, (match) => {
      const value = variableValues[match];
      return value && value.trim().length > 0 ? value : match;
    });
  };

  const handleCopyFull = () => {
    const subject = applyReplacements(subjectDraft || template.subject);
    const body = applyReplacements(template.body);
    const textToCopy = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(textToCopy).then(
      () => toast.success("Template copied to clipboard!"),
      () => toast.error("Failed to copy to clipboard")
    );
  };

  const handleCopySubject = () => {
    const subject = applyReplacements(subjectDraft || template.subject);
    navigator.clipboard.writeText(subject).then(
      () => toast.success("Subject copied to clipboard!"),
      () => toast.error("Failed to copy to clipboard")
    );
  };

  const handleVariableClick = (variable: string) => {
    const input = inputRefs.current[variable];
    if (input) {
      input.focus();
      input.select();
      input.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const renderEditableVariables = (text: string) => {
    const parts = text.split(/({{[^}]+}})/g);
    return parts.map((part, idx) => {
      if (part.match(/{{[^}]+}}/)) {
        const value = variableValues[part];
        const hasValue = value && value.trim().length > 0;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => handleVariableClick(part)}
            className={`inline-flex items-center rounded px-1 py-0.5 font-mono text-xs transition-colors ${
              hasValue
                ? "bg-success/10 text-success hover:bg-success/20"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            }`}
            title="Click to edit"
          >
            {hasValue ? value : part}
          </button>
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
              <p className="text-sm font-mono">{renderEditableVariables(subjectDraft || template.subject)}</p>
            </div>
            <div className="mt-3">
              <Label className="text-xs text-muted-foreground">Edit subject</Label>
              <Input
                value={subjectDraft}
                onChange={(event) => setSubjectDraft(event.target.value)}
                className="mt-1 text-sm"
              />
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
              <div className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                {renderEditableVariables(template.body)}
              </div>
            </div>
          </div>

          {/* Variables List */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Variables to Customize</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {template.variables.map((variable) => (
                <div key={variable} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{variable}</Label>
                  <Input
                    ref={(el) => {
                      inputRefs.current[variable] = el;
                    }}
                    value={variableValues[variable] || ""}
                    onChange={(event) =>
                      setVariableValues((prev) => ({
                        ...prev,
                        [variable]: event.target.value
                      }))
                    }
                    placeholder={`Enter ${variable.replace(/[{}]/g, "").replace(/_/g, " ")}`}
                    className="text-sm"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Click any highlighted placeholder in the template to jump to its input.
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
