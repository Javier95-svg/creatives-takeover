import { EmailTemplate } from '@/types/insighta';

export const emailTemplates: EmailTemplate[] = [
  // COLD OUTREACH TEMPLATES
  {
    id: 'cold-vc-intro',
    title: 'Cold VC Introduction',
    category: 'cold-outreach',
    subject: 'Quick intro - {{company_name}} ({{industry}})',
    body: `Hi {{vc_name}},

I'm {{founder_name}}, founder of {{company_name}}. We're building {{product_description}}.

We noticed {{firm_name}}'s investment in {{portfolio_company}} and think there might be a good fit given our focus on {{industry}}.

**Quick snapshot:**
• Problem: {{problem_statement}}
• Solution: {{solution_overview}}
• Traction: {{key_metric}}
• Ask: {{funding_amount}} {{stage}}

Would love 15 minutes to share what we're building. Are you open to a brief call next week?

Best regards,
{{founder_name}}
{{founder_title}}
{{company_name}}`,
    useCase: 'Use this for first-time outreach to VCs you have no prior connection with. Keep it concise and highlight your traction.',
    variables: ['{{vc_name}}', '{{founder_name}}', '{{company_name}}', '{{industry}}', '{{firm_name}}', '{{portfolio_company}}', '{{product_description}}', '{{problem_statement}}', '{{solution_overview}}', '{{key_metric}}', '{{funding_amount}}', '{{stage}}', '{{founder_title}}'],
    previewSnippet: 'Professional cold email template for first contact with VCs. Brief, focused on traction, and includes a clear ask.',
    tags: ['VC', 'Cold Email', 'First Contact'],
    popularity: 95
  },
  {
    id: 'cold-mutual-connection',
    title: 'Cold Email with Mutual Connection',
    category: 'cold-outreach',
    subject: '{{mutual_connection}} suggested I reach out',
    body: `Hi {{vc_name}},

{{mutual_connection}} from {{mutual_company}} suggested I reach out to you about {{company_name}}.

We're {{product_description}} and are raising {{funding_amount}} for our {{stage}} round.

**Why this might interest you:**
• Your thesis on {{investment_thesis_match}} aligns perfectly with our approach
• Similar to your investment in {{portfolio_company}}, but {{differentiator}}
• {{key_achievement}}

Would you be open to a 20-minute call to explore if there's a fit?

Happy to send our deck beforehand.

Thanks,
{{founder_name}}`,
    useCase: 'When you have a mutual connection to reference. Mention them early and clearly to establish credibility.',
    variables: ['{{vc_name}}', '{{mutual_connection}}', '{{mutual_company}}', '{{company_name}}', '{{product_description}}', '{{funding_amount}}', '{{stage}}', '{{investment_thesis_match}}', '{{portfolio_company}}', '{{differentiator}}', '{{key_achievement}}', '{{founder_name}}'],
    previewSnippet: 'Leverage mutual connections to warm up cold outreach and increase response rates.',
    tags: ['VC', 'Cold Email', 'Mutual Connection'],
    popularity: 88
  },
  {
    id: 'cold-post-demo',
    title: 'Post-Demo Day Follow-up',
    category: 'cold-outreach',
    subject: 'Following up from {{event_name}}',
    body: `Hi {{vc_name}},

Great to see {{firm_name}} at {{event_name}} yesterday. I'm {{founder_name}} from {{company_name}} - we presented during the {{session_name}} session.

**Quick recap of what we're building:**
{{company_description}}

**Since demo day:**
• {{recent_update_1}}
• {{recent_update_2}}

I'd love to continue the conversation and share more details about our {{funding_round}}. Do you have 15 minutes for a call this week?

Deck attached.

Best,
{{founder_name}}`,
    useCase: 'Follow up within 24-48 hours of demo days, pitch events, or accelerator showcases. Reference the specific event.',
    variables: ['{{vc_name}}', '{{firm_name}}', '{{event_name}}', '{{founder_name}}', '{{company_name}}', '{{session_name}}', '{{company_description}}', '{{recent_update_1}}', '{{recent_update_2}}', '{{funding_round}}'],
    previewSnippet: 'Timely follow-up after demo days or pitch events to capitalize on momentum.',
    tags: ['VC', 'Demo Day', 'Follow-up'],
    popularity: 82
  },

  // WARM INTRODUCTION TEMPLATES
  {
    id: 'warm-intro-request',
    title: 'Request for Warm Introduction',
    category: 'warm-introduction',
    subject: 'Intro request for fundraising',
    body: `Hi {{connection_name}},

Hope you're doing well! I wanted to reach out about something.

We're raising our {{stage}} round at {{company_name}} ({{product_description}}), and I noticed you're connected to {{vc_name}} at {{firm_name}}.

Given their focus on {{investment_focus}}, I think we might be a good fit. Would you be comfortable making an introduction?

**Quick context on why it's a fit:**
• {{reason_1}}
• {{reason_2}}
• {{traction_highlight}}

Happy to draft something you can forward, or jump on a call to give you the full picture first.

No worries if the timing isn't right!

Thanks,
{{founder_name}}`,
    useCase: 'When asking your network to introduce you to a VC. Make it easy for them by being specific about why it\'s a good fit.',
    variables: ['{{connection_name}}', '{{stage}}', '{{company_name}}', '{{product_description}}', '{{vc_name}}', '{{firm_name}}', '{{investment_focus}}', '{{reason_1}}', '{{reason_2}}', '{{traction_highlight}}', '{{founder_name}}'],
    previewSnippet: 'Ask your network for introductions to VCs with clear context on fit.',
    tags: ['VC', 'Warm Intro', 'Network'],
    popularity: 85
  },
  {
    id: 'forwardable-blurb',
    title: 'Forwardable Introduction Blurb',
    category: 'warm-introduction',
    subject: 'Intro to {{founder_name}} - {{company_name}}',
    body: `[For your connector to forward]

{{vc_name}},

I wanted to introduce you to {{founder_name}}, founder of {{company_name}}.

**What they do:**
{{company_description}}

**Why I think you should meet:**
• {{reason_1}}
• {{reason_2}}
• They're currently raising {{funding_amount}} for their {{stage}} round

**Traction:**
{{key_metrics}}

I think there's a strong fit with {{firm_name}}'s focus on {{investment_area}}.

{{founder_name}}, meet {{vc_name}}.

{{vc_name}}, meet {{founder_name}}.

I'll let you two take it from here!`,
    useCase: 'Provide this blurb to your connector so they can easily forward it. Makes the intro effortless for them.',
    variables: ['{{vc_name}}', '{{founder_name}}', '{{company_name}}', '{{company_description}}', '{{reason_1}}', '{{reason_2}}', '{{funding_amount}}', '{{stage}}', '{{key_metrics}}', '{{firm_name}}', '{{investment_area}}'],
    previewSnippet: 'Ready-to-forward blurb that makes it easy for connectors to introduce you.',
    tags: ['Warm Intro', 'Forwardable', 'Network'],
    popularity: 90
  },

  // FOLLOW-UP TEMPLATES
  {
    id: 'follow-up-initial',
    title: 'Initial Follow-up (1 week)',
    category: 'follow-up',
    subject: 'Re: {{original_subject}}',
    body: `Hi {{vc_name}},

Following up on my email from last week about {{company_name}}.

Quick update since then: {{new_development}}

Still very interested in exploring whether there's a fit with {{firm_name}}, especially given your focus on {{relevant_focus_area}}.

Would a 15-minute call next week work for you?

Best,
{{founder_name}}`,
    useCase: 'Send this 5-7 days after your initial email if you haven\'t heard back. Include any new developments to show momentum.',
    variables: ['{{vc_name}}', '{{original_subject}}', '{{company_name}}', '{{new_development}}', '{{firm_name}}', '{{relevant_focus_area}}', '{{founder_name}}'],
    previewSnippet: 'Gentle follow-up after one week of no response with progress update.',
    tags: ['VC', 'Follow-up', 'Persistence'],
    popularity: 92
  },
  {
    id: 'follow-up-after-meeting',
    title: 'Follow-up After Meeting',
    category: 'follow-up',
    subject: 'Thanks for the conversation - {{company_name}}',
    body: `Hi {{vc_name}},

Thanks for taking the time to chat yesterday about {{company_name}}. I really appreciated your insights on {{specific_insight}}.

As discussed, I'm attaching:
• {{attachment_1}}
• {{attachment_2}}
• {{attachment_3}}

**Next steps per our conversation:**
• {{action_item_1}}
• {{action_item_2}}

Looking forward to {{next_milestone}}!

Happy to provide any additional information you need.

Best,
{{founder_name}}`,
    useCase: 'Send within 24 hours of your first meeting. Recap discussion points and share promised materials.',
    variables: ['{{vc_name}}', '{{company_name}}', '{{specific_insight}}', '{{attachment_1}}', '{{attachment_2}}', '{{attachment_3}}', '{{action_item_1}}', '{{action_item_2}}', '{{next_milestone}}', '{{founder_name}}'],
    previewSnippet: 'Professional follow-up after your first VC meeting with next steps.',
    tags: ['VC', 'Follow-up', 'Post-Meeting'],
    popularity: 88
  },
  {
    id: 'follow-up-second',
    title: 'Second Follow-up (2 weeks)',
    category: 'follow-up',
    subject: 'Quick check-in - {{company_name}}',
    body: `Hi {{vc_name}},

Hope you're having a great week!

Wanted to check in on {{company_name}}. I know you're evaluating a lot of deals, so just following up to see if you need any additional information from us.

Since we last spoke:
{{recent_milestone}}

Happy to answer any questions or set up a call with the team.

Thanks,
{{founder_name}}`,
    useCase: 'Use this 2 weeks after your first follow-up. Keep it brief and add new momentum indicators.',
    variables: ['{{vc_name}}', '{{company_name}}', '{{recent_milestone}}', '{{founder_name}}'],
    previewSnippet: 'Brief second follow-up showing continued momentum and progress.',
    tags: ['Follow-up', 'Persistence', 'Check-in'],
    popularity: 75
  },

  // THANK YOU TEMPLATES
  {
    id: 'thank-you-pass',
    title: 'Thank You After Pass',
    category: 'thank-you',
    subject: 'Thank you - staying in touch',
    body: `Hi {{vc_name}},

Thanks for taking the time to consider {{company_name}} and for the thoughtful feedback.

I completely understand that {{firm_name}}'s current focus is {{their_focus}}, and the timing isn't right.

I really valued your perspective on {{specific_feedback}}, and we'll definitely {{action_based_on_feedback}}.

Would love to stay in touch and keep you updated on our progress, especially as we {{future_milestone}}.

Thanks again for your time!

Best,
{{founder_name}}`,
    useCase: 'When a VC passes on your opportunity. Stay gracious and keep the door open for future rounds or referrals.',
    variables: ['{{vc_name}}', '{{company_name}}', '{{firm_name}}', '{{their_focus}}', '{{specific_feedback}}', '{{action_based_on_feedback}}', '{{future_milestone}}', '{{founder_name}}'],
    previewSnippet: 'Maintain relationships even after receiving a pass decision.',
    tags: ['VC', 'Thank You', 'Relationship Building'],
    popularity: 78
  },
  {
    id: 'thank-you-intro',
    title: 'Thank You for Introduction',
    category: 'thank-you',
    subject: 'Thanks for the intro to {{vc_name}}',
    body: `Hi {{connector_name}},

Just wanted to say thank you for introducing me to {{vc_name}} at {{firm_name}}.

We had a great initial conversation about {{company_name}}, and {{outcome}}.

I really appreciate you making the connection - it means a lot to have your support.

Thanks again!

{{founder_name}}`,
    useCase: 'Always thank the person who made the introduction, regardless of outcome. Keep them updated on progress.',
    variables: ['{{connector_name}}', '{{vc_name}}', '{{firm_name}}', '{{company_name}}', '{{outcome}}', '{{founder_name}}'],
    previewSnippet: 'Show gratitude to connectors who introduce you to investors.',
    tags: ['Thank You', 'Network', 'Gratitude'],
    popularity: 83
  },

  // UPDATE TEMPLATES
  {
    id: 'update-monthly',
    title: 'Monthly Investor Update',
    category: 'update',
    subject: '{{company_name}} Update - {{month}} {{year}}',
    body: `Hi {{vc_name}},

Quick update on {{company_name}} for {{month}}:

**🎯 Key Wins:**
• {{win_1}}
• {{win_2}}
• {{win_3}}

**📊 Metrics:**
• {{metric_1}}: {{value_1}} ({{change_1}})
• {{metric_2}}: {{value_2}} ({{change_2}})
• {{metric_3}}: {{value_3}} ({{change_3}})

**🚀 What's Next:**
• {{goal_1}}
• {{goal_2}}

**🤝 How You Can Help:**
• {{ask_1}}
• {{ask_2}}

Full details in our investor update: {{link}}

As always, happy to chat if you have questions!

Best,
{{founder_name}}`,
    useCase: 'Keep interested VCs updated monthly, even if they haven\'t invested yet. Shows momentum and keeps you top of mind.',
    variables: ['{{vc_name}}', '{{company_name}}', '{{month}}', '{{year}}', '{{win_1}}', '{{win_2}}', '{{win_3}}', '{{metric_1}}', '{{value_1}}', '{{change_1}}', '{{metric_2}}', '{{value_2}}', '{{change_2}}', '{{metric_3}}', '{{value_3}}', '{{change_3}}', '{{goal_1}}', '{{goal_2}}', '{{ask_1}}', '{{ask_2}}', '{{link}}', '{{founder_name}}'],
    previewSnippet: 'Keep VCs engaged with regular progress updates and specific asks.',
    tags: ['VC', 'Update', 'Relationship'],
    popularity: 80
  },
  {
    id: 'update-milestone',
    title: 'Major Milestone Announcement',
    category: 'update',
    subject: '{{company_name}} - {{milestone_name}}!',
    body: `Hi {{vc_name}},

Exciting news - {{company_name}} just {{milestone_achieved}}!

**What this means:**
{{milestone_impact}}

**The numbers:**
• {{key_metric_1}}
• {{key_metric_2}}
• {{key_metric_3}}

This validates {{validation_point}} and positions us well for {{future_opportunity}}.

{{next_steps}}

Would love to catch up and share more details. Coffee soon?

Best,
{{founder_name}}`,
    useCase: 'Share major milestones (product launch, big customer win, revenue milestone) to maintain investor interest.',
    variables: ['{{vc_name}}', '{{company_name}}', '{{milestone_name}}', '{{milestone_achieved}}', '{{milestone_impact}}', '{{key_metric_1}}', '{{key_metric_2}}', '{{key_metric_3}}', '{{validation_point}}', '{{future_opportunity}}', '{{next_steps}}', '{{founder_name}}'],
    previewSnippet: 'Announce major company milestones to build excitement and maintain interest.',
    tags: ['Update', 'Milestone', 'Traction'],
    popularity: 86
  },
  {
    id: 'update-round-progress',
    title: 'Fundraising Round Progress Update',
    category: 'update',
    subject: '{{company_name}} fundraise update',
    body: `Hi {{vc_name}},

Quick update on our {{funding_round}} round for {{company_name}}:

**Round Status:**
• Target: {{target_amount}}
• Committed: {{committed_amount}}
• Timeline: {{closing_date}}

**New Investors:**
{{lead_investor}} is leading, with participation from {{other_investors}}.

**Recent Traction:**
• {{traction_point_1}}
• {{traction_point_2}}

We have room for {{remaining_allocation}} and would love {{firm_name}} to be part of this round.

Can we schedule a call this week to discuss?

Best,
{{founder_name}}`,
    useCase: 'Update VCs on fundraising progress to create urgency. Use carefully and only with accurate information.',
    variables: ['{{vc_name}}', '{{company_name}}', '{{funding_round}}', '{{target_amount}}', '{{committed_amount}}', '{{closing_date}}', '{{lead_investor}}', '{{other_investors}}', '{{traction_point_1}}', '{{traction_point_2}}', '{{remaining_allocation}}', '{{firm_name}}', '{{founder_name}}'],
    previewSnippet: 'Create urgency by updating interested VCs on fundraising progress.',
    tags: ['Update', 'Fundraising', 'FOMO'],
    popularity: 77
  }
];

// Helper functions
export const getTemplatesByCategory = (category: EmailTemplate['category']) => {
  return emailTemplates.filter(t => t.category === category);
};

export const searchTemplates = (query: string) => {
  const lowerQuery = query.toLowerCase();
  return emailTemplates.filter(t =>
    t.title.toLowerCase().includes(lowerQuery) ||
    t.body.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
    t.subject.toLowerCase().includes(lowerQuery)
  );
};

export const getMostPopularTemplates = (limit: number = 5) => {
  return [...emailTemplates]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
};
