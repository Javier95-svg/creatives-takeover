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
  {
    id: 'cold-angel-short',
    title: 'Cold Angel Intro (Short)',
    category: 'cold-outreach',
    subject: 'Quick intro: {{company_name}}',
    body: `Hi {{investor_name}},

I'm {{founder_name}}, founder of {{company_name}}. We are building {{product_description}} for {{target_customer}}.

We are raising {{funding_amount}} for our {{stage}} round and I believe there is a fit based on your interest in {{investment_focus}}.

Quick highlights:
- Traction: {{key_metric}}
- Why now: {{timing_reason}}
- Ask: {{specific_ask}}

Open to a short call next week?

Thanks,
{{founder_name}}`,
    useCase: 'Use for angels or individual investors who prefer a tight, low-friction intro.',
    variables: ['{{investor_name}}', '{{founder_name}}', '{{company_name}}', '{{product_description}}', '{{target_customer}}', '{{funding_amount}}', '{{stage}}', '{{investment_focus}}', '{{key_metric}}', '{{timing_reason}}', '{{specific_ask}}'],
    previewSnippet: 'Short cold intro for angel investors with a clear ask and key highlights.',
    tags: ['Angel', 'Cold Email', 'Short'],
    popularity: 81
  },
  {
    id: 'cold-traction-snapshot',
    title: 'Cold Outreach with Traction Snapshot',
    category: 'cold-outreach',
    subject: '{{company_name}} traction snapshot',
    body: `Hi {{vc_name}},

Reaching out with a quick snapshot of {{company_name}}.

What we do: {{one_liner}}
Who we serve: {{target_customer}}

Traction (last 90 days):
- {{metric_1}}: {{value_1}}
- {{metric_2}}: {{value_2}}
- {{metric_3}}: {{value_3}}

We are raising {{funding_amount}} for {{stage}}. If {{firm_name}} is exploring {{investment_focus}}, I would love to share more.

Would a 15-minute intro next week work?

Best,
{{founder_name}}`,
    useCase: 'Best when you have real traction and want to lead with data.',
    variables: ['{{vc_name}}', '{{company_name}}', '{{one_liner}}', '{{target_customer}}', '{{metric_1}}', '{{value_1}}', '{{metric_2}}', '{{value_2}}', '{{metric_3}}', '{{value_3}}', '{{funding_amount}}', '{{stage}}', '{{firm_name}}', '{{investment_focus}}', '{{founder_name}}'],
    previewSnippet: 'Lead with metrics to show momentum and get a reply.',
    tags: ['VC', 'Cold Email', 'Traction'],
    popularity: 87
  },
  {
    id: 'cold-public-launch',
    title: 'Cold Outreach After Public Launch',
    category: 'cold-outreach',
    subject: '{{company_name}} just launched - would love your take',
    body: `Hi {{vc_name}},

We just launched {{company_name}} and the response has been strong. We are building {{product_description}} for {{target_customer}}.

In the first {{timeframe}}:
- {{early_signal_1}}
- {{early_signal_2}}
- {{early_signal_3}}

We are opening our {{stage}} round and think {{firm_name}} could be a strong partner given your focus on {{investment_focus}}.

Can I send a quick deck?

Thanks,
{{founder_name}}`,
    useCase: 'Use right after a launch while momentum and curiosity are high.',
    variables: ['{{vc_name}}', '{{company_name}}', '{{product_description}}', '{{target_customer}}', '{{timeframe}}', '{{early_signal_1}}', '{{early_signal_2}}', '{{early_signal_3}}', '{{stage}}', '{{firm_name}}', '{{investment_focus}}', '{{founder_name}}'],
    previewSnippet: 'Capitalize on launch momentum with quick signals and a deck ask.',
    tags: ['VC', 'Cold Email', 'Launch'],
    popularity: 79
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
  {
    id: 'warm-intro-follow-up',
    title: 'Warm Intro Follow-up',
    category: 'warm-introduction',
    subject: 'Quick follow-up on intro request',
    body: `Hi {{connection_name}},

Just a quick follow-up on my intro request to {{vc_name}} at {{firm_name}}.

No rush at all - I know you are busy. If it is helpful, here is a short blurb you can forward:

{{forwardable_blurb}}

Thanks again for considering this!

{{founder_name}}`,
    useCase: 'Use when a warm intro request is still pending after a week.',
    variables: ['{{connection_name}}', '{{vc_name}}', '{{firm_name}}', '{{forwardable_blurb}}', '{{founder_name}}'],
    previewSnippet: 'Polite follow-up that makes it easy to forward.',
    tags: ['Warm Intro', 'Follow-up', 'Network'],
    popularity: 76
  },
  {
    id: 'warm-intro-deck-forward',
    title: 'Warm Intro with Deck Forward',
    category: 'warm-introduction',
    subject: 'Intro to {{vc_name}} + short deck',
    body: `Hi {{connection_name}},

If you are comfortable making the introduction to {{vc_name}} at {{firm_name}}, I attached a short deck they can skim in under 3 minutes.

One-line summary: {{one_liner}}
Funding round: {{funding_round}} for {{funding_amount}}

Here is a short intro blurb you can forward:

{{forwardable_blurb}}

Really appreciate your help here.

{{founder_name}}`,
    useCase: 'Use when the connector prefers to pass along a short deck with the intro.',
    variables: ['{{connection_name}}', '{{vc_name}}', '{{firm_name}}', '{{one_liner}}', '{{funding_round}}', '{{funding_amount}}', '{{forwardable_blurb}}', '{{founder_name}}'],
    previewSnippet: 'Warm intro request that includes a concise deck mention.',
    tags: ['Warm Intro', 'Deck', 'Network'],
    popularity: 84
  },
  {
    id: 'warm-intro-advisor-endorsement',
    title: 'Warm Intro via Advisor Endorsement',
    category: 'warm-introduction',
    subject: 'Intro request - {{advisor_name}} suggested a fit',
    body: `Hi {{connection_name}},

{{advisor_name}} suggested I reach out to you because of your relationship with {{vc_name}} at {{firm_name}}.

We are building {{company_name}} ({{product_description}}) and raising {{funding_amount}} for {{stage}}.

If you think it is a fit, would you be open to introducing us? I can share a short blurb or deck if useful.

Thank you,
{{founder_name}}`,
    useCase: 'Use when an advisor or mentor can reinforce the credibility of the intro.',
    variables: ['{{connection_name}}', '{{advisor_name}}', '{{vc_name}}', '{{firm_name}}', '{{company_name}}', '{{product_description}}', '{{funding_amount}}', '{{stage}}', '{{founder_name}}'],
    previewSnippet: 'Leverage advisor credibility to secure a warm intro.',
    tags: ['Warm Intro', 'Advisor', 'Network'],
    popularity: 82
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
  {
    id: 'follow-up-after-deck',
    title: 'Follow-up After Sending Deck',
    category: 'follow-up',
    subject: 'Checking in on {{company_name}} deck',
    body: `Hi {{vc_name}},

Just checking in to see if you had a chance to review the {{company_name}} deck I sent on {{sent_date}}.

Happy to answer any questions or provide more detail on:
- {{topic_1}}
- {{topic_2}}

Would a quick call this week be helpful?

Best,
{{founder_name}}`,
    useCase: 'Use 4-7 days after sending a deck to keep the conversation moving.',
    variables: ['{{vc_name}}', '{{company_name}}', '{{sent_date}}', '{{topic_1}}', '{{topic_2}}', '{{founder_name}}'],
    previewSnippet: 'Simple deck follow-up that offers help and a short call.',
    tags: ['Follow-up', 'Deck', 'VC'],
    popularity: 84
  },
  {
    id: 'follow-up-long-silence',
    title: 'Follow-up After Long Silence',
    category: 'follow-up',
    subject: 'Still worth a quick chat?',
    body: `Hi {{vc_name}},

I know it has been a while since my last note about {{company_name}}.

We have made solid progress:
- {{update_1}}
- {{update_2}}

If this is still relevant for {{firm_name}}, I would love to reconnect. If not, no worries at all.

Thanks,
{{founder_name}}`,
    useCase: 'Use after 3-5 weeks of no response. Keep it polite and low pressure.',
    variables: ['{{vc_name}}', '{{company_name}}', '{{update_1}}', '{{update_2}}', '{{firm_name}}', '{{founder_name}}'],
    previewSnippet: 'Re-open the conversation without pressure after a long silence.',
    tags: ['Follow-up', 'Re-engagement', 'VC'],
    popularity: 73
  },
  {
    id: 'follow-up-partner-meeting',
    title: 'Follow-up After Partner Meeting',
    category: 'follow-up',
    subject: 'Great speaking with the team - {{company_name}}',
    body: `Hi {{vc_name}},

Thanks for organizing the partner meeting. It was great to speak with {{partner_names}} about {{company_name}}.

Key takeaways we heard:
- {{takeaway_1}}
- {{takeaway_2}}

We will follow up on:
- {{next_step_1}}
- {{next_step_2}}

Let me know if there is anything else the team needs.

Best,
{{founder_name}}`,
    useCase: 'Use within 24 hours after a partner meeting to show alignment and momentum.',
    variables: ['{{vc_name}}', '{{partner_names}}', '{{company_name}}', '{{takeaway_1}}', '{{takeaway_2}}', '{{next_step_1}}', '{{next_step_2}}', '{{founder_name}}'],
    previewSnippet: 'Clear recap after partner meetings with next steps.',
    tags: ['Follow-up', 'Partner Meeting', 'VC'],
    popularity: 86
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
  {
    id: 'thank-you-meeting',
    title: 'Thank You After Meeting',
    category: 'thank-you',
    subject: 'Thanks for the time today',
    body: `Hi {{vc_name}},

Thank you for the time today to discuss {{company_name}}. I appreciated your feedback on {{specific_topic}}.

We will follow up with:
- {{follow_up_item_1}}
- {{follow_up_item_2}}

If anything else would be useful, just let me know.

Best,
{{founder_name}}`,
    useCase: 'Send within 24 hours of a meeting to show professionalism and reinforce next steps.',
    variables: ['{{vc_name}}', '{{company_name}}', '{{specific_topic}}', '{{follow_up_item_1}}', '{{follow_up_item_2}}', '{{founder_name}}'],
    previewSnippet: 'Short thank you that confirms next steps.',
    tags: ['Thank You', 'Meeting', 'VC'],
    popularity: 85
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
  },
  {
    id: 'update-product-launch',
    title: 'Product Launch Update',
    category: 'update',
    subject: '{{company_name}} product launch update',
    body: `Hi {{vc_name}},

Quick update: {{company_name}} just launched {{product_name}}.

Launch highlights:
- {{launch_highlight_1}}
- {{launch_highlight_2}}
- {{launch_highlight_3}}

Early signal:
- {{metric_1}}: {{value_1}}
- {{metric_2}}: {{value_2}}

Next milestone: {{next_milestone}}

If helpful, I can share the full launch memo and metrics dashboard.

Best,
{{founder_name}}`,
    useCase: 'Use after a product launch to keep investors engaged with momentum.',
    variables: ['{{vc_name}}', '{{company_name}}', '{{product_name}}', '{{launch_highlight_1}}', '{{launch_highlight_2}}', '{{launch_highlight_3}}', '{{metric_1}}', '{{value_1}}', '{{metric_2}}', '{{value_2}}', '{{next_milestone}}', '{{founder_name}}'],
    previewSnippet: 'Announce a launch with early signals and the next milestone.',
    tags: ['Update', 'Launch', 'Traction'],
    popularity: 84
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
