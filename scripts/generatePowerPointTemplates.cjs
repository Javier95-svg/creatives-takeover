// Script to generate PowerPoint templates
const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

// Ensure public/templates directory exists
const templatesDir = path.join(__dirname, '../public/templates');
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

// Template data
const templates = [
  {
    id: 'problem-solution-basic',
    name: 'Problem-Solution Framework',
    slides: [
      { title: 'Cover Slide', bullets: ['Company name and logo', 'One-sentence tagline', 'Your name and contact info', 'Date (optional)'] },
      { title: 'Problem', bullets: ['State the problem clearly in 1-2 sentences', 'Show the impact (cost, time, frustration)', 'Use a relatable example or story', 'Avoid jargon - make it universal'] },
      { title: 'Solution', bullets: ['Explain how you solve the problem', 'Focus on benefits, not features', 'Make it crystal clear what you do', 'Use simple language'] },
      { title: 'Market Opportunity', bullets: ['TAM, SAM, SOM breakdown', 'Market growth trends', 'Target customer segment size', 'Cite credible sources'] },
      { title: 'Product', bullets: ['Key features and benefits', 'How it works (simplified)', 'Unique value proposition', 'Technology/innovation if relevant'] },
      { title: 'Traction', bullets: ['User/customer metrics', 'Revenue if applicable', 'Growth rate', 'Key milestones achieved', 'Customer testimonials or logos'] },
      { title: 'Business Model', bullets: ['Revenue streams', 'Pricing strategy', 'Unit economics', 'Customer acquisition cost (CAC)', 'Lifetime value (LTV)'] },
      { title: 'Competition', bullets: ['Main competitors', 'Your differentiation', 'Competitive advantages', 'Market positioning'] },
      { title: 'Team', bullets: ['Founder names and roles', 'Relevant experience', 'Domain expertise', 'Advisor/investor names if notable'] },
      { title: 'Ask', bullets: ['Amount raising', 'Use of funds breakdown', 'Milestones to be achieved', 'Timeline'] }
    ]
  },
  {
    id: 'traction-heavy',
    name: 'Traction-Heavy Deck',
    slides: [
      { title: 'Cover Slide', bullets: ['Company name and logo', 'Tagline', 'Contact information'] },
      { title: 'Traction Highlight', bullets: ['Most impressive growth metric', 'Revenue number or user count', 'Growth rate (MoM/YoY)', 'Comparative context'] },
      { title: 'Problem', bullets: ['The pain point', 'Market validation of problem', 'Current broken solutions'] },
      { title: 'Solution', bullets: ['How you solve it differently', 'Core product functionality', 'Key innovation'] },
      { title: 'Detailed Metrics', bullets: ['Revenue metrics', 'User metrics', 'Engagement metrics', 'Retention metrics', 'Growth trajectory'] },
      { title: 'Customer Proof', bullets: ['Customer logos', 'Case studies', 'Testimonials', 'Usage statistics'] },
      { title: 'Market', bullets: ['TAM/SAM/SOM', 'Market trends', 'Growth drivers'] },
      { title: 'Product Deep Dive', bullets: ['Product walkthrough', 'Key features', 'Technology moat'] },
      { title: 'Business Model', bullets: ['Revenue model', 'Unit economics', 'CAC/LTV ratio', 'Payback period'] },
      { title: 'Roadmap', bullets: ['Product roadmap', 'Expansion plans', 'New revenue streams', 'Geographic expansion'] },
      { title: 'Team', bullets: ['Founders and key hires', 'Relevant experience', 'Track record'] },
      { title: 'Ask & Use of Funds', bullets: ['Round size', 'Use of funds', 'Milestones with funding', 'Timeline to next milestone'] }
    ]
  },
  {
    id: 'vision-driven',
    name: 'Vision-Driven Deck',
    slides: [
      { title: 'Cover Slide', bullets: ['Company name', 'Bold tagline or mission', 'Visually striking image'] },
      { title: 'The Vision', bullets: ['Your vision for the world', 'What changes when you succeed', 'The transformation you enable', 'Think 10-20 years out'] },
      { title: 'The Problem', bullets: ['What\'s broken today', 'Why current solutions fail', 'Urgency of the problem'] },
      { title: 'Why Now', bullets: ['Technology enablers', 'Market shifts', 'Regulatory changes', 'Consumer behavior trends'] },
      { title: 'The Solution', bullets: ['How you\'re different', 'Core innovation', 'Why it will work now'] },
      { title: 'Product', bullets: ['Product demo or mockup', 'Key capabilities', 'User experience'] },
      { title: 'Market Opportunity', bullets: ['Market size', 'Growth trajectory', 'Adjacent markets'] },
      { title: 'Traction', bullets: ['Early adopters', 'Partnerships', 'Pilot programs', 'Letters of intent'] },
      { title: 'Go-to-Market', bullets: ['Customer acquisition strategy', 'Distribution channels', 'Growth loops', 'Network effects'] },
      { title: 'Team', bullets: ['Unique founder-market fit', 'Unfair advantages', 'Previous successes', 'Commitment to the mission'] },
      { title: 'The Ask', bullets: ['Investment ask', 'What you\'ll achieve together', 'Timeline to major milestones', 'Vision of partnership'] }
    ]
  },
  {
    id: 'product-demo',
    name: 'Product Demo Deck',
    slides: [
      { title: 'Cover Slide', bullets: ['Company and product name', 'One-line value prop', 'Product screenshot'] },
      { title: 'Problem', bullets: ['Specific user problem', 'Current workflow pain', 'Quantify the impact'] },
      { title: 'Solution Overview', bullets: ['How your product solves it', 'Core value proposition', 'Why it\'s better'] },
      { title: 'Product Demo - Main Interface', bullets: ['Main dashboard or interface', 'Primary use case', 'Clear annotations', 'Focus on user benefit'] },
      { title: 'Product Demo - Key Feature', bullets: ['Key differentiating feature', 'How it works', 'User workflow'] },
      { title: 'Product Demo - Advanced Features', bullets: ['Power user features', 'Integration capabilities', 'Customization options'] },
      { title: 'User Experience', bullets: ['Onboarding flow', 'Ease of use', 'Time to value', 'User testimonials'] },
      { title: 'Technology', bullets: ['Architecture overview', 'Technical innovation', 'Scalability', 'Security/compliance'] },
      { title: 'Market & Customers', bullets: ['Target customer profile', 'Market size', 'Early customers/users'] },
      { title: 'Traction', bullets: ['User metrics', 'Usage statistics', 'Retention data', 'Customer feedback'] },
      { title: 'Roadmap', bullets: ['Upcoming features', 'Product expansion', 'Platform vision', 'Timeline'] },
      { title: 'Team', bullets: ['Technical founders', 'Product expertise', 'Previous products built'] },
      { title: 'Ask', bullets: ['Funding amount', 'Use for product development', 'Hiring plan', 'Go-to-market acceleration'] }
    ]
  },
  {
    id: 'saas-b2b',
    name: 'B2B SaaS Deck',
    slides: [
      { title: 'Cover Slide', bullets: ['Company name', 'Value proposition', 'Founded year', 'Contact info'] },
      { title: 'Problem', bullets: ['Business problem you solve', 'Cost of the problem', 'Who in organization feels it', 'Current inadequate solutions'] },
      { title: 'Solution', bullets: ['Platform overview', 'Key capabilities', 'Integration ecosystem', 'Deployment options'] },
      { title: 'Why Now', bullets: ['Digital transformation trends', 'Remote work drivers', 'Technology enablers', 'Regulatory changes'] },
      { title: 'Product', bullets: ['Core modules', 'Workflow automation', 'Reporting/analytics', 'Admin controls'] },
      { title: 'Customer Success', bullets: ['Customer logos', 'Use case examples', 'ROI achieved', 'Testimonials with metrics'] },
      { title: 'Market Opportunity', bullets: ['Total addressable market', 'Serviceable market', 'Current penetration', 'Market growth rate'] },
      { title: 'Business Model', bullets: ['Pricing tiers', 'ARR/MRR', 'Net revenue retention', 'CAC payback period', 'LTV:CAC ratio', 'Gross margin'] },
      { title: 'Go-to-Market', bullets: ['Sales channels', 'Customer acquisition strategy', 'Sales cycle length', 'Expansion strategy'] },
      { title: 'Competition', bullets: ['Competitive landscape', 'Positioning matrix', 'Differentiation', 'Switching costs'] },
      { title: 'Team', bullets: ['Founders with B2B background', 'Previous enterprise sales', 'Technical leadership', 'Advisory board'] },
      { title: 'Financials & Ask', bullets: ['Current ARR', 'Growth trajectory', 'Unit economics', 'Raise amount', 'Use of funds', 'Path to profitability'] }
    ]
  }
];

