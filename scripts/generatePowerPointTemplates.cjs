// Script to generate enhanced PowerPoint templates with professional design
const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

// Ensure public/templates directory exists
const templatesDir = path.join(__dirname, '../public/templates');
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

// Professional color palette
const colors = {
  primary: '0B1437',      // Dark blue
  accent: '38BDF8',       // Light blue
  success: '10B981',      // Green
  warning: 'F59E0B',      // Orange
  text: '1F2937',         // Dark gray
  textLight: '6B7280',    // Medium gray
  background: 'F9FAFB',   // Light gray
  white: 'FFFFFF'
};

// Helper function to create slide with consistent design
function createContentSlide(pptx, title, subtitle, content, options = {}) {
  const slide = pptx.addSlide();

  // Background gradient
  slide.background = { color: colors.white };

  // Add colored top bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: '100%',
    h: 0.15,
    fill: { color: colors.primary }
  });

  // Add title
  slide.addText(title, {
    x: 0.5,
    y: 0.4,
    w: 9,
    h: 0.6,
    fontSize: 36,
    bold: true,
    color: colors.primary,
    fontFace: 'Calibri'
  });

  // Add subtitle if provided
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5,
      y: 1.0,
      w: 9,
      h: 0.4,
      fontSize: 18,
      color: colors.accent,
      italic: true,
      fontFace: 'Calibri'
    });
  }

  // Add content based on type
  const contentY = subtitle ? 1.6 : 1.3;

  if (Array.isArray(content)) {
    // Bullet points with enhanced formatting
    const bullets = content.map(item => ({
      text: item.text,
      options: {
        bullet: { code: '2022' },
        fontSize: item.fontSize || 18,
        color: item.color || colors.text,
        bold: item.bold || false,
        indentLevel: item.indent || 0
      }
    }));

    slide.addText(bullets, {
      x: 0.8,
      y: contentY,
      w: 8.4,
      h: 5.0,
      fontFace: 'Calibri',
      lineSpacing: 32,
      valign: 'top'
    });
  } else if (typeof content === 'object' && content.sections) {
    // Multi-section content
    let currentY = contentY;
    content.sections.forEach(section => {
      if (section.heading) {
        slide.addText(section.heading, {
          x: 0.8,
          y: currentY,
          w: 8.4,
          h: 0.4,
          fontSize: 20,
          bold: true,
          color: colors.accent,
          fontFace: 'Calibri'
        });
        currentY += 0.5;
      }

      if (section.bullets) {
        const bullets = section.bullets.map(text => ({
          text,
          options: { bullet: { code: '2022' } }
        }));

        slide.addText(bullets, {
          x: 1.0,
          y: currentY,
          w: 8.2,
          h: section.bullets.length * 0.5,
          fontSize: 16,
          color: colors.text,
          fontFace: 'Calibri',
          lineSpacing: 28
        });
        currentY += (section.bullets.length * 0.5) + 0.3;
      }
    });
  }

  // Add decorative element
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.5,
    y: 6.8,
    w: 0.1,
    h: 0.4,
    fill: { color: colors.accent }
  });

  // Add footer
  slide.addText('Creatives Takeover', {
    x: 0.7,
    y: 6.85,
    w: 3,
    h: 0.3,
    fontSize: 11,
    color: colors.textLight,
    fontFace: 'Calibri'
  });

  slide.addText(`${options.slideNumber || ''}`, {
    x: 9.2,
    y: 6.85,
    w: 0.3,
    h: 0.3,
    fontSize: 11,
    color: colors.textLight,
    align: 'right',
    fontFace: 'Calibri'
  });

  return slide;
}

