import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DownloadButtonProps {
  label: string;
  url: string;
  fileName?: string;
}

const DownloadButton = ({ label, url, fileName }: DownloadButtonProps) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || label;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button 
      onClick={handleDownload}
      variant="outline"
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
};

export default DownloadButton;