// Generate PowerPoint files
templates.forEach(template => {
  const pptx = new PptxGenJS();

  // Set presentation properties
  pptx.author = 'Creatives Takeover';
  pptx.company = 'Creatives Takeover';
  pptx.subject = template.name;
  pptx.title = template.name;

  // Define master slide layout with consistent styling
  pptx.defineSlideMaster({
    title: 'MASTER_SLIDE',
    background: { color: 'FFFFFF' },
    objects: [
      {
        text: {
          text: 'Creatives Takeover',
          options: {
            x: 0.5,
            y: 6.8,
            w: '90%',
            h: 0.3,
            fontSize: 10,
            color: '666666',
            align: 'right'
          }
        }
      }
    ]
  });

  // Add cover slide
  const coverSlide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
  coverSlide.background = { color: '0B1437' };
  coverSlide.addText(template.name, {
    x: 0.5,
    y: 2.5,
    w: '90%',
    h: 1.5,
    fontSize: 44,
    bold: true,
    color: 'FFFFFF',
    align: 'center'
  });
  coverSlide.addText('Editable Template', {
    x: 0.5,
    y: 4.0,
    w: '90%',
    h: 0.5,
    fontSize: 20,
    color: '38BDF8',
    align: 'center'
  });
  coverSlide.addText('Created by Creatives Takeover', {
    x: 0.5,
    y: 4.7,
    w: '90%',
    h: 0.3,
    fontSize: 14,
    color: 'CCCCCC',
    align: 'center'
  });

  // Add content slides
  template.slides.forEach(slideData => {
    const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });

    // Add title
    slide.addText(slideData.title, {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.75,
      fontSize: 32,
      bold: true,
      color: '0B1437'
    });

    // Add bullet points
    const bulletText = slideData.bullets.map(bullet => ({ text: bullet, options: { bullet: true } }));
    slide.addText(bulletText, {
      x: 0.5,
      y: 1.5,
      w: '90%',
      h: 4.5,
      fontSize: 16,
      color: '374151',
      lineSpacing: 28
    });

    // Add note with instructions
    slide.addNotes(`Instructions for "${slideData.title}" slide:\n\n${slideData.bullets.join('\n')}\n\nReplace this content with your own information.`);
  });

  // Save the file
  const fileName = `${template.id}.pptx`;
  const filePath = path.join(templatesDir, fileName);

  pptx.writeFile({ fileName: filePath })
    .then(() => {
      console.log(`✓ Created: ${fileName}`);
    })
    .catch(err => {
      console.error(`✗ Error creating ${fileName}:`, err);
    });
});

console.log('\nGenerating PowerPoint templates...');
console.log(`Output directory: ${templatesDir}\n`);
