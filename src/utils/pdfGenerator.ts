import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BusinessPlanData {
  businessName: string;
  tagline?: string;
  answers: Record<string, string>;
  currentStep: number;
  completedAt?: Date;
}

export const generateBusinessPlanPDF = async (data: BusinessPlanData): Promise<void> => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 20;

    // Helper function to add new page if needed
    const checkAndAddPage = (requiredSpace: number) => {
      if (currentY + requiredSpace > pageHeight - 20) {
        doc.addPage();
        currentY = 20;
        return true;
      }
      return false;
    };

    // Helper function to add text with word wrap
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number = 7) => {
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        checkAndAddPage(lineHeight);
        doc.text(line, x, y);
        y += lineHeight;
      });
      return y;
    };

    // --- COVER PAGE ---
    // Background gradient effect (simulated with rectangles)
    doc.setFillColor(79, 70, 229); // Primary color
    doc.rect(0, 0, pageWidth, 80, 'F');
    
    // Business name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    const businessName = data.businessName || 'My Business Plan';
    doc.text(businessName, pageWidth / 2, 40, { align: 'center' });
    
    // Tagline if provided
    if (data.tagline) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'italic');
      doc.text(data.tagline, pageWidth / 2, 55, { align: 'center' });
    }
    
    // Date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const dateStr = data.completedAt 
      ? data.completedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(dateStr, pageWidth / 2, 70, { align: 'center' });
    
    // Decorative line
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(40, 85, pageWidth - 40, 85);
    
    // Branding
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Created with Creatives Takeover BizMap AI', pageWidth / 2, pageHeight - 30, { align: 'center' });
    doc.text('www.creativestakeover.com', pageWidth / 2, pageHeight - 20, { align: 'center' });
    
    // Main content illustration
    doc.setTextColor(79, 70, 229);
    doc.setFontSize(60);
    doc.text('🚀', pageWidth / 2, 140, { align: 'center' });
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Business Plan Document', pageWidth / 2, 170, { align: 'center' });

    // --- TABLE OF CONTENTS ---
    doc.addPage();
    currentY = 30;
    
    doc.setTextColor(79, 70, 229);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Table of Contents', 20, currentY);
    currentY += 15;
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    const sections = [
      '1. Executive Summary',
      '2. Business Overview',
      '3. Target Market Analysis',
      '4. Problem & Solution',
      '5. Marketing Strategy',
      '6. Pricing & Revenue Model',
      '7. Goals & Timeline',
      '8. Next Steps'
    ];
    
    sections.forEach(section => {
      doc.text(section, 30, currentY);
      currentY += 10;
    });

    // --- SECTION 1: EXECUTIVE SUMMARY ---
    doc.addPage();
    currentY = 30;
    
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 20, pageWidth, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', 20, 30);
    
    currentY = 50;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const executiveSummary = `This business plan outlines the strategic direction for ${businessName}. ` +
      `The document provides a comprehensive overview of the business model, target market, ` +
      `competitive positioning, and financial projections. This plan serves as a roadmap for ` +
      `execution and a tool for securing stakeholder buy-in.`;
    
    currentY = addWrappedText(executiveSummary, 20, currentY, pageWidth - 40);

    // --- SECTION 2: BUSINESS OVERVIEW ---
    checkAndAddPage(40);
    currentY += 15;
    
    doc.setFillColor(79, 70, 229);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Business Overview', 20, currentY);
    currentY += 12;
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    if (data.answers.businessIdea) {
      doc.setFont('helvetica', 'bold');
      doc.text('Business Concept:', 20, currentY);
      currentY += 7;
      doc.setFont('helvetica', 'normal');
      currentY = addWrappedText(data.answers.businessIdea, 20, currentY, pageWidth - 40);
      currentY += 5;
    }
    
    if (data.answers.industry) {
      checkAndAddPage(15);
      doc.setFont('helvetica', 'bold');
      doc.text('Industry:', 20, currentY);
      currentY += 7;
      doc.setFont('helvetica', 'normal');
      currentY = addWrappedText(data.answers.industry, 20, currentY, pageWidth - 40);
      currentY += 5;
    }

    // --- SECTION 3: TARGET MARKET ---
    checkAndAddPage(40);
    currentY += 10;
    
    doc.setFillColor(79, 70, 229);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Target Market Analysis', 20, currentY);
    currentY += 12;
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(11);
    
    if (data.answers.targetMarket) {
      doc.setFont('helvetica', 'bold');
      doc.text('Primary Audience:', 20, currentY);
      currentY += 7;
      doc.setFont('helvetica', 'normal');
      currentY = addWrappedText(data.answers.targetMarket, 20, currentY, pageWidth - 40);
      currentY += 5;
    }

    // --- SECTION 4: PROBLEM & SOLUTION ---
    checkAndAddPage(40);
    currentY += 10;
    
    doc.setFillColor(79, 70, 229);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Problem & Solution', 20, currentY);
    currentY += 12;
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(11);
    
    if (data.answers.problem) {
      doc.setFont('helvetica', 'bold');
      doc.text('Problem Statement:', 20, currentY);
      currentY += 7;
      doc.setFont('helvetica', 'normal');
      currentY = addWrappedText(data.answers.problem, 20, currentY, pageWidth - 40);
      currentY += 5;
    }
    
    if (data.answers.solution) {
      checkAndAddPage(15);
      doc.setFont('helvetica', 'bold');
      doc.text('Our Solution:', 20, currentY);
      currentY += 7;
      doc.setFont('helvetica', 'normal');
      currentY = addWrappedText(data.answers.solution, 20, currentY, pageWidth - 40);
      currentY += 5;
    }

    // --- SECTION 5: MARKETING STRATEGY ---
    checkAndAddPage(40);
    currentY += 10;
    
    doc.setFillColor(79, 70, 229);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('4. Marketing Strategy', 20, currentY);
    currentY += 12;
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const marketingContent = data.answers.marketing || 
      'Marketing strategy to be developed based on target market analysis and competitive positioning.';
    currentY = addWrappedText(marketingContent, 20, currentY, pageWidth - 40);

    // --- SECTION 6: PRICING ---
    checkAndAddPage(40);
    currentY += 10;
    
    doc.setFillColor(79, 70, 229);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('5. Pricing & Revenue Model', 20, currentY);
    currentY += 12;
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(11);
    
    if (data.answers.pricing) {
      doc.setFont('helvetica', 'bold');
      doc.text('Pricing Strategy:', 20, currentY);
      currentY += 7;
      doc.setFont('helvetica', 'normal');
      currentY = addWrappedText(data.answers.pricing, 20, currentY, pageWidth - 40);
    }

    // --- SECTION 7: GOALS ---
    checkAndAddPage(40);
    currentY += 10;
    
    doc.setFillColor(79, 70, 229);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('6. Goals & Timeline', 20, currentY);
    currentY += 12;
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(11);
    
    if (data.answers.goals) {
      doc.setFont('helvetica', 'bold');
      doc.text('Primary Goals:', 20, currentY);
      currentY += 7;
      doc.setFont('helvetica', 'normal');
      currentY = addWrappedText(data.answers.goals, 20, currentY, pageWidth - 40);
    }

    // --- SECTION 8: NEXT STEPS ---
    checkAndAddPage(60);
    currentY += 10;
    
    doc.setFillColor(79, 70, 229);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('7. Next Steps', 20, currentY);
    currentY += 12;
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const nextSteps = [
      '1. Validate assumptions through customer interviews and market research',
      '2. Build minimum viable product (MVP) with core features',
      '3. Conduct beta testing with early adopters',
      '4. Refine product based on feedback and metrics',
      '5. Launch marketing campaigns targeting primary audience',
      '6. Monitor key performance indicators and iterate'
    ];
    
    nextSteps.forEach(step => {
      checkAndAddPage(10);
      doc.text(step, 25, currentY);
      currentY += 8;
    });

    // Footer on last page
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'This document is confidential and intended for internal use only.',
      pageWidth / 2,
      pageHeight - 15,
      { align: 'center' }
    );

    // Save the PDF
    const fileName = `${businessName.replace(/[^a-z0-9]/gi, '_')}_Business_Plan_${Date.now()}.pdf`;
    doc.save(fileName);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};