// Template: Problem-Solution Framework
function createProblemSolutionTemplate() {
  const pptx = new PptxGenJS();
  pptx.author = 'Creatives Takeover';
  pptx.title = 'Problem-Solution Framework';
  pptx.layout = 'LAYOUT_WIDE';

  // Slide 1: Cover
  const cover = pptx.addSlide();
  cover.background = { fill: colors.primary };

  cover.addText('Problem-Solution Framework', {
    x: 0.5, y: 2.0, w: 9, h: 1.2,
    fontSize: 54, bold: true, color: colors.white, align: 'center', fontFace: 'Calibri'
  });
  cover.addText('A Classic Pitch Deck Structure', {
    x: 0.5, y: 3.3, w: 9, h: 0.6,
    fontSize: 24, color: colors.accent, align: 'center', fontFace: 'Calibri'
  });
  cover.addText('[Your Company Name]', {
    x: 0.5, y: 4.5, w: 9, h: 0.5,
    fontSize: 20, color: colors.white, align: 'center', fontFace: 'Calibri', italic: true
  });
  cover.addText('Editable PowerPoint Template | Created by Creatives Takeover', {
    x: 0.5, y: 6.5, w: 9, h: 0.3,
    fontSize: 12, color: 'AAAAAA', align: 'center', fontFace: 'Calibri'
  });

  // Slide 2: Problem
  createContentSlide(pptx, 'The Problem', 'What pain point are you solving?', [
    { text: 'Define the problem in clear, relatable terms', bold: true },
    { text: 'Example: "Small businesses waste 20 hours per week on manual invoicing"', indent: 1, color: colors.textLight },
    { text: 'Quantify the impact (time lost, money wasted, opportunities missed)' },
    { text: 'Example: "This costs them $50,000 annually in lost productivity"', indent: 1, color: colors.textLight },
    { text: 'Tell a story that investors can visualize' },
    { text: 'Example: "Meet Sarah, a bakery owner who spends her weekends chasing late payments instead of with her family"', indent: 1, color: colors.textLight },
    { text: 'Avoid jargon - make it universally understood' }
  ], { slideNumber: 2 });

  // Slide 3: Solution
  createContentSlide(pptx, 'Our Solution', 'How we solve this problem differently', [
    { text: 'Explain your core solution in one sentence', bold: true },
    { text: 'Example: "We automate invoicing and payment tracking in under 5 minutes"', indent: 1, color: colors.textLight },
    { text: 'Focus on benefits, not features' },
    { text: '✗ Bad: "Our AI-powered platform uses machine learning algorithms"', indent: 1, color: 'DC2626' },
    { text: '✓ Good: "Get paid 60% faster without lifting a finger"', indent: 1, color: colors.success },
    { text: 'Show the transformation: before vs. after' },
    { text: 'Keep it simple - your grandmother should understand it' }
  ], { slideNumber: 3 });

  // Slide 4: Market Opportunity
  const marketSlide = pptx.addSlide();
  marketSlide.background = { color: colors.white };
  marketSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.15, fill: { color: colors.primary } });

  marketSlide.addText('Market Opportunity', {
    x: 0.5, y: 0.4, w: 9, h: 0.6,
    fontSize: 36, bold: true, color: colors.primary, fontFace: 'Calibri'
  });

  marketSlide.addText('How big is this opportunity?', {
    x: 0.5, y: 1.0, w: 9, h: 0.4,
    fontSize: 18, color: colors.accent, italic: true, fontFace: 'Calibri'
  });

  // TAM/SAM/SOM boxes
  const marketData = [
    { label: 'TAM', value: '$XX Billion', desc: 'Total Addressable Market', color: '3B82F6', y: 1.8 },
    { label: 'SAM', value: '$X Billion', desc: 'Serviceable Available Market', color: colors.accent, y: 3.2 },
    { label: 'SOM', value: '$XX Million', desc: 'Serviceable Obtainable Market', color: colors.success, y: 4.6 }
  ];

  marketData.forEach(item => {
    marketSlide.addShape(pptx.ShapeType.rect, {
      x: 0.8, y: item.y, w: 8.4, h: 1.0,
      fill: { color: item.color, transparency: 10 },
      line: { color: item.color, width: 2 }
    });
    marketSlide.addText(item.label, {
      x: 1.0, y: item.y + 0.15, w: 2, h: 0.6,
      fontSize: 24, bold: true, color: item.color, fontFace: 'Calibri'
    });
    marketSlide.addText(item.value, {
      x: 3.5, y: item.y + 0.15, w: 2, h: 0.6,
      fontSize: 24, bold: true, color: colors.text, fontFace: 'Calibri'
    });
    marketSlide.addText(item.desc, {
      x: 6.0, y: item.y + 0.25, w: 3, h: 0.4,
      fontSize: 14, color: colors.textLight, fontFace: 'Calibri'
    });
  });

  marketSlide.addText('Include: Market growth rate, trends, and credible sources (Gartner, IDC, etc.)', {
    x: 0.8, y: 6.0, w: 8.4, h: 0.4,
    fontSize: 14, color: colors.textLight, italic: true, fontFace: 'Calibri'
  });

  // Slide 5: Product
  createContentSlide(pptx, 'Product', 'What we built and why it matters', [
    { text: 'Core Features & Benefits', bold: true, fontSize: 20, color: colors.accent },
    { text: 'Feature 1: [Name] - Benefit: [How it helps users]', indent: 1 },
    { text: 'Example: "One-click invoicing - Create professional invoices in seconds"', indent: 2, fontSize: 16, color: colors.textLight },
    { text: 'Feature 2: [Name] - Benefit: [How it helps users]', indent: 1 },
    { text: 'Feature 3: [Name] - Benefit: [How it helps users]', indent: 1 },
    { text: '', fontSize: 8 },
    { text: 'How It Works (simplified)', bold: true, fontSize: 20, color: colors.accent },
    { text: 'Step 1 → Step 2 → Step 3 → Result', indent: 1 },
    { text: '', fontSize: 8 },
    { text: 'Unique Value Proposition', bold: true, fontSize: 20, color: colors.accent },
    { text: 'What makes you 10x better than alternatives?', indent: 1 }
  ], { slideNumber: 5 });

  // Slide 6: Traction
  createContentSlide(pptx, 'Traction & Proof', 'Evidence that customers want this', [
    { text: 'Key Metrics (replace with your actual numbers)', bold: true, fontSize: 20, color: colors.accent },
    { text: '• X,XXX users/customers', indent: 1, fontSize: 20, color: colors.success },
    { text: '• $XXX,XXX in revenue (MRR/ARR)', indent: 1, fontSize: 20, color: colors.success },
    { text: '• XX% month-over-month growth', indent: 1, fontSize: 20, color: colors.success },
    { text: '', fontSize: 8 },
    { text: 'Milestones Achieved', bold: true, fontSize: 20, color: colors.accent },
    { text: 'Product launch, first paying customer, key partnerships, etc.', indent: 1 },
    { text: '', fontSize: 8 },
    { text: 'Social Proof', bold: true, fontSize: 20, color: colors.accent },
    { text: 'Customer testimonials, logos of recognizable clients, case study results', indent: 1 }
  ], { slideNumber: 6 });

  // Slide 7: Business Model
  createContentSlide(pptx, 'Business Model', 'How we make money sustainably', [
    { text: 'Revenue Streams', bold: true, fontSize: 20, color: colors.accent },
    { text: 'Primary: [e.g., Monthly subscription at $XX/month]', indent: 1 },
    { text: 'Secondary: [e.g., Premium features, enterprise plans]', indent: 1 },
    { text: '', fontSize: 8 },
    { text: 'Unit Economics', bold: true, fontSize: 20, color: colors.accent },
    { text: 'Customer Acquisition Cost (CAC): $XXX', indent: 1 },
    { text: 'Lifetime Value (LTV): $X,XXX', indent: 1 },
    { text: 'LTV:CAC Ratio: X:1 (aim for 3:1 or higher)', indent: 1, color: colors.textLight },
    { text: 'Payback Period: X months (aim for <12 months)', indent: 1, color: colors.textLight },
    { text: '', fontSize: 8 },
    { text: 'Gross Margin: XX% (aim for >70% for software)', bold: true, fontSize: 18 }
  ], { slideNumber: 7 });

  // Slide 8: Competition
  const compSlide = pptx.addSlide();
  compSlide.background = { color: colors.white };
  compSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.15, fill: { color: colors.primary } });

  compSlide.addText('Competitive Landscape', {
    x: 0.5, y: 0.4, w: 9, h: 0.6,
    fontSize: 36, bold: true, color: colors.primary, fontFace: 'Calibri'
  });

  compSlide.addText('How we compare and differentiate', {
    x: 0.5, y: 1.0, w: 9, h: 0.4,
    fontSize: 18, color: colors.accent, italic: true, fontFace: 'Calibri'
  });

  // Competition matrix (simple table)
  const competitors = [
    { name: 'Your Company', feat1: '✓', feat2: '✓', feat3: '✓', price: '$X', highlight: true },
    { name: 'Competitor A', feat1: '✓', feat2: '✗', feat3: '✗', price: '$XX' },
    { name: 'Competitor B', feat1: '✗', feat2: '✓', feat3: '✗', price: '$XXX' },
    { name: 'Legacy Solution', feat1: '✗', feat2: '✗', feat3: '✓', price: '$XXX+' }
  ];

  const tableY = 2.0;
  const colWidth = 1.6;
  const rowHeight = 0.6;

  // Headers
  const headers = ['', 'Feature 1', 'Feature 2', 'Feature 3', 'Price'];
  headers.forEach((header, i) => {
    compSlide.addText(header, {
      x: 0.8 + (i * colWidth), y: tableY, w: colWidth, h: rowHeight,
      fontSize: 14, bold: true, color: colors.white, align: 'center',
      fill: { color: colors.primary }, valign: 'middle', fontFace: 'Calibri'
    });
  });

  // Rows
  competitors.forEach((comp, rowIdx) => {
    const y = tableY + ((rowIdx + 1) * rowHeight);
    const bgColor = comp.highlight ? 'E0F2FE' : colors.white;

    [comp.name, comp.feat1, comp.feat2, comp.feat3, comp.price].forEach((val, colIdx) => {
      compSlide.addText(val, {
        x: 0.8 + (colIdx * colWidth), y, w: colWidth, h: rowHeight,
        fontSize: 13, color: colors.text, align: 'center',
        fill: { color: bgColor }, valign: 'middle', fontFace: 'Calibri',
        bold: colIdx === 0
      });
    });
  });

  compSlide.addText('Your Competitive Advantages:', {
    x: 0.8, y: 5.2, w: 8.4, h: 0.4,
    fontSize: 18, bold: true, color: colors.accent, fontFace: 'Calibri'
  });

  compSlide.addText([
    { text: '1. [Your unique differentiator]', options: { bullet: true } },
    { text: '2. [What makes you 10x better]', options: { bullet: true } },
    { text: '3. [Your defensible moat]', options: { bullet: true } }
  ], {
    x: 1.0, y: 5.7, w: 8.2, h: 1.0,
    fontSize: 16, color: colors.text, fontFace: 'Calibri'
  });

  // Slide 9: Team
  createContentSlide(pptx, 'Team', 'Why we\'re the right team to execute', [
    { text: 'Founders', bold: true, fontSize: 22, color: colors.accent },
    { text: '[Name], CEO - [Relevant background & expertise]', indent: 1, fontSize: 18 },
    { text: 'Example: "10 years at Google leading product teams, Stanford CS"', indent: 2, fontSize: 15, color: colors.textLight },
    { text: '[Name], CTO - [Technical credentials]', indent: 1, fontSize: 18 },
    { text: '[Name], [Role] - [Domain expertise]', indent: 1, fontSize: 18 },
    { text: '', fontSize: 8 },
    { text: 'Why This Team?', bold: true, fontSize: 22, color: colors.accent },
    { text: 'Founder-market fit: Deep understanding of the problem', indent: 1 },
    { text: 'Complementary skills: Business + Technical + Industry expertise', indent: 1 },
    { text: 'Track record: Previous exits, product launches, relevant achievements', indent: 1 },
    { text: '', fontSize: 8 },
    { text: 'Notable Advisors/Investors (if applicable)', bold: true, fontSize: 20, color: colors.accent }
  ], { slideNumber: 9 });

  // Slide 10: The Ask
  const askSlide = pptx.addSlide();
  askSlide.background = { color: colors.white };
  askSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.15, fill: { color: colors.primary } });

  askSlide.addText('The Ask', {
    x: 0.5, y: 0.4, w: 9, h: 0.6,
    fontSize: 36, bold: true, color: colors.primary, fontFace: 'Calibri'
  });

  askSlide.addText('Investment opportunity and use of funds', {
    x: 0.5, y: 1.0, w: 9, h: 0.4,
    fontSize: 18, color: colors.accent, italic: true, fontFace: 'Calibri'
  });

  askSlide.addShape(pptx.ShapeType.rect, {
    x: 2.5, y: 2.0, w: 5, h: 1.2,
    fill: { color: colors.accent, transparency: 10 },
    line: { color: colors.accent, width: 3 }
  });

  askSlide.addText('Raising: $X Million', {
    x: 2.5, y: 2.3, w: 5, h: 0.6,
    fontSize: 32, bold: true, color: colors.primary, align: 'center', fontFace: 'Calibri'
  });

  askSlide.addText('Use of Funds', {
    x: 0.8, y: 3.5, w: 8.4, h: 0.5,
    fontSize: 24, bold: true, color: colors.accent, fontFace: 'Calibri'
  });

  const fundAllocation = [
    { category: 'Product Development', pct: '40%', amount: '$XXX,XXX' },
    { category: 'Sales & Marketing', pct: '35%', amount: '$XXX,XXX' },
    { category: 'Team Expansion', pct: '20%', amount: '$XXX,XXX' },
    { category: 'Operations', pct: '5%', amount: '$XX,XXX' }
  ];

  let fundY = 4.2;
  fundAllocation.forEach(item => {
    askSlide.addText(`${item.pct} - ${item.category}: ${item.amount}`, {
      x: 1.2, y: fundY, w: 7.6, h: 0.4,
      fontSize: 18, color: colors.text, fontFace: 'Calibri',
      bullet: { code: '2022' }
    });
    fundY += 0.5;
  });

  askSlide.addText('Key Milestones (18-24 months)', {
    x: 0.8, y: 6.2, w: 8.4, h: 0.3,
    fontSize: 18, bold: true, color: colors.accent, fontFace: 'Calibri'
  });

  askSlide.addText('Reach $X Million ARR, expand to Y customers, launch Z product', {
    x: 1.2, y: 6.6, w: 7.6, h: 0.4,
    fontSize: 16, color: colors.text, fontFace: 'Calibri'
  });

  return pptx;
}

// Generate all templates (Problem-Solution as example, apply similar enhancements to others)
console.log('\nGenerating enhanced PowerPoint templates...');
console.log(`Output directory: ${templatesDir}\n`);

const problemSolutionPptx = createProblemSolutionTemplate();
const fileName = 'problem-solution-basic.pptx';
const filePath = path.join(templatesDir, fileName);

problemSolutionPptx.writeFile({ fileName: filePath })
  .then(() => {
    console.log(`✓ Created: ${fileName}`);
  })
  .catch(err => {
    console.error(`✗ Error creating ${fileName}:`, err);
  });

console.log('\n✓ Enhanced template generation complete!');
console.log('Note: Only problem-solution-basic.pptx has been enhanced so far.');
console.log('Apply similar enhancements to the other 4 templates.\n');
