// Response templates for common queries - instant responses without AI calls
// This provides sub-50ms responses for frequently asked questions

interface Template {
  patterns: RegExp[];
  response: string;
  quickActions?: Array<{text: string, id: string}>;
  context?: string[];
}

const templates: Template[] = [
  // Greetings
  {
    patterns: [/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)[\s!.,]*$/i],
    response: "Hi there! 👋 I'm BizMap AI, your business planning co-founder. I'm here to help you turn your idea into a launch-ready plan. What business idea are you working on?",
    quickActions: [
      { text: "I have a business idea", id: "start_planning" },
      { text: "Tell me about BizMap AI", id: "ask_about_bizmap" },
      { text: "How does this work?", id: "ask_how_it_works" }
    ]
  },
  
  // What is BizMap AI
  {
    patterns: [/what (is|does) (bizmap|biz map|this)/i, /tell me about (bizmap|biz map|this)/i, /explain (bizmap|biz map)/i],
    response: "BizMap AI is your AI co-founder that guides you through creating a complete business plan in 7 steps. I'll help you:\n\n• Validate your business idea\n• Define your target market\n• Plan your MVP\n• Create a launch strategy\n• Set pricing and goals\n\nReady to start? Just share your business idea!",
    quickActions: [
      { text: "Start planning", id: "start_planning" },
      { text: "See an example", id: "see_example" },
      { text: "How long does it take?", id: "ask_duration" }
    ]
  },
  
  // How does it work
  {
    patterns: [/how (does|do) (this|it|bizmap) work/i, /how (does|do) i (start|begin|use)/i],
    response: "It's simple! I'll ask you 7 questions about your business idea:\n\n1️⃣ **Business Concept** - What problem are you solving?\n2️⃣ **Target Market** - Who are your customers?\n3️⃣ **Validation Plan** - How will you test demand?\n4️⃣ **MVP Design** - What's your minimum product?\n5️⃣ **Launch Strategy** - Where will you find customers?\n6️⃣ **Pricing Model** - How will you make money?\n7️⃣ **Success Goals** - What does Day 30 look like?\n\nThen I'll generate your personalized Launch Report! Ready?",
    quickActions: [
      { text: "Let's start!", id: "start_planning" },
      { text: "I have questions", id: "ask_questions" }
    ]
  },
  
  // Pricing questions - Only match when explicitly asking about BizMap/service pricing
  {
    patterns: [
      // Explicit BizMap pricing questions
      /^(how much|what).*(does|do|is).*(bizmap|biz map|this (service|tool|platform|app)|creatives takeover).*(cost|price|free|pricing)/i,
      /^(is|are).*(bizmap|biz map|this (service|tool|platform|app)|creatives takeover).*(free|cost|pricing)/i,
      /^(how much|what).*(do|does).*(you|bizmap|biz map|creatives takeover).*(charge|cost)/i,
      // Direct questions about the service being free
      /^(is|are).*(bizmap|biz map|this|it).*free/i,
      // Questions explicitly about using BizMap
      /.*(bizmap|biz map|this (service|tool|platform|app)).*(cost|price|free|pricing|charge).*/i
    ],
    response: "BizMap AI is free to use! You can complete the full 7-step wizard and get your Launch Report at no cost. Some advanced features like detailed market analysis may use credits, but the core planning experience is completely free.\n\nWant to start your free business plan?",
    quickActions: [
      { text: "Start free plan", id: "start_planning" },
      { text: "What are credits?", id: "ask_credits" }
    ]
  },
  
  // Thank you responses
  {
    patterns: [/^(thanks|thank you|thx|ty|appreciate it)[\s!.,]*$/i],
    response: "You're welcome! 😊 I'm here whenever you need help with your business planning. What would you like to work on next?",
    quickActions: [
      { text: "Continue planning", id: "continue_planning" },
      { text: "Ask a question", id: "ask_question" }
    ]
  },
  
  // Yes/No simple responses
  {
    patterns: [/^(yes|yeah|yep|yup|sure|ok|okay|alright|sounds good)[\s!.,]*$/i],
    response: "Great! Let's keep going. What's your business idea or what would you like help with?",
    quickActions: [
      { text: "Share my idea", id: "share_idea" },
      { text: "I need help", id: "need_help" }
    ]
  },
  
  {
    patterns: [/^(no|nope|not yet|maybe later)[\s!.,]*$/i],
    response: "No problem! Take your time. When you're ready, I'll be here to help you plan your business. Is there anything specific you'd like to know about BizMap AI?",
    quickActions: [
      { text: "Learn more", id: "learn_more" },
      { text: "See examples", id: "see_examples" }
    ]
  },
  
  // Help requests
  {
    patterns: [/^(help|i need help|can you help|assist me)/i],
    response: "I'm here to help! 🚀 I can assist you with:\n\n• Planning your business idea\n• Validating your market\n• Creating a launch strategy\n• Setting pricing and goals\n\nWhat would you like help with? Just tell me about your business idea or ask me anything!",
    quickActions: [
      { text: "Start planning", id: "start_planning" },
      { text: "Validate my idea", id: "validate_idea" },
      { text: "Ask a question", id: "ask_question" }
    ]
  }
];

// Validate that pricing questions are actually about BizMap, not business/product pricing
function isBizMapPricingQuestion(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Must contain service/platform references
  const serviceKeywords = ['bizmap', 'biz map', 'this service', 'this tool', 'this platform', 'this app', 'creatives takeover'];
  const hasServiceReference = serviceKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // Pricing keywords
  const pricingKeywords = ['cost', 'price', 'free', 'pricing', 'charge', 'paid'];
  const hasPricingKeyword = pricingKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // Exclude business/product pricing questions
  const businessPricingPatterns = [
    /(my|our|their|the).*(product|service|business|company).*(cost|price|pricing)/i,
    /(what|how much).*(should|do|does).*(i|we|they).*(charge|price|cost)/i,
    /(pricing|price|cost).*(for|of).*(my|our|their|the).*(product|service|business)/i
  ];
  const isBusinessPricing = businessPricingPatterns.some(pattern => pattern.test(message));
  
  return hasServiceReference && hasPricingKeyword && !isBusinessPricing;
}

export function matchTemplate(message: string, businessContext?: any): Template | null {
  const normalizedMessage = message.trim().toLowerCase();
  
  // Check each template
  for (const template of templates) {
    // Special handling for pricing template - require explicit BizMap context
    if (template.response.includes("BizMap AI is free to use")) {
      if (!isBizMapPricingQuestion(message)) {
        continue; // Skip pricing template if not actually about BizMap pricing
      }
    }
    
    for (const pattern of template.patterns) {
      if (pattern.test(normalizedMessage)) {
        // Check context requirements if any
        if (template.context) {
          const hasContext = template.context.some(ctx => 
            businessContext && businessContext[ctx]
          );
          if (!hasContext && template.context.length > 0) {
            continue; // Skip if context required but not present
          }
        }
        return template;
      }
    }
  }
  
  return null;
}

export function getTemplateResponse(template: Template, businessContext?: any): string {
  // Simple template response (can be enhanced with variable substitution)
  return template.response;
}

