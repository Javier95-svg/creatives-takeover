import type { JourneyDefinition } from '@/types/journey';

export const get5PayingUsersIn30Days: JourneyDefinition = {
  slug: 'first-customers',
  title: 'Get 5 Paying Users in 30 Days',
  tagline: 'From MVP to first revenue with a repeatable playbook',
  description:
    'A 30-day structured playbook to find your first paying customers — with daily outreach tasks, DM scripts, pricing experiments, and a repeatable channel.',
  totalDays: 30,
  icon: 'ClipboardList',
  color: 'orange',
  prerequisites: ['mvp'],
  days: [
    // === WEEK 1: Outreach Foundation (Days 1-7) ===
    {
      dayNumber: 1,
      title: 'Ideal Customer Profile',
      subtitle: 'Get crystal clear on who your first 5 customers are',
      estimatedMinutes: 45,
      founderExample: {
        company: 'Superhuman',
        founderName: 'Rahul Vohra',
        quote:
          'We didn\'t try to sell to everyone. We focused on busy CEOs and founders who got 100+ emails a day. That specificity made our outreach 10x more effective.',
        lesson: 'The more specific your ICP, the easier every outreach message becomes.',
      },
      tasks: [
        {
          id: 'fc1-1',
          title: 'Define your Ideal Customer Profile (ICP)',
          description:
            'Write down: Job title, company size, industry, specific pain point, and where they hang out online. Be as specific as possible — "SaaS founders with 1-10 employees" not "entrepreneurs."',
          estimatedMinutes: 20,
          deliverable: 'A specific ICP definition',
          template: {
            id: 'tmpl-icp',
            title: 'Ideal Customer Profile Template',
            description: 'Define exactly who your first 5 paying customers look like.',
            content: `# Ideal Customer Profile (ICP)

## Demographics:
- **Job Title**: {{job_title}} (e.g., "freelance web developer")
- **Company Size**: {{company_size}} (e.g., "solo" or "2-10 employees")
- **Industry**: {{industry}}
- **Revenue/Budget**: {{budget_range}}

## Psychographics:
- **Main Pain Point**: {{pain_point}}
- **Current Solution**: {{current_solution}} (what are they using now?)
- **Why Current Solution Fails**: {{why_it_fails}}
- **Trigger Event**: {{trigger}} (what makes them start looking for a solution?)

## Where to Find Them:
- **Online**: {{online_channels}} (Twitter, Reddit subs, Slack groups, LinkedIn groups)
- **Offline**: {{offline_channels}} (meetups, conferences, coworking spaces)
- **Content They Read**: {{content_sources}}

## Disqualifiers (NOT your customer):
- {{not_customer_1}}
- {{not_customer_2}}

---

**Test**: Can you find 20 people matching this profile in 30 minutes? If not, it's too vague.`,
            placeholders: ['{{job_title}}', '{{company_size}}', '{{industry}}', '{{pain_point}}'],
          },
        },
        {
          id: 'fc1-2',
          title: 'Build a prospect list of 20 people',
          description:
            'Using your ICP, find 20 real people on LinkedIn, Twitter, Reddit, or in communities you belong to. Add them to a simple spreadsheet with name, platform, and link.',
          estimatedMinutes: 25,
          deliverable: 'A list of 20 prospects with contact info',
        },
      ],
    },
    {
      dayNumber: 2,
      title: 'Outreach Scripts',
      subtitle: 'Write messages that start conversations, not sales pitches',
      estimatedMinutes: 40,
      founderExample: {
        company: 'Lemlist',
        founderName: 'Guillaume Moubeche',
        quote:
          'Our first 100 customers came from personalized cold DMs. Not ads, not content, not virality — just good messages to the right people.',
        lesson: 'Personalized outreach at small scale beats broad marketing at any scale when you have 0 users.',
      },
      tasks: [
        {
          id: 'fc2-1',
          title: 'Write 3 outreach DM variations',
          description:
            'Create 3 different outreach messages: one casual, one direct, one curiosity-based. You\'ll test which gets the best response rate.',
          estimatedMinutes: 25,
          deliverable: '3 DM script variations ready to send',
          template: {
            id: 'tmpl-dm-variations',
            title: 'Cold DM Script Variations',
            description: 'Three different approaches to cold outreach.',
            content: `# Cold DM Script Variations

## Variation A: Casual / Community-Based
Hey {{name}}, I noticed we're both in {{community}}. I just launched a tool that {{one_liner}} — built it because I kept running into {{problem}} myself.

Would you be open to trying it and sharing honest feedback? Happy to give you free access.

## Variation B: Direct / Value-Led
Hi {{name}}, quick question: do you currently {{pain_action}}?

I built {{product}} to help {{who}} {{benefit}} in {{timeframe}}. Early users are saving {{metric}}.

Would a quick 5-min walkthrough be useful?

## Variation C: Curiosity / Question-Based
Hey {{name}}, random question — how do you currently handle {{problem_area}}?

I've been building something to make that easier and I'm looking for early feedback from people who deal with this daily.

No pitch, just curious how you approach it today.

---

## Key Principles:
- Lead with THEIR problem, not your product
- Keep it under 60 words
- End with a low-commitment question
- Never say "I'd love to pick your brain" or "Let me know if interested"`,
            placeholders: ['{{name}}', '{{community}}', '{{one_liner}}', '{{product}}'],
          },
        },
        {
          id: 'fc2-2',
          title: 'Personalize 5 messages and send them',
          description:
            'Take your best DM variation, personalize it for 5 prospects from your list (mention something specific about them), and send. Track who you messaged.',
          estimatedMinutes: 15,
          deliverable: '5 personalized outreach DMs sent',
        },
      ],
    },
    {
      dayNumber: 3,
      title: 'Outreach — Batch 2',
      subtitle: 'Send 5 more and test a different message',
      estimatedMinutes: 30,
      founderExample: {
        company: 'ConvertKit',
        founderName: 'Nathan Barry',
        quote:
          'I got my first 1,000 customers by sending personal emails and DMs, one by one. No shortcuts. Just volume and genuine interest in their work.',
        lesson: 'At the start, there\'s no hack. It\'s just volume + personalization.',
      },
      tasks: [
        {
          id: 'fc3-1',
          title: 'Send 5 more outreach messages',
          description:
            'Use a different DM variation than Day 2. Personalize each one. You\'re testing which message style gets better responses.',
          estimatedMinutes: 15,
          deliverable: '5 more DMs sent with variation B or C',
        },
        {
          id: 'fc3-2',
          title: 'Review responses from Day 2',
          description:
            'Check for replies from yesterday. Log: who replied, what they said, interest level (cold/warm/hot). Follow up with anyone who showed interest.',
          estimatedMinutes: 15,
          deliverable: 'Response log updated',
          toolLink: {
            label: 'Email Template Ideas',
            href: '/insighta/email-templates',
          },
        },
      ],
    },
    {
      dayNumber: 4,
      title: 'First Demos',
      subtitle: 'Get your product in front of interested prospects',
      estimatedMinutes: 60,
      founderExample: {
        company: 'Loom',
        founderName: 'Joe Thomas',
        quote:
          'Our first users didn\'t come from a launch. They came from showing the product to people who said "I hate scheduling video calls." One demo, instant conversion.',
        lesson: 'A live demo to someone with the problem is worth more than a thousand website visitors.',
      },
      tasks: [
        {
          id: 'fc4-1',
          title: 'Schedule or conduct demos with warm leads',
          description:
            'For anyone who showed interest in Days 2-3, schedule a quick 10-minute demo call or send a Loom walkthrough. Show, don\'t tell.',
          estimatedMinutes: 40,
          deliverable: 'At least 1 demo scheduled or delivered',
        },
        {
          id: 'fc4-2',
          title: 'Send 5 more outreach messages',
          description: 'Keep the pipeline flowing. Send 5 more personalized DMs to new prospects from your list.',
          estimatedMinutes: 20,
          deliverable: '5 more DMs sent (15 total so far)',
        },
      ],
    },
    {
      dayNumber: 5,
      title: 'Follow-Up Sequences',
      subtitle: 'Most conversions happen on the 2nd or 3rd touch',
      estimatedMinutes: 40,
      founderExample: {
        company: 'Close.com',
        founderName: 'Steli Efti',
        quote:
          'Most salespeople give up after 1-2 follow-ups. I close deals on follow-up 5, 6, or 7. The fortune is in the follow-up.',
        lesson: 'If someone didn\'t reply, it usually means they\'re busy — not that they\'re not interested. Follow up.',
      },
      tasks: [
        {
          id: 'fc5-1',
          title: 'Follow up with all non-responders',
          description:
            'Send a brief, friendly follow-up to everyone who hasn\'t replied. Keep it short: "Hey, just bumping this — thought it might be useful for you. No worries if not!"',
          estimatedMinutes: 15,
          deliverable: 'Follow-ups sent to all non-responders',
          template: {
            id: 'tmpl-followup',
            title: 'Follow-Up Message Templates',
            description: 'Non-pushy follow-up messages for cold outreach.',
            content: `# Follow-Up Templates

## Follow-Up #1 (3 days after initial DM):
Hey {{name}}, just circling back on this — I know DMs can get buried. If {{problem_area}} is something you deal with, I'd love your take on what I built. If not, totally fine!

## Follow-Up #2 (5 days after FU #1):
Hi {{name}}, last ping on this! I just shipped {{new_feature_or_update}} based on early user feedback. Thought it might be relevant to you given {{their_context}}. Here's the link if you want to check it out: {{link}}

## Follow-Up #3 (7 days after FU #2, only if high-value prospect):
Hey {{name}}, I realize you're probably swamped. No hard feelings if this isn't relevant right now. Quick question though: who would you recommend I talk to about {{problem_area}}? Always looking for the right people to learn from.

---

**Rules:**
- Never guilt-trip or be passive-aggressive
- Each follow-up should add new value or context
- If no reply after 3 follow-ups, move on
- Always give them an easy out`,
            placeholders: ['{{name}}', '{{problem_area}}', '{{link}}'],
          },
        },
        {
          id: 'fc5-2',
          title: 'Send 5 fresh outreach messages',
          description: 'Replenish the pipeline with 5 new prospects. You\'re now at 20 total outreach messages sent.',
          estimatedMinutes: 15,
          deliverable: '5 more DMs sent (20 total)',
        },
        {
          id: 'fc5-3',
          title: 'Track your conversion funnel',
          description:
            'Count: DMs sent, replies received, demos scheduled, positive interest. Calculate your reply rate. If under 10%, revise your message.',
          estimatedMinutes: 10,
          deliverable: 'Conversion funnel numbers documented',
        },
      ],
    },
    {
      dayNumber: 6,
      title: 'Community Seeding',
      subtitle: 'Find conversations where your product is the answer',
      estimatedMinutes: 45,
      founderExample: {
        company: 'Notion',
        founderName: 'Ivan Zhao',
        quote:
          'Notion grew by showing up in communities where people discussed productivity tools. We didn\'t advertise — we participated and offered value.',
        lesson: 'The best marketing feels like helping. Show up where your customers already talk about their problems.',
      },
      tasks: [
        {
          id: 'fc6-1',
          title: 'Find 5 relevant conversations',
          description:
            'Search Reddit, Twitter, Indie Hackers, Hacker News, or niche forums for people complaining about or asking about the problem you solve. Bookmark 5 threads.',
          estimatedMinutes: 15,
          deliverable: '5 relevant online conversations found',
        },
        {
          id: 'fc6-2',
          title: 'Contribute helpful replies',
          description:
            'Reply to 3-5 threads with genuinely helpful answers. Don\'t spam your link — share insight first, then mention "I\'m building something for this" only if relevant.',
          estimatedMinutes: 20,
          deliverable: '3-5 helpful community replies posted',
        },
        {
          id: 'fc6-3',
          title: 'Continue DM outreach — send 5',
          description: 'Keep the outreach engine running. 5 more personalized messages.',
          estimatedMinutes: 10,
          deliverable: '5 more DMs sent (25 total)',
        },
      ],
    },
    {
      dayNumber: 7,
      title: 'Week 1 Review',
      subtitle: 'Audit what\'s working and adjust your approach',
      estimatedMinutes: 40,
      founderExample: {
        company: 'Buffer',
        founderName: 'Joel Gascoigne',
        quote:
          'Every week I\'d look at the numbers: signups, activations, upgrades. Not vanity metrics — the numbers that told me if the business was working.',
        lesson: 'Weekly reviews turn random effort into a system. Look at the numbers and adjust.',
      },
      proTip: 'If you have zero warm leads after 25 DMs, the problem is likely your message or your ICP — not the channel.',
      tasks: [
        {
          id: 'fc7-1',
          title: 'Review your Week 1 numbers',
          description:
            'Tally: DMs sent, reply rate, demos done, interest level. Which message variation worked best? Which channel had the most responses?',
          estimatedMinutes: 15,
          deliverable: 'Week 1 metrics documented',
        },
        {
          id: 'fc7-2',
          title: 'Identify what to double down on',
          description:
            'What worked? Do more of it. What didn\'t? Stop or change it. Write 3 specific adjustments for Week 2.',
          estimatedMinutes: 15,
          deliverable: '3 adjustments for Week 2',
        },
        {
          id: 'fc7-3',
          title: 'Rebuild your prospect list',
          description:
            'You\'ve messaged 25 people. Find 25 more. If your ICP wasn\'t yielding results, refine it based on what you learned.',
          estimatedMinutes: 10,
          deliverable: '25 new prospects added to list',
        },
      ],
    },

    // === WEEK 2: Conversion Engine (Days 8-14) ===
    {
      dayNumber: 8,
      title: 'Objection Mapping',
      subtitle: 'Prepare answers for the reasons people say no',
      estimatedMinutes: 40,
      founderExample: {
        company: 'Stripe',
        founderName: 'Patrick Collison',
        quote:
          'When developers said "we already have PayPal," we didn\'t argue. We asked: "how long did your last integration take?" That reframed the conversation.',
        lesson: 'The best way to handle an objection is to reframe it as a question about their current pain.',
      },
      tasks: [
        {
          id: 'fc8-1',
          title: 'List the top 5 objections you\'ve heard',
          description:
            'Review your conversations. What reasons did people give for not being interested? "Too expensive," "I already use X," "Not a priority right now," etc.',
          estimatedMinutes: 15,
          deliverable: '5 objections documented',
        },
        {
          id: 'fc8-2',
          title: 'Write a response for each objection',
          description:
            'For each objection, write a 1-2 sentence response that acknowledges their concern and reframes it. Don\'t argue — redirect.',
          estimatedMinutes: 15,
          deliverable: 'Objection response scripts',
        },
        {
          id: 'fc8-3',
          title: 'Send 5 outreach messages using learnings',
          description: 'Apply your Week 1 insights: use the best-performing DM variation, target the ICP that responded best.',
          estimatedMinutes: 10,
          deliverable: '5 DMs sent with refined approach',
        },
      ],
    },
    {
      dayNumber: 9,
      title: 'Pricing Experiment',
      subtitle: 'Test if people will actually pay — and how much',
      estimatedMinutes: 50,
      founderExample: {
        company: 'Basecamp',
        founderName: 'Jason Fried',
        quote:
          'We tried 3 pricing tiers at first. Then we realized one simple price was easier to sell, easier to explain, and converted better.',
        lesson: 'Simple pricing converts better than clever pricing. Test one price, learn, then adjust.',
      },
      tasks: [
        {
          id: 'fc9-1',
          title: 'Design a simple pricing test',
          description:
            'Pick one thing to test: a different price point, a limited-time offer, or a "pay what you want" experiment. Set it up on your product.',
          estimatedMinutes: 20,
          deliverable: 'Pricing experiment designed and live',
        },
        {
          id: 'fc9-2',
          title: 'Offer your product to 3 warm leads',
          description:
            'Reach out to your warmest prospects with a direct offer: "I\'d love for you to be one of my first 5 customers. Here\'s what you\'d get for $X. Interested?"',
          estimatedMinutes: 15,
          deliverable: '3 warm leads offered the product',
        },
        {
          id: 'fc9-3',
          title: 'Send 5 more outreach DMs',
          description: 'Keep the top of funnel moving while testing conversion at the bottom.',
          estimatedMinutes: 15,
          deliverable: '5 more DMs sent',
        },
      ],
    },
    {
      dayNumber: 10,
      title: 'First Conversion Push',
      subtitle: 'Focus on closing your warmest leads',
      estimatedMinutes: 45,
      founderExample: {
        company: 'Gumroad',
        founderName: 'Sahil Lavingia',
        quote:
          'My first paying customer was someone I DMed directly. I said "I built this for people like you, would you pay $5 for it?" They said yes.',
        lesson: 'Asking for the sale directly is uncomfortable but effective. Your first customer won\'t find you — you find them.',
      },
      tasks: [
        {
          id: 'fc10-1',
          title: 'Follow up with all warm leads',
          description:
            'Message everyone who showed interest, did a demo, or said positive things. Ask directly: "Would you like to try it? Here\'s the link to get started."',
          estimatedMinutes: 20,
          deliverable: 'All warm leads given a direct CTA',
        },
        {
          id: 'fc10-2',
          title: 'Offer a founder\'s deal',
          description:
            'Create urgency: "I\'m offering early supporter pricing for the first 5 customers — $X/month instead of the eventual $Y. Want in?"',
          estimatedMinutes: 15,
          deliverable: 'Founder\'s deal offered to warm leads',
        },
        {
          id: 'fc10-3',
          title: 'Send 5 more outreach DMs',
          description: 'Continue outreach to maintain pipeline volume.',
          estimatedMinutes: 10,
          deliverable: '5 more DMs sent',
        },
      ],
    },
    {
      dayNumber: 11,
      title: 'Channel Exploration',
      subtitle: 'Test a second acquisition channel',
      estimatedMinutes: 50,
      founderExample: {
        company: 'Indie Hackers',
        founderName: 'Courtland Allen',
        quote:
          'I tried everything: HN, Reddit, Twitter, ProductHunt. The key was figuring out which one actually converted and doubling down hard on it.',
        lesson: 'Don\'t spread thin across 10 channels. Test 2-3, find the one that works, and go all in.',
      },
      tasks: [
        {
          id: 'fc11-1',
          title: 'Choose a second channel to test',
          description:
            'Pick one: Product Hunt launch, Indie Hackers post, Reddit thread, Twitter thread, YouTube demo, or a niche community. Do ONE.',
          estimatedMinutes: 10,
          deliverable: 'Second channel selected',
        },
        {
          id: 'fc11-2',
          title: 'Create content for the new channel',
          description:
            'Write a post, create a demo video, or craft a launch page for the channel you chose. Focus on the problem you solve, not features.',
          estimatedMinutes: 30,
          deliverable: 'Content created for second channel',
        },
        {
          id: 'fc11-3',
          title: 'Publish and monitor',
          description: 'Post your content and actively monitor for comments, questions, and signups. Respond to everything within 1 hour.',
          estimatedMinutes: 10,
          deliverable: 'Content published + monitoring',
        },
      ],
    },
    {
      dayNumber: 12,
      title: 'Feedback Integration',
      subtitle: 'Use what leads are telling you to improve conversion',
      estimatedMinutes: 45,
      founderExample: {
        company: 'Intercom',
        founderName: 'Des Traynor',
        quote:
          'We asked every trial user: "What almost stopped you from signing up?" The answers shaped our messaging, onboarding, and pricing.',
        lesson: 'The gap between interest and purchase is where the real product insights live.',
      },
      tasks: [
        {
          id: 'fc12-1',
          title: 'Review all feedback from prospects',
          description:
            'Go through every conversation. What did people love? What concerned them? What questions did they ask? Write down patterns.',
          estimatedMinutes: 20,
          deliverable: 'Feedback patterns documented',
        },
        {
          id: 'fc12-2',
          title: 'Make 1 product or messaging change',
          description:
            'Based on feedback patterns, make ONE change that could improve conversion: update your landing page headline, fix a confusing flow, or adjust pricing.',
          estimatedMinutes: 15,
          deliverable: '1 conversion-improving change shipped',
        },
        {
          id: 'fc12-3',
          title: 'Send 5 outreach DMs with updated messaging',
          description: 'Use your refined message (based on what you learned) for the next batch of outreach.',
          estimatedMinutes: 10,
          deliverable: '5 DMs sent with improved messaging',
        },
      ],
    },
    {
      dayNumber: 13,
      title: 'Social Proof Collection',
      subtitle: 'Gather testimonials and evidence to build trust',
      estimatedMinutes: 35,
      founderExample: {
        company: 'Calendly',
        founderName: 'Tope Awotona',
        quote:
          'Our first testimonials came from users who said "I saved 4 hours a week." We put that on the homepage and conversions jumped 30%.',
        lesson: 'One specific user quote is worth more than a thousand words of marketing copy.',
      },
      tasks: [
        {
          id: 'fc13-1',
          title: 'Ask 3 users for feedback quotes',
          description:
            'Message anyone who has tried your product: "I\'d love a quick quote about your experience — even 1 sentence helps. What did you like or find useful?"',
          estimatedMinutes: 10,
          deliverable: 'Testimonial requests sent',
        },
        {
          id: 'fc13-2',
          title: 'Add social proof to your landing page',
          description:
            'Add any testimonials, user count, or usage stats to your landing page. Even "Used by 3 early testers" is better than nothing.',
          estimatedMinutes: 15,
          deliverable: 'Social proof added to landing page',
        },
        {
          id: 'fc13-3',
          title: 'Send 5 outreach DMs',
          description: 'Continue outreach. You\'re building a machine — keep it running.',
          estimatedMinutes: 10,
          deliverable: '5 more DMs sent',
        },
      ],
    },
    {
      dayNumber: 14,
      title: 'Week 2 Review',
      subtitle: 'Audit conversions and plan your closing sprint',
      estimatedMinutes: 40,
      founderExample: {
        company: 'Shopify',
        founderName: 'Tobias Lutke',
        quote:
          'We measured everything obsessively. Not because we loved data — because we needed to know what worked before we scaled it.',
        lesson: 'You can\'t scale what you don\'t measure. Review your numbers before pushing harder.',
      },
      tasks: [
        {
          id: 'fc14-1',
          title: 'Review Week 2 metrics',
          description:
            'Total DMs sent, reply rate, demos done, offers made, payments received. How many paying customers do you have so far?',
          estimatedMinutes: 15,
          deliverable: 'Week 2 metrics reviewed',
        },
        {
          id: 'fc14-2',
          title: 'Identify your best-performing channel',
          description:
            'Which channel (DMs, community, second channel) generated the most interest and conversions? This is where you\'ll focus Week 3.',
          estimatedMinutes: 10,
          deliverable: 'Best channel identified',
        },
        {
          id: 'fc14-3',
          title: 'Set a target for Week 3',
          description:
            'Based on your conversion rate: how many more outreach messages do you need to send to reach 5 paying users? Set a daily target.',
          estimatedMinutes: 15,
          deliverable: 'Week 3 daily outreach target set',
        },
      ],
    },

    // === WEEK 3: Closing Sprint (Days 15-21) ===
    {
      dayNumber: 15,
      title: 'Refined Pitch',
      subtitle: 'Sharpen your message based on 2 weeks of data',
      estimatedMinutes: 45,
      founderExample: {
        company: 'Mailchimp',
        founderName: 'Ben Chestnut',
        quote:
          'We rewrote our pitch 50 times in the first year. Each version got better because we listened to how customers described the problem.',
        lesson: 'Use your customers\' own words in your pitch. They\'ll tell you how to sell to them.',
      },
      tasks: [
        {
          id: 'fc15-1',
          title: 'Rewrite your pitch using customer language',
          description:
            'Go through your best conversations. What words did interested people use? Rewrite your DM script and landing page using their language, not yours.',
          estimatedMinutes: 20,
          deliverable: 'Pitch rewritten in customer language',
          toolLink: {
            label: 'Get AI Help',
            href: '/bizmap-ai/chat',
          },
        },
        {
          id: 'fc15-2',
          title: 'Send 5 outreach with the new pitch',
          description: 'Test your refined message on 5 new prospects. Track if the reply rate improves.',
          estimatedMinutes: 15,
          deliverable: '5 DMs sent with refined pitch',
        },
        {
          id: 'fc15-3',
          title: 'Follow up with all warm leads',
          description: 'Re-engage anyone who showed interest but hasn\'t converted. Mention any updates or improvements you\'ve made.',
          estimatedMinutes: 10,
          deliverable: 'All warm leads followed up',
        },
      ],
    },
    {
      dayNumber: 16,
      title: 'Urgency & Scarcity',
      subtitle: 'Create legitimate reasons to act now',
      estimatedMinutes: 35,
      founderExample: {
        company: 'Product Hunt',
        founderName: 'Ryan Hoover',
        quote:
          'Launch day creates natural urgency. People pay attention because there\'s a moment — tomorrow, it\'s old news.',
        lesson: 'Urgency works when it\'s real. Limited spots, limited-time pricing, or a genuine deadline.',
      },
      tasks: [
        {
          id: 'fc16-1',
          title: 'Create a limited-time founder\'s offer',
          description:
            'Set a real deadline: "First 5 customers get 50% off for life" or "Founder pricing ends Friday." Make it genuine and time-bound.',
          estimatedMinutes: 15,
          deliverable: 'Limited-time offer created',
        },
        {
          id: 'fc16-2',
          title: 'Send the offer to all warm prospects',
          description: 'Message everyone in your warm pipeline with the time-limited offer. Be direct: "I\'m offering this to 5 people — here\'s what you get."',
          estimatedMinutes: 10,
          deliverable: 'Offer sent to all warm prospects',
        },
        {
          id: 'fc16-3',
          title: 'Send 5 cold outreach DMs',
          description: 'Keep filling the top of funnel with cold outreach while working warm leads at the bottom.',
          estimatedMinutes: 10,
          deliverable: '5 cold DMs sent',
        },
      ],
    },
    {
      dayNumber: 17,
      title: 'Close Attempts',
      subtitle: 'Ask for the sale directly',
      estimatedMinutes: 40,
      founderExample: {
        company: 'Close.com',
        founderName: 'Steli Efti',
        quote:
          'The #1 reason founders don\'t get customers is they never actually ask. They demo, they explain, they follow up — but they don\'t say "want to buy?"',
        lesson: 'At some point, you have to ask. "Would you like to get started?" is the most powerful sales question.',
      },
      tasks: [
        {
          id: 'fc17-1',
          title: 'Send direct close messages to top 5 leads',
          description:
            'For your 5 warmest prospects, send a direct message: "Based on our conversations, I think [product] would really help you with [their specific problem]. Ready to get started? Here\'s the link."',
          estimatedMinutes: 20,
          deliverable: 'Close messages sent to top 5 leads',
        },
        {
          id: 'fc17-2',
          title: 'Handle any objections that come up',
          description: 'If they push back, use your objection scripts from Day 8. Focus on understanding, not overcoming.',
          estimatedMinutes: 10,
          deliverable: 'Objections handled for any responses',
        },
        {
          id: 'fc17-3',
          title: 'Send 5 cold outreach DMs',
          description: 'Keep the outreach engine running regardless of closing activity.',
          estimatedMinutes: 10,
          deliverable: '5 cold DMs sent',
        },
      ],
    },
    {
      dayNumber: 18,
      title: 'Referral Ask',
      subtitle: 'Ask existing contacts to introduce you to others',
      estimatedMinutes: 30,
      founderExample: {
        company: 'Dropbox',
        founderName: 'Drew Houston',
        quote:
          'Our referral program was the engine. But before the program, it was just me asking happy users: "Know anyone who\'d find this useful?"',
        lesson: 'Before you build a referral system, just ask. People are happy to introduce you if they like what you\'re doing.',
      },
      tasks: [
        {
          id: 'fc18-1',
          title: 'Ask 5 contacts for introductions',
          description:
            'Message anyone who tried your product, showed interest, or is in your network: "Do you know anyone who deals with [problem]? I\'d love an intro."',
          estimatedMinutes: 15,
          deliverable: 'Referral requests sent to 5 people',
        },
        {
          id: 'fc18-2',
          title: 'Send 5 cold DMs and follow up with warm leads',
          description: 'Continue outreach and follow-ups. You should be in a rhythm by now.',
          estimatedMinutes: 15,
          deliverable: 'Daily outreach + follow-ups done',
        },
      ],
    },
    {
      dayNumber: 19,
      title: 'Double Down',
      subtitle: 'Increase volume on what\'s working',
      estimatedMinutes: 45,
      founderExample: {
        company: 'Lemlist',
        founderName: 'Guillaume Moubeche',
        quote:
          'When we found that Twitter DMs converted 3x better than email, we stopped emailing and went all-in on Twitter for a month.',
        lesson: 'Once you find what works, stop experimenting and scale the winning approach.',
      },
      tasks: [
        {
          id: 'fc19-1',
          title: 'Send 10 outreach messages (double your usual)',
          description: 'You know what works now. Double down. Send 10 messages today using your best-performing script and channel.',
          estimatedMinutes: 30,
          deliverable: '10 DMs sent in best-performing channel',
        },
        {
          id: 'fc19-2',
          title: 'Follow up with all open conversations',
          description: 'Check every thread. Nudge anyone who went quiet. Re-offer to anyone on the fence.',
          estimatedMinutes: 15,
          deliverable: 'All open threads followed up',
        },
      ],
    },
    {
      dayNumber: 20,
      title: 'Content That Sells',
      subtitle: 'Create one piece of content that drives sign-ups',
      estimatedMinutes: 50,
      founderExample: {
        company: 'Ahrefs',
        founderName: 'Tim Soulo',
        quote:
          'Our best-converting blog post wasn\'t about SEO theory. It was a step-by-step guide that naturally showed Ahrefs as the tool to use.',
        lesson: 'The best sales content teaches something useful and naturally features your product as the solution.',
      },
      tasks: [
        {
          id: 'fc20-1',
          title: 'Write a "how to solve [problem]" post',
          description:
            'Write a short post (Twitter thread, blog post, or LinkedIn article) teaching how to solve the problem your product addresses. Naturally mention your product as a tool.',
          estimatedMinutes: 30,
          deliverable: '1 educational content piece created',
        },
        {
          id: 'fc20-2',
          title: 'Publish and share',
          description: 'Post the content and share it in relevant communities. Respond to all comments.',
          estimatedMinutes: 10,
          deliverable: 'Content published and promoted',
        },
        {
          id: 'fc20-3',
          title: 'Send 5 cold DMs',
          description: 'Keep outreach running alongside content.',
          estimatedMinutes: 10,
          deliverable: '5 more DMs sent',
        },
      ],
    },
    {
      dayNumber: 21,
      title: 'Week 3 Review',
      subtitle: 'Check your progress toward 5 paying customers',
      estimatedMinutes: 35,
      founderExample: {
        company: 'Stripe',
        founderName: 'Patrick Collison',
        quote:
          'We tracked one number obsessively: number of developers processing live payments. Everything else was a vanity metric.',
        lesson: 'At this stage, the only metric that matters is: how many people have paid you?',
      },
      tasks: [
        {
          id: 'fc21-1',
          title: 'Count your paying customers',
          description:
            'How many paying customers do you have? If 5 — you\'re done! If not, how many are close? Calculate: what conversion rate do you need for the final push?',
          estimatedMinutes: 10,
          deliverable: 'Customer count and gap analysis',
        },
        {
          id: 'fc21-2',
          title: 'Review your full funnel',
          description:
            'Total outreach > replies > demos > offers > paid. Where is the biggest drop-off? That\'s what you fix in Week 4.',
          estimatedMinutes: 15,
          deliverable: 'Full funnel drop-off analysis',
        },
        {
          id: 'fc21-3',
          title: 'Plan Week 4 strategy',
          description: 'Based on your gap: do you need more outreach volume, better conversion, or both? Set specific daily targets.',
          estimatedMinutes: 10,
          deliverable: 'Week 4 strategy documented',
        },
      ],
    },

    // === WEEK 4: Repeatable Channel (Days 22-30) ===
    {
      dayNumber: 22,
      title: 'System Building',
      subtitle: 'Turn your outreach into a repeatable daily system',
      estimatedMinutes: 40,
      founderExample: {
        company: 'HubSpot',
        founderName: 'Brian Halligan',
        quote:
          'We built a repeatable sales process before we hired sales people. If the founder can\'t sell it consistently, no one else will be able to.',
        lesson: 'A repeatable process beats random hustle. Document what works so you can do it every day.',
      },
      tasks: [
        {
          id: 'fc22-1',
          title: 'Document your winning playbook',
          description:
            'Write down your daily outreach system: where you find prospects, what message you send, how you follow up, how you close. This is your repeatable channel.',
          estimatedMinutes: 20,
          deliverable: 'Outreach playbook documented',
        },
        {
          id: 'fc22-2',
          title: 'Run the playbook — send 10 DMs',
          description: 'Follow your documented system. Send 10 messages. Track results.',
          estimatedMinutes: 20,
          deliverable: '10 DMs sent using playbook',
        },
      ],
    },
    {
      dayNumber: 23,
      title: 'Playbook Execution',
      subtitle: 'Run the system and close remaining gaps',
      estimatedMinutes: 40,
      founderExample: {
        company: 'ConvertKit',
        founderName: 'Nathan Barry',
        quote:
          'For months, my daily routine was: find 5 potential customers, send 5 emails, follow up on 5 conversations. Every single day. That\'s how I got to $1M.',
        lesson: 'Consistency beats creativity. Do the boring daily work and the results compound.',
      },
      tasks: [
        {
          id: 'fc23-1',
          title: 'Execute daily playbook',
          description: 'Send 10 outreach messages. Follow up with all warm leads. Push for close on hot leads.',
          estimatedMinutes: 30,
          deliverable: 'Daily outreach executed',
        },
        {
          id: 'fc23-2',
          title: 'Close any pending deals',
          description: 'For anyone who said "maybe" or "let me think about it" — reach out with a final nudge or updated offer.',
          estimatedMinutes: 10,
          deliverable: 'All pending leads followed up',
        },
      ],
    },
    {
      dayNumber: 24,
      title: 'Playbook Execution',
      subtitle: 'Maintain daily outreach rhythm',
      estimatedMinutes: 35,
      founderExample: {
        company: 'Basecamp',
        founderName: 'Jason Fried',
        quote: 'Don\'t worry about the perfect strategy. Worry about showing up every day and doing the work.',
        lesson: 'The founders who win are the ones who keep showing up.',
      },
      tasks: [
        {
          id: 'fc24-1',
          title: 'Execute daily playbook',
          description: 'Send 10 outreach messages. Follow up with warm leads. This is the rhythm.',
          estimatedMinutes: 25,
          deliverable: 'Daily outreach done',
        },
        {
          id: 'fc24-2',
          title: 'Track progress toward 5 customers',
          description: 'How many paying customers now? What\'s needed to hit 5?',
          estimatedMinutes: 10,
          deliverable: 'Progress tracked',
        },
      ],
    },
    {
      dayNumber: 25,
      title: 'Playbook Execution',
      subtitle: 'Keep pushing — you\'re in the home stretch',
      estimatedMinutes: 35,
      founderExample: {
        company: 'Pieter Levels',
        founderName: 'Pieter Levels',
        quote: 'I shipped 12 startups in 12 months. Most failed. The ones that worked had one thing in common: I kept talking to users every single day.',
        lesson: 'Most founders quit too early. The ones who reach paying customers are the ones who keep going.',
      },
      tasks: [
        {
          id: 'fc25-1',
          title: 'Execute daily playbook',
          description: 'Send 10 outreach messages. Follow up. Close.',
          estimatedMinutes: 25,
          deliverable: 'Daily outreach done',
        },
        {
          id: 'fc25-2',
          title: 'Try one creative outreach approach',
          description: 'Do something different: record a personalized Loom, write a custom mini-analysis for a prospect, or offer a free workshop.',
          estimatedMinutes: 10,
          deliverable: '1 creative outreach attempt',
        },
      ],
    },
    {
      dayNumber: 26,
      title: 'Playbook Execution',
      subtitle: 'Consistency wins',
      estimatedMinutes: 30,
      founderExample: {
        company: 'Notion',
        founderName: 'Ivan Zhao',
        quote: 'We didn\'t grow fast at first. We grew by talking to every single user individually and making the product better for them.',
        lesson: 'At this stage, every conversation matters. Stay personal.',
      },
      tasks: [
        {
          id: 'fc26-1',
          title: 'Execute daily playbook',
          description: 'Send 10 outreach messages. Follow up. Close.',
          estimatedMinutes: 25,
          deliverable: 'Daily outreach done',
        },
        {
          id: 'fc26-2',
          title: 'Ask existing customers for referrals',
          description: 'If you have paying customers, ask each one: "Know anyone who\'d benefit from this?"',
          estimatedMinutes: 5,
          deliverable: 'Referral asks sent',
        },
      ],
    },
    {
      dayNumber: 27,
      title: 'Playbook Execution',
      subtitle: 'Almost there',
      estimatedMinutes: 30,
      founderExample: {
        company: 'Slack',
        founderName: 'Stewart Butterfield',
        quote: 'We invited 8 companies to test Slack. By the end of the week, none of them wanted to go back to email. That\'s when we knew.',
        lesson: 'If people don\'t want to stop using your product, you have something. Keep going.',
      },
      tasks: [
        {
          id: 'fc27-1',
          title: 'Execute daily playbook',
          description: 'Send 10 outreach messages. Follow up. Close.',
          estimatedMinutes: 25,
          deliverable: 'Daily outreach done',
        },
        {
          id: 'fc27-2',
          title: 'Review and adjust for final push',
          description: 'Are you on track for 5 customers? If not, increase volume or revisit messaging for the final 3 days.',
          estimatedMinutes: 5,
          deliverable: 'Final adjustment noted',
        },
      ],
    },
    {
      dayNumber: 28,
      title: 'Final Push — Day 1',
      subtitle: 'All-out effort on your best channel',
      estimatedMinutes: 50,
      founderExample: {
        company: 'Sahil Lavingia',
        founderName: 'Sahil Lavingia',
        quote: 'The difference between 0 and 1 customers is enormous. The difference between 1 and 5 is just doing the same thing four more times.',
        lesson: 'If you got 1, you can get 5. It\'s the same process — just keep going.',
      },
      tasks: [
        {
          id: 'fc28-1',
          title: 'Send 15 outreach messages',
          description: 'Increase your volume for the final push. Use your best-performing script and channel.',
          estimatedMinutes: 35,
          deliverable: '15 DMs sent',
        },
        {
          id: 'fc28-2',
          title: 'Make a final offer to all warm leads',
          description: 'Last chance message to everyone still on the fence. Genuine deadline, genuine offer.',
          estimatedMinutes: 15,
          deliverable: 'Final offers sent to all warm leads',
        },
      ],
    },
    {
      dayNumber: 29,
      title: 'Final Push — Day 2',
      subtitle: 'Close everything open',
      estimatedMinutes: 45,
      founderExample: {
        company: 'Jason Fried',
        founderName: 'Jason Fried',
        quote: 'Finishing is a skill. Most people start things. The ones who succeed are the ones who finish.',
        lesson: 'You\'re here at Day 29. That alone puts you ahead of most founders. Finish strong.',
      },
      tasks: [
        {
          id: 'fc29-1',
          title: 'Follow up with every open thread',
          description: 'Message every single person who hasn\'t given a definitive yes or no. Get a final answer.',
          estimatedMinutes: 20,
          deliverable: 'All open threads resolved',
        },
        {
          id: 'fc29-2',
          title: 'Send 10 fresh outreach messages',
          description: 'Keep the funnel moving until the last day.',
          estimatedMinutes: 15,
          deliverable: '10 DMs sent',
        },
        {
          id: 'fc29-3',
          title: 'Prepare your Day 30 retrospective',
          description: 'Start collecting your numbers for tomorrow\'s final review.',
          estimatedMinutes: 10,
          deliverable: 'Numbers gathered for retrospective',
        },
      ],
    },
    {
      dayNumber: 30,
      title: 'Retrospective',
      subtitle: 'Document what worked, what didn\'t, and what\'s next',
      estimatedMinutes: 60,
      founderExample: {
        company: 'Paul Graham',
        founderName: 'Paul Graham',
        quote:
          'The most successful YC founders share one trait: they talk to users, ship fast, and review what happened. Then they do it again.',
        lesson:
          'Whether you hit 5 customers or not, you now have real data and a real system. That\'s more than 95% of founders ever get.',
      },
      proTip:
        'If you got 5 customers: congrats, you have a business. If you got 1-4: you have validation and a system to scale. If you got 0: you have invaluable data about what doesn\'t work.',
      tasks: [
        {
          id: 'fc30-1',
          title: 'Document your final metrics',
          description:
            'Total outreach sent, reply rate, demo rate, conversion rate, paying customers, total revenue. Write it all down.',
          estimatedMinutes: 15,
          deliverable: 'Full 30-day metrics documented',
        },
        {
          id: 'fc30-2',
          title: 'Write your repeatable playbook',
          description:
            'Document the system that worked: best channel, best message, best time to send, best follow-up cadence. This is your growth playbook.',
          estimatedMinutes: 20,
          deliverable: 'Repeatable growth playbook',
        },
        {
          id: 'fc30-3',
          title: 'Decide your next move',
          description:
            'Based on your results, decide: (1) Scale the playbook to 50 customers, (2) Pivot if no traction, or (3) Raise funding if you have strong signals. Write your 30-day plan.',
          estimatedMinutes: 15,
          deliverable: 'Next 30-day plan documented',
        },
        {
          id: 'fc30-4',
          title: 'Celebrate',
          description:
            'Regardless of the outcome, you just spent 30 days doing what most founders never do: systematic, daily execution. You have real data, real conversations, and a real playbook.',
          estimatedMinutes: 10,
          deliverable: 'A well-deserved break',
        },
      ],
    },
  ],
};
