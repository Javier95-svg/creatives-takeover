import React, { useState } from 'react';
import { CreditCostBadge } from "@/components/CreditCostTooltip";
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2, FileType } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import DOMPurify from 'dompurify';

interface SuccessScore {
  overall_score?: number;
  market_clarity_score?: number;
  problem_validation_score?: number;
  solution_strength_score?: number;
  [key: string]: number | string | undefined;
}

interface PDFGeneratorProps {
  reportContent: string;
  businessName: string;
  userAnswers: {
    overview: string;
    market: string;
    problem: string;
    solution: string;
    channels: string;
    pricing: string;
    goals: string;
  };
  successScore?: SuccessScore;
  validationScore?: {
    reddit_discussions?: any[];
  } | null;
  className?: string;
}

const PDFGenerator: React.FC<PDFGeneratorProps> = ({
  reportContent,
  businessName,
  userAnswers,
  successScore,
  validationScore,
  className = ""
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingWord, setIsGeneratingWord] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      // Call the edge function to get formatted HTML
      const { data, error } = await supabase.functions.invoke('generate-pdf-report', {
        body: {
          reportContent,
          businessName,
          userAnswers,
          successScore,
          validationScore
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success && data?.htmlContent) {
        // Sanitize HTML content before rendering
        const sanitizedHTML = DOMPurify.sanitize(data.htmlContent, {
          ALLOWED_TAGS: ['div', 'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
          ALLOWED_ATTR: ['class', 'style']
        });

        // Create a temporary div with the sanitized HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = sanitizedHTML;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.width = '210mm'; // A4 width
        tempDiv.style.backgroundColor = 'white';
        document.body.appendChild(tempDiv);

        try {
          // Lazy-load heavy libraries only when generating PDF to keep initial bundle small
          const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
            import('jspdf'),
            import('html2canvas'),
          ]);

          // Generate PDF using html2canvas and jsPDF
          const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: 794, // A4 width in pixels at 96 DPI
            height: 1123 // A4 height in pixels at 96 DPI
          });

          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
          });

          const imgWidth = 210; // A4 width in mm
          const pageHeight = 295; // A4 height in mm
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          let heightLeft = imgHeight;
          let position = 0;

          // Add first page
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;

          // Add additional pages if needed
          while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }

          // Download the PDF
          const fileName = `${businessName || 'Business'}_Launch_Report_${new Date().toISOString().split('T')[0]}.pdf`;
          pdf.save(fileName);

          toast.success('PDF report generated successfully!');
        } finally {
          // Clean up temporary div
          document.body.removeChild(tempDiv);
        }
      } else {
        throw new Error('Invalid response from PDF generation service');
      }

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateWord = async () => {
    setIsGeneratingWord(true);

    try {
      // Lazy-load docx library
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');

      // Convert markdown-style report to Word document structure
      const sections: any[] = [];

      // Add title
      sections.push(
        new Paragraph({
          text: `${businessName || 'Business'} Launch Report`,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        new Paragraph({
          text: `Generated on ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 }
        })
      );

      // Parse report content into sections
      const lines = reportContent.split('\n');
      let currentParagraph: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
          if (currentParagraph.length > 0) {
            sections.push(new Paragraph({
              text: currentParagraph.join(' '),
              spacing: { after: 200 }
            }));
            currentParagraph = [];
          }
          continue;
        }

        // Handle headers
        if (trimmed.startsWith('# ')) {
          if (currentParagraph.length > 0) {
            sections.push(new Paragraph({
              text: currentParagraph.join(' '),
              spacing: { after: 200 }
            }));
            currentParagraph = [];
          }
          sections.push(new Paragraph({
            text: trimmed.substring(2),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 }
          }));
        } else if (trimmed.startsWith('## ')) {
          if (currentParagraph.length > 0) {
            sections.push(new Paragraph({
              text: currentParagraph.join(' '),
              spacing: { after: 200 }
            }));
            currentParagraph = [];
          }
          sections.push(new Paragraph({
            text: trimmed.substring(3),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 150 }
          }));
        } else if (trimmed.startsWith('### ')) {
          if (currentParagraph.length > 0) {
            sections.push(new Paragraph({
              text: currentParagraph.join(' '),
              spacing: { after: 200 }
            }));
            currentParagraph = [];
          }
          sections.push(new Paragraph({
            text: trimmed.substring(4),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 150, after: 100 }
          }));
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          // Bullet points
          if (currentParagraph.length > 0) {
            sections.push(new Paragraph({
              text: currentParagraph.join(' '),
              spacing: { after: 200 }
            }));
            currentParagraph = [];
          }
          sections.push(new Paragraph({
            text: trimmed.substring(2),
            bullet: { level: 0 },
            spacing: { after: 100 }
          }));
        } else {
          // Regular text
          currentParagraph.push(trimmed);
        }
      }

      // Add remaining paragraph
      if (currentParagraph.length > 0) {
        sections.push(new Paragraph({
          text: currentParagraph.join(' '),
          spacing: { after: 200 }
        }));
      }

      // Add success scores if available
      if (successScore && Object.keys(successScore).length > 0) {
        sections.push(
          new Paragraph({
            text: 'Success Scores',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          })
        );

        Object.entries(successScore).forEach(([key, value]) => {
          if (typeof value === 'number') {
            sections.push(new Paragraph({
              text: `${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}%`,
              spacing: { after: 100 }
            }));
          }
        });
      }

      // Create document
      const doc = new Document({
        sections: [{
          properties: {},
          children: sections
        }]
      });

      // Generate and download
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${businessName || 'Business'}_Launch_Report_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Word document generated successfully!');
    } catch (error) {
      console.error('Error generating Word document:', error);
      toast.error('Failed to generate Word document. Please try again.');
    } finally {
      setIsGeneratingWord(false);
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row gap-2 ${className}`}>
      <Button
        onClick={generatePDF}
        disabled={isGenerating || isGeneratingWord}
        className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating PDF...
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
            <CreditCostBadge feature="PDF_EXPORT" className="ml-2 bg-white/20 text-white" />
          </>
        )}
      </Button>
      <Button
        onClick={generateWord}
        disabled={isGenerating || isGeneratingWord}
        variant="outline"
        className="border-2"
      >
        {isGeneratingWord ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating Word...
          </>
        ) : (
          <>
            <FileType className="w-4 h-4 mr-2" />
            Download Word
          </>
        )}
      </Button>
    </div>
  );
};

export default PDFGenerator;