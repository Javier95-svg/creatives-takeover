import type { JourneyDefinition } from '@/types/journey';

export const shipMvpIn14Days: JourneyDefinition = {
  slug: 'mvp',
  title: 'Ship MVP in 14 Days',
  tagline: 'From validated idea to a working product people can use',
  description:
    'A structured 14-day sprint to scope, build, and launch your minimum viable product — with daily checkpoints, templates, and founder lessons.',
  totalDays: 14,
  icon: 'Rocket',
  color: 'blue',
  prerequisites: ['validate'],
  nextJourney: 'first-customers',
  days: [
    {
      dayNumber: 1,
      title: 'Scope Lock',
      subtitle: 'Define the ONE thing your MVP does',
      estimatedMinutes: 45,
      founderExample: {
        company: 'Twitter',
        founderName: 'Jack Dorsey',
        quote:
          'The first version of Twitter did one thing: post a 140-character status update. That was it. No replies, no retweets, no DMs.',
        lesson: 'The best MVPs do one thing well. Everything else can wait.',
      },
      proTip: 'If your MVP takes more than 14 days to build, your scope is too big. Cut more.',
      tasks: [
        {
          id: 'm1-1',
          title: 'Write a 1-sentence product description',
          description:
            'Complete: "[Product] lets [who] [do one thing] in [simple way]." This is your scope boundary — anything outside this sentence is out of scope.',
          estimatedMinutes: 10,
          deliverable: 'A 1-sentence product description',
        },
        {
          id: 'm1-2',
          title: 'List your must-have features (max 3)',
          description:
            'Write down the absolute minimum features needed for a user to get value. If you have more than 3, cut until you have 3. Be ruthless.',
          estimatedMinutes: 15,
          deliverable: 'A list of 3 or fewer core features',
          template: {
            id: 'tmpl-mvp-scope',
            title: 'MVP Scope Lock Template',
            description: 'Define your MVP scope with clear boundaries.',
            content: `# MVP Scope Lock

## Product: {{product_name}}

### 1-Sentence Description:
"{{product_name}} lets {{who}} {{do_what}} in {{how}}."

### Must-Have Features (max 3):
1. {{feature_1}} — because without this, users get zero value
2. {{feature_2}} — because this is the core action
3. {{feature_3}} — because this closes the loop

### Explicitly OUT of Scope:
- {{cut_1}}
- {{cut_2}}
- {{cut_3}}

### Definition of "Done" for MVP:
A user can {{core_action}} from start to finish without help.

---

**Rule**: If it's not in the 3 features above, it waits until after launch.`,
            placeholders: ['{{product_name}}', '{{who}}', '{{do_what}}', '{{how}}', '{{feature_1}}', '{{feature_2}}', '{{feature_3}}'],
          },
        },
        {
          id: 'm1-3',
          title: 'Write your "done" definition',
          description:
            'What does a user need to be able to do, end to end, for the MVP to be "done"? Write it as: "A user can [action] from start to finish."',
          estimatedMinutes: 10,
          deliverable: 'A clear definition of MVP "done"',
        },
      ],
    },
    {
      dayNumber: 2,
      title: 'Stack Selection',
      subtitle: 'Pick your tools and set up your workspace',
      estimatedMinutes: 60,
      founderExample: {
        company: 'Pieter Levels / Nomad List',
        founderName: 'Pieter Levels',
        quote:
          'I built Nomad List with PHP, jQuery, and a spreadsheet as the database. It made $1M+. Your stack doesn\'t matter — shipping does.',
        lesson: 'Use what you know. The best stack is the one that lets you ship fastest.',
      },
      tasks: [
        {
          id: 'm2-1',
          title: 'Choose your tech stack',
          description:
            'Use the Tech Stack Builder or pick from what you know best. Prioritize speed-to-ship over "best practice." If you\'re non-technical, consider no-code tools.',
          estimatedMinutes: 20,
          deliverable: 'Tech stack decided',
          toolLink: {
            label: 'Open Tech Stack Builder',
            href: '/tech-stack',
          },
        },
        {
          id: 'm2-2',
          title: 'Set up your repo and hosting',
          description:
            'Create a git repo (GitHub/GitLab), set up your project scaffold, and choose hosting (Vercel, Railway, Fly.io, etc.). Deploy a "Hello World" to confirm it works.',
          estimatedMinutes: 30,
          deliverable: 'Repo created + hello world deployed',
        },
        {
          id: 'm2-3',
          title: 'Set up your project board',
          description:
            'Create a simple task board (GitHub Issues, Notion, Linear, or a text file) with your 3 core features broken into small tasks. Don\'t over-plan.',
          estimatedMinutes: 10,
          deliverable: 'Project board with feature tasks',
        },
      ],
    },
    {
      dayNumber: 3,
      title: 'User Flow Design',
      subtitle: 'Map the journey from start to value',
      estimatedMinutes: 45,
      founderExample: {
        company: 'Instagram',
        founderName: 'Kevin Systrom',
        quote:
          'Instagram v1 had a dead-simple flow: open app, take photo, apply filter, share. Three screens, one action. That\'s it.',
        lesson: 'Great products have a clear, short path from opening the app to getting value.',
      },
      tasks: [
        {
          id: 'm3-1',
          title: 'Sketch your 3-screen user flow',
          description:
            'Draw (on paper or whiteboard) the 3 key screens a user goes through: (1) Entry/landing, (2) Core action, (3) Result/confirmation. Keep it to 3.',
          estimatedMinutes: 20,
          deliverable: 'A 3-screen user flow sketch',
        },
        {
          id: 'm3-2',
          title: 'Define the happy path',
          description:
            'Write the step-by-step flow for a user who does everything right: "User lands on page > clicks X > enters Y > sees Z." This is what you build first.',
          estimatedMinutes: 15,
          deliverable: 'Happy path documented step by step',
        },
        {
          id: 'm3-3',
          title: 'Identify the #1 moment of value',
          description:
            'What is the exact moment a user thinks "this is useful"? Circle it in your flow. Everything you build should get the user to this moment as fast as possible.',
          estimatedMinutes: 10,
          deliverable: 'Value moment identified and highlighted',
        },
      ],
    },
    {
      dayNumber: 4,
      title: 'Landing Page',
      subtitle: 'Build the page that explains and sells your MVP',
      estimatedMinutes: 90,
      founderExample: {
        company: 'Dropbox',
        founderName: 'Drew Houston',
        quote:
          'Our landing page was a 3-minute demo video explaining what Dropbox does. That single page drove 75,000 signups before we had a product.',
        lesson: 'Your landing page is your first product. If you can\'t explain it on one page, you can\'t build it.',
      },
      tasks: [
        {
          id: 'm4-1',
          title: 'Write your headline and subheadline',
          description:
            'Your headline = the value prop from Day 1. Your subheadline = who it\'s for + how it works in one sentence.',
          estimatedMinutes: 20,
          deliverable: 'Landing page headline + subheadline',
          template: {
            id: 'tmpl-landing-copy',
            title: 'Landing Page Copy Framework',
            description: 'A fill-in-the-blank framework for your MVP landing page.',
            content: `# Landing Page Copy Framework

## Above the Fold:

**Headline**: {{value_prop}}

**Subheadline**: {{product_name}} helps {{who}} {{do_what}} — in {{timeframe}}.

**CTA Button**: {{cta_text}} (e.g., "Try it free", "Get early access", "Start now")

---

## Section 2: The Problem
"If you're a {{target_customer}}, you probably deal with {{pain_point}}. Most people {{current_workaround}}, which is {{why_that_sucks}}."

## Section 3: The Solution (3 bullets max)
- {{benefit_1}} — {{short_explanation}}
- {{benefit_2}} — {{short_explanation}}
- {{benefit_3}} — {{short_explanation}}

## Section 4: How It Works (3 steps)
1. {{step_1}} — {{what_happens}}
2. {{step_2}} — {{what_happens}}
3. {{step_3}} — {{what_happens}}

## Section 5: CTA
"{{final_cta}}"

---

**Guidelines**:
- Keep total word count under 300
- Use customer language, not jargon
- One CTA per section maximum`,
            placeholders: ['{{value_prop}}', '{{product_name}}', '{{who}}', '{{do_what}}', '{{cta_text}}'],
          },
        },
        {
          id: 'm4-2',
          title: 'Build and deploy your landing page',
          description:
            'Use the copy framework to build a real landing page. Can be a single HTML page, a Carrd site, or a route in your app. Include headline, 3 benefits, how-it-works, and a CTA.',
          estimatedMinutes: 60,
          deliverable: 'A live landing page with CTA',
        },
        {
          id: 'm4-3',
          title: 'Add an email capture or waitlist',
          description:
            'Set up a way to collect emails from interested visitors (Buttondown, Mailchimp, Supabase, or a simple form). This builds your launch list.',
          estimatedMinutes: 10,
          deliverable: 'Email capture form live on landing page',
        },
      ],
    },
    {
      dayNumber: 5,
      title: 'Core Feature Build — Part 1',
      subtitle: 'Start building the main thing your product does',
      estimatedMinutes: 120,
      founderExample: {
        company: 'Stripe',
        founderName: 'Patrick Collison',
        quote:
          'The first version of Stripe was 7 lines of code to accept a payment. We didn\'t build a dashboard, analytics, or fraud detection. Just: take money.',
        lesson: 'Build the absolute core first. Polish and features come after someone pays you.',
      },
      proTip: 'Ship ugly. If you\'re not embarrassed by v1, you launched too late.',
      tasks: [
        {
          id: 'm5-1',
          title: 'Build Feature #1 — the core action',
          description:
            'Implement the primary thing your product does. This should be the action from your "done" definition on Day 1. Focus on function, not design.',
          estimatedMinutes: 90,
          deliverable: 'Core feature working (even if ugly)',
          toolLink: {
            label: 'Get AI Help',
            href: '/bizmap-ai',
          },
        },
        {
          id: 'm5-2',
          title: 'Test it yourself end-to-end',
          description:
            'Walk through your product as if you were a new user. Can you complete the core action from start to finish? Note any blockers.',
          estimatedMinutes: 30,
          deliverable: 'Core action tested + blockers documented',
        },
      ],
    },
    {
      dayNumber: 6,
      title: 'Core Feature Build — Part 2',
      subtitle: 'Complete the remaining must-have features',
      estimatedMinutes: 120,
      founderExample: {
        company: 'Figma',
        founderName: 'Dylan Field',
        quote:
          'Our first demo was just a box you could draw and move around in a browser. But it proved the concept: real-time collaborative design was possible.',
        lesson: 'Your MVP doesn\'t need to be complete. It needs to prove the concept works.',
      },
      tasks: [
        {
          id: 'm6-1',
          title: 'Build Features #2 and #3',
          description:
            'Implement the remaining 1-2 features from your Day 1 scope. Keep them minimal — the goal is functional, not polished.',
          estimatedMinutes: 90,
          deliverable: 'All 3 core features working',
        },
        {
          id: 'm6-2',
          title: 'Connect the features into a complete flow',
          description:
            'Make sure a user can move through Feature 1 > Feature 2 > Feature 3 in a logical order. Fix any broken links or dead ends.',
          estimatedMinutes: 30,
          deliverable: 'Complete user flow working end-to-end',
        },
      ],
    },
    {
      dayNumber: 7,
      title: 'Checkpoint',
      subtitle: 'Demo to a real person and collect feedback',
      estimatedMinutes: 60,
      founderExample: {
        company: 'Airbnb',
        founderName: 'Brian Chesky',
        quote:
          'We went door to door in New York, showed hosts how to use Airbnb, and took professional photos of their apartments. We got our feedback in person.',
        lesson: 'The best feedback comes from watching someone use your product in real time.',
      },
      tasks: [
        {
          id: 'm7-1',
          title: 'Demo to 1 real person',
          description:
            'Show your MVP to someone who fits your target customer profile. Share your screen or sit next to them. Watch where they get confused. Don\'t explain — observe.',
          estimatedMinutes: 30,
          deliverable: 'Feedback from 1 real user',
        },
        {
          id: 'm7-2',
          title: 'Document the top 3 issues',
          description:
            'After the demo, write down the 3 biggest problems: confusion points, missing features, or broken flows. Rank them by impact.',
          estimatedMinutes: 15,
          deliverable: '3 prioritized issues from user feedback',
        },
        {
          id: 'm7-3',
          title: 'Decide what to fix vs. skip',
          description:
            'For each issue: is it a blocker (must fix), a nice-to-have (fix if time), or out of scope (skip)? You have 7 days left — be realistic.',
          estimatedMinutes: 15,
          deliverable: 'Prioritized fix list for next 7 days',
        },
      ],
    },
    {
      dayNumber: 8,
      title: 'Fix & Iterate — Day 1',
      subtitle: 'Address the #1 issue from your checkpoint',
      estimatedMinutes: 90,
      founderExample: {
        company: 'Slack',
        founderName: 'Stewart Butterfield',
        quote:
          'We launched Slack to 8 companies first. Their feedback shaped everything — the channels, the notifications, the search. V1 was built on user input.',
        lesson: 'Early feedback is gold. The faster you fix real issues, the faster you find product-market fit.',
      },
      tasks: [
        {
          id: 'm8-1',
          title: 'Fix issue #1 from your checkpoint',
          description: 'Tackle the biggest blocker from your Day 7 demo. This is the change with the most impact on user experience.',
          estimatedMinutes: 60,
          deliverable: 'Issue #1 resolved',
        },
        {
          id: 'm8-2',
          title: 'Fix issue #2',
          description: 'Move to the second priority issue. If it\'s quick, ship it. If not, simplify the fix.',
          estimatedMinutes: 30,
          deliverable: 'Issue #2 resolved or simplified',
        },
      ],
    },
    {
      dayNumber: 9,
      title: 'Fix & Iterate — Day 2',
      subtitle: 'Continue fixing and add basic polish',
      estimatedMinutes: 90,
      founderExample: {
        company: 'Notion',
        founderName: 'Ivan Zhao',
        quote:
          'We spent years on Notion before it worked. The lesson wasn\'t "be patient" — it was "get feedback earlier so you iterate faster."',
        lesson: 'Speed of iteration beats quality of first attempt.',
      },
      tasks: [
        {
          id: 'm9-1',
          title: 'Fix issue #3 and any remaining blockers',
          description: 'Address the last priority issue from Day 7 and fix any bugs that surfaced during development.',
          estimatedMinutes: 45,
          deliverable: 'All critical issues resolved',
        },
        {
          id: 'm9-2',
          title: 'Add basic visual polish',
          description:
            'Make the UI look presentable: consistent spacing, readable fonts, clear buttons. Not beautiful — just not embarrassing.',
          estimatedMinutes: 45,
          deliverable: 'UI cleaned up to presentable level',
        },
      ],
    },
    {
      dayNumber: 10,
      title: 'Fix & Iterate — Day 3',
      subtitle: 'Final fixes and basic error handling',
      estimatedMinutes: 60,
      founderExample: {
        company: 'Linear',
        founderName: 'Karri Saarinen',
        quote:
          'We shipped Linear to a tiny group and iterated weekly for months. Speed and quality came from tight feedback loops, not big launches.',
        lesson: 'Tight iterations with real users beats building in isolation.',
      },
      tasks: [
        {
          id: 'm10-1',
          title: 'Add basic error handling',
          description:
            'Add error states for the most common failures: network errors, empty states, invalid input. Users should never see a blank screen or cryptic error.',
          estimatedMinutes: 30,
          deliverable: 'Basic error handling in place',
        },
        {
          id: 'm10-2',
          title: 'Test the full flow one more time',
          description:
            'Walk through the complete user flow as a new user. Is it clear? Does it work? Are there dead ends? Fix any last blockers.',
          estimatedMinutes: 30,
          deliverable: 'Full flow tested and working',
        },
      ],
    },
    {
      dayNumber: 11,
      title: 'Payment Setup',
      subtitle: 'Add a way for users to pay you',
      estimatedMinutes: 90,
      founderExample: {
        company: 'Gumroad',
        founderName: 'Sahil Lavingia',
        quote:
          'I built the first version of Gumroad in a weekend. The most important feature wasn\'t the design — it was the "Buy" button that actually charged a credit card.',
        lesson: 'If you can\'t charge money, you don\'t have a business. Add payments early.',
      },
      tasks: [
        {
          id: 'm11-1',
          title: 'Choose and integrate a payment provider',
          description:
            'Set up Stripe, Lemon Squeezy, or Gumroad. Add a checkout flow or payment button to your product. Test with a $1 charge.',
          estimatedMinutes: 60,
          deliverable: 'Payment flow working (test transaction confirmed)',
          template: {
            id: 'tmpl-pricing',
            title: 'Pricing Decision Framework',
            description: 'A simple framework to set your initial price.',
            content: `# Pricing Decision Framework

## Step 1: Pick a Model
- [ ] One-time purchase (simple, good for tools/templates)
- [ ] Monthly subscription (good for ongoing value/SaaS)
- [ ] Usage-based (good for APIs, credits, per-action tools)
- [ ] Freemium + paid tier (good for building a user base first)

## Step 2: Set Your Price
**Anchor**: What do competitors charge? {{competitor_price}}
**Value**: How much time/money does your product save? {{value_saved}}
**Floor**: What's the minimum price that makes this worth your time? {{min_price}}

**Your Price**: \${{your_price}} / {{period}}

## Step 3: Test It
- Launch at your price for 2 weeks
- Track: how many people see price vs. how many pay
- If conversion < 2%, the price might be too high OR the value isn't clear
- If conversion > 10%, you might be undercharging

## Common Mistakes:
- Pricing too low out of fear (founders undercharge 90% of the time)
- Offering too many tiers (start with ONE price)
- Not showing the price upfront (transparency builds trust)`,
            placeholders: ['{{competitor_price}}', '{{value_saved}}', '{{min_price}}', '{{your_price}}', '{{period}}'],
          },
        },
        {
          id: 'm11-2',
          title: 'Set your launch price',
          description:
            'Use the pricing framework to decide your initial price. Remember: you can always change it. Start with something and learn.',
          estimatedMinutes: 20,
          deliverable: 'Launch price decided',
        },
        {
          id: 'm11-3',
          title: 'Add pricing to your landing page',
          description: 'Update your landing page with your price and payment CTA. Make it clear what the user gets and what it costs.',
          estimatedMinutes: 10,
          deliverable: 'Pricing displayed on landing page',
        },
      ],
    },
    {
      dayNumber: 12,
      title: 'Onboarding Flow',
      subtitle: 'Help new users get value in under 2 minutes',
      estimatedMinutes: 60,
      founderExample: {
        company: 'Canva',
        founderName: 'Melanie Perkins',
        quote:
          'We made sure anyone could create a professional design in under 5 minutes. If onboarding takes longer than the task itself, you\'ve lost them.',
        lesson: 'Onboarding isn\'t about teaching every feature. It\'s about getting the user to their first success as fast as possible.',
      },
      tasks: [
        {
          id: 'm12-1',
          title: 'Build a 3-step welcome flow',
          description:
            'Create a simple onboarding: (1) Welcome + what to expect, (2) One setup action (e.g., name, preference), (3) Jump into core action. Three screens max.',
          estimatedMinutes: 40,
          deliverable: 'Onboarding flow implemented',
        },
        {
          id: 'm12-2',
          title: 'Add an empty state with a clear CTA',
          description:
            'When a user first enters the main view, don\'t show a blank page. Show a helpful message + button: "No [items] yet. Create your first one."',
          estimatedMinutes: 20,
          deliverable: 'Empty states with CTAs for key views',
        },
      ],
    },
    {
      dayNumber: 13,
      title: 'Pre-Launch Prep',
      subtitle: 'Prepare everything to go live tomorrow',
      estimatedMinutes: 60,
      founderExample: {
        company: 'Product Hunt',
        founderName: 'Ryan Hoover',
        quote:
          'Product Hunt started as an email list. The "launch" was emailing 20 people. Don\'t overthink your launch — just tell people about it.',
        lesson: 'Your first launch isn\'t about going viral. It\'s about getting 10 people to try your product.',
      },
      tasks: [
        {
          id: 'm13-1',
          title: 'Write your launch announcement',
          description:
            'Write a short post (for Twitter/X, LinkedIn, or email) announcing your product: what it does, who it\'s for, and a link. Keep it under 200 words.',
          estimatedMinutes: 20,
          deliverable: 'Launch post draft ready',
          template: {
            id: 'tmpl-launch-post',
            title: 'Launch Announcement Template',
            description: 'A template for your first public announcement.',
            content: `# Launch Announcement Template

## Short Version (Twitter/X):

I just shipped {{product_name}} -- a {{one_liner}}.

Built it in 14 days from scratch.

If you're a {{target_customer}} who struggles with {{pain_point}}, I'd love for you to try it:

{{link}}

What do you think?

---

## Longer Version (LinkedIn/Email):

Hey! I've been working on something and it's finally live.

**{{product_name}}** helps {{who}} {{do_what}} without {{pain_point}}.

Here's what it does:
- {{benefit_1}}
- {{benefit_2}}
- {{benefit_3}}

I built this because {{personal_reason}}.

I'd love early feedback from anyone who deals with {{problem}}.

Try it here: {{link}}

---

**Tips:**
- Be personal, not corporate
- Mention it's early/MVP -- people love supporting builders
- Ask for feedback, not just downloads`,
            placeholders: ['{{product_name}}', '{{one_liner}}', '{{target_customer}}', '{{pain_point}}', '{{link}}'],
          },
        },
        {
          id: 'm13-2',
          title: 'Prepare 3 social posts',
          description:
            'Write 3 different posts for different platforms or angles. Mix: product story, problem you solve, behind-the-scenes build. Schedule or save as drafts.',
          estimatedMinutes: 20,
          deliverable: '3 social media posts drafted',
        },
        {
          id: 'm13-3',
          title: 'Final pre-launch checklist',
          description:
            'Confirm: landing page live, payment working, onboarding flow working, error handling in place, email from friends/waitlist ready to notify.',
          estimatedMinutes: 20,
          deliverable: 'Pre-launch checklist complete',
        },
      ],
    },
    {
      dayNumber: 14,
      title: 'Ship It',
      subtitle: 'Deploy to production and tell the world',
      estimatedMinutes: 60,
      founderExample: {
        company: 'Basecamp',
        founderName: 'Jason Fried',
        quote:
          'We launched Basecamp to our existing audience of web designers. We didn\'t chase press or viral growth. We told people we trusted and asked them to try it.',
        lesson: 'Your first 10 users are more valuable than your first 10,000 pageviews. Launch to people, not platforms.',
      },
      proTip: 'Done is better than perfect. You can always improve it tomorrow.',
      tasks: [
        {
          id: 'm14-1',
          title: 'Deploy your final build to production',
          description:
            'Push your latest code to production. Confirm everything works on the live URL. Double-check payment flow with a real test.',
          estimatedMinutes: 15,
          deliverable: 'Product live in production',
        },
        {
          id: 'm14-2',
          title: 'Publish your launch announcement',
          description:
            'Post your launch announcement from Day 13. Share in communities where your target users hang out. Email your waitlist if you have one.',
          estimatedMinutes: 15,
          deliverable: 'Launch announced publicly',
        },
        {
          id: 'm14-3',
          title: 'Send it to 10 specific people',
          description:
            'Don\'t just post and hope. Send your product link directly to 10 people who fit your target customer profile. Personal messages convert better than public posts.',
          estimatedMinutes: 20,
          deliverable: '10 personal outreach messages sent',
        },
        {
          id: 'm14-4',
          title: 'Plan your next step',
          description:
            'You shipped! Now decide: start the "Get 5 Paying Users in 30 Days" journey, keep iterating based on feedback, or take a day off. Write down your plan.',
          estimatedMinutes: 10,
          deliverable: 'Next step documented',
        },
      ],
    },
  ],
};
