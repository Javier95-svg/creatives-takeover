import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, FileDown } from "lucide-react";
import { toast } from "sonner";

interface ReportDownloadProps {
  report: string;
  title?: string;
}

const ReportDownload = ({ report, title = "Launch Report" }: ReportDownloadProps) => {
  const downloadAsText = () => {
    try {
      const blob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_').toLowerCase()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Report downloaded as text file!");
    } catch (error) {
      toast.error("Failed to download report. Please try again.");
    }
  };

  const downloadAsPDF = () => {
    try {
      // Convert markdown-style report to HTML for better PDF formatting
      const htmlContent = report
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$2</h2>')
        .replace(/^### (.*$)/gm, '<h3>$3</h3>')
        .replace(/^\*\*(.*)\*\*/gm, '<strong>$1</strong>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/```([^```]*)```/gm, '<pre>$1</pre>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              max-width: 800px; 
              margin: 0 auto; 
              padding: 20px; 
              color: #333;
            }
            h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
            h2 { color: #1e40af; margin-top: 30px; }
            h3 { color: #1e3a8a; margin-top: 20px; }
            pre { 
              background: #f8f9fa; 
              padding: 15px; 
              border-radius: 5px; 
              border-left: 4px solid #2563eb;
              overflow-x: auto;
            }
            li { margin-bottom: 5px; }
            strong { color: #1e40af; }
          </style>
        </head>
        <body>
          <p>${htmlContent}</p>
        </body>
        </html>
      `;

      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_').toLowerCase()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Report downloaded as HTML file! You can open it in your browser or convert to PDF.");
    } catch (error) {
      toast.error("Failed to download report. Please try again.");
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(report);
      toast.success("Report copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy report. Please try again.");
    }
  };

  if (!report) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Download Your Report
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={downloadAsText}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Download as Text
          </Button>
          
          <Button 
            onClick={downloadAsPDF}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" />
            Download as HTML
          </Button>
          
          <Button 
            onClick={copyToClipboard}
            variant="ghost"
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Copy to Clipboard
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground mt-3">
          Download your personalized launch report to save, share, or print. 
          The HTML version can be easily converted to PDF using your browser's print function.
        </p>
      </CardContent>
    </Card>
  );
};

export default ReportDownload;