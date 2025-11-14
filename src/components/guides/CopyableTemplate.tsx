import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CopyableTemplateProps {
  content: string;
  label?: string;
}

const CopyableTemplate = ({ content, label = "Copy to clipboard" }: CopyableTemplateProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Template copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative border rounded-lg p-4 bg-muted/50">
      <Button
        onClick={handleCopy}
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        <span className="ml-2 text-xs">{copied ? "Copied!" : label}</span>
      </Button>
      <pre className="text-sm whitespace-pre-wrap font-mono pr-20">
        {content}
      </pre>
    </div>
  );
};

export default CopyableTemplate;
