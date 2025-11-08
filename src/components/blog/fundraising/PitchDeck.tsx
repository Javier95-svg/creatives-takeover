import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FileText, Download, Trash2, Copy, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";

const PitchDeck = () => {
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [businessDescription, setBusinessDescription] = useState("");
  const [generatedPitch, setGeneratedPitch] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const templates = [
    { id: 1, name: "Standard Deck", description: "Complete 15-slide pitch deck with all essential sections", icon: "📊" },
    { id: 2, name: "Quick Pitch", description: "Concise 5-slide deck for quick meetings and email introductions", icon: "⚡" },
    { id: 3, name: "Technical Pitch", description: "Deep-dive deck focusing on technology and implementation", icon: "🔧" }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file");
        return;
      }
      setUploadedFile({ name: file.name, size: file.size });
      toast.success("Pitch deck uploaded successfully");
    }
  };

  const handleDeleteFile = () => {
    setUploadedFile(null);
    toast.success("File removed");
  };

  const handleDownloadTemplate = (templateName: string) => {
    toast.success("Downloading " + templateName + "...");
  };

  const handleGeneratePitch = async () => {
    if (!businessDescription.trim()) {
      toast.error("Please enter a business description");
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      const pitch = "Elevator Pitch:\n\nWe help " + businessDescription.toLowerCase().substring(0, 100) + "...\n\nOur solution addresses a critical market need by providing innovative approaches that save time, reduce costs, and increase efficiency. We\'re targeting a significant market opportunity with a unique value proposition.\n\nKey Highlights:\n• Solving real pain points for our target customers\n• Scalable business model with clear path to profitability\n• Strong team with domain expertise\n• Early traction and positive customer feedback\n\nWe\'re raising capital to accelerate growth and achieve key milestones.";
      setGeneratedPitch(pitch);
      setIsGenerating(false);
      toast.success("Elevator pitch generated!");
    }, 1500);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedPitch);
    toast.success("Copied to clipboard!");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Your Pitch Deck</h3>
        {uploadedFile ? (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(uploadedFile.size)}</p>
                  </div>
                </div>
                <Button variant="destructive" size="sm" onClick={handleDeleteFile}>
                  <Trash2 className="w-4 h-4 mr-2" />Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-dashed bg-muted/20">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h4 className="text-lg font-semibold mb-2">Upload Your Pitch Deck</h4>
                <p className="text-sm text-muted-foreground mb-4">PDF files only, maximum 50MB</p>
                <label htmlFor="pitch-deck-upload">
                  <Button asChild><span><Upload className="w-4 h-4 mr-2" />Choose File</span></Button>
                </label>
                <Input id="pitch-deck-upload" type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Pitch Deck Templates</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="text-4xl mb-2">{template.icon}</div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription className="text-sm">{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" onClick={() => handleDownloadTemplate(template.name)}>
                  <Download className="w-4 h-4 mr-2" />Download Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Elevator Pitch Generator</h3>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />AI-Powered Pitch Creation
            </CardTitle>
            <CardDescription>Describe your business and we will generate a compelling elevator pitch</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Business Description <span className="text-muted-foreground ml-2">({businessDescription.length}/500)</span>
              </label>
              <Textarea value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value.slice(0, 500))} placeholder="Describe your business, target market, problem you are solving, and your unique solution..." rows={5} className="resize-none" />
            </div>
            <Button onClick={handleGeneratePitch} disabled={isGenerating || !businessDescription.trim()} className="w-full">
              {isGenerating ? <><Sparkles className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate Elevator Pitch</>}
            </Button>
            {generatedPitch && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Generated Pitch</label>
                  <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
                    <Copy className="w-4 h-4 mr-2" />Copy
                  </Button>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm font-sans">{generatedPitch}</pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PitchDeck;
