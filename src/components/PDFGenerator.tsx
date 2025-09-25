import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  successScore?: any;
  className?: string;
}

const PDFGenerator: React.FC<PDFGeneratorProps> = ({ 
  reportContent, 
  businessName, 
  userAnswers, 
  successScore,
  className = "" 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      // Call the edge function to get formatted HTML
      const { data, error } = await supabase.functions.invoke('generate-pdf-report', {
        body: {
          reportContent,
          businessName,
          userAnswers,
          successScore
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success && data?.htmlContent) {
        // Create a temporary div with the HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = data.htmlContent;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.width = '210mm'; // A4 width
        tempDiv.style.backgroundColor = 'white';
        document.body.appendChild(tempDiv);

        try {
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

  return (
    <Button
      onClick={generatePDF}
      disabled={isGenerating}
      className={`bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white ${className}`}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Download PDF Report
        </>
      )}
    </Button>
  );
};

export default PDFGenerator;