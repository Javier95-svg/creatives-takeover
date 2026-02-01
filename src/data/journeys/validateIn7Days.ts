import type { JourneyDefinition } from '@/types/journey';

export const validateIn7Days: JourneyDefinition = {
  slug: 'validate',
  title: 'Validate in 7 Days',
  tagline: 'From scattered ideas to a validated concept',
  description:
    'A focused 7-day sprint to narrow your ideas, test demand signals, and choose what to build — with daily tasks, templates, and real founder examples.',
  totalDays: 7,
  icon: 'Target',
  color: 'emerald',
  nextJourney: 'mvp',
  days: [
    {
      dayNumber: 1,
      title: 'Brain Dump',
      subtitle: 'Get every idea out of your head and onto paper',
      estimatedMinutes: 45,
      founderExample: {
        company: 'Stripe',
        founderName: 'Patrick Collison',
        quote:
          'We didn\'t start with "build a payments company." We started by asking devs one question: do you hate integrating payments?',
        lesson:
          'The best ideas come from noticing a specific pain, not from brainstorming big visions.',
      },
      proTip:
        'Quantity over quality today. Don\'t filter — just dump. You\'ll score them on Day 3.',
      tasks: [
        {
          id: 'v1-1',
          title: 'List every business idea you have',
          description:
            'Set a 15-minute timer. Write down every idea, side project, or problem you\'ve noticed — no matter how rough. Aim for 10+.',
          estimatedMinutes: 15,
          deliverable: 'A raw list of 10+ ideas',
        },
        {
          id: 'v1-2',
          title: 'Write each idea as a 1-sentence pitch',
          description:
            'For each idea, write: "I help [who] do [what] so they can [outcome]." This forces clarity.',
          estimatedMinutes: 20,
          deliverable: 'Each idea described in 1 sentence',
          template: {
            id: 'tmpl-1sentence',
            title: '1-Sentence Pitch Template',
            description: 'Fill in the blanks to clarify each idea.',
            content: `# 1-Sentence Pitch Template

For each idea, fill in:

**I help [WHO] do [WHAT] so they can [OUTCOME].**

---

### Examples:
- I help freelance designers find clients so they can stop relying on cold outreach.
- I help remote teams run async standups so they can skip daily video calls.
- I help first-time founders validate ideas so they can stop building things nobody wants.

---

### Your Ideas:

1. I help {{who_1}} do {{what_1}} so they can {{outcome_1}}.
2. I help {{who_2}} do {{what_2}} so they can {{outcome_2}}.
3. I help {{who_3}} do {{what_3}} so they can {{outcome_3}}.`,
            placeholders: ['{{who_1}}', '{{what_1}}', '{{outcome_1}}', '{{who_2}}', '{{what_2}}', '{{outcome_2}}', '{{who_3}}', '{{what_3}}', '{{outcome_3}}'],
          },
        },
        {
          id: 'v1-3',
          title: 'Pick your top 3 ideas',
          description:
            'Gut-check your list. Which 3 excite you the most AND seem like real problems? Star them. You\'ll score these rigorously on Day 3.',
          estimatedMinutes: 10,
          deliverable: '3 ideas selected for deeper evaluation',
        },
      ],
    },
    {
      dayNumber: 2,
      title: 'Problem Sharpening',
      subtitle: 'Get crystal clear on the problem behind each idea',
      estimatedMinutes: 60,
      founderExample: {
        company: 'Airbnb',
        founderName: 'Brian Chesky',
        quote:
          'We didn\'t build Airbnb because we loved travel. We built it because we couldn\'t afford rent and noticed others had the same problem.',
        lesson:
          'The strongest ideas come from problems you\'ve personally experienced or observed up close.',
      },
      proTip:
        'If you can\'t clearly articulate who has the problem and why it hurts, the idea isn\'t ready.',
      tasks: [
        {
          id: 'v2-1',
          title: 'Answer 3 questions for each idea',
          description:
            'For each of your top 3 ideas, write clear answers to: (1) Who specifically has this problem? (2) How painful is it on a scale of 1-10? (3) What do they currently do to solve it?',
          estimatedMinutes: 30,
          deliverable: '3 ideas with problem clarity answers',
          template: {
            id: 'tmpl-problem-clarity',
            title: 'Problem Clarity Worksheet',
            description: 'Answer these questions for each of your top 3 ideas.',
            content: `# Problem Clarity Worksheet

## Idea 1: {{idea_name_1}}

**Who specifically has this problem?**
(Be specific: "freelance graphic designers with 2-5 years experience" not "designers")

{{answer}}

**How painful is it? (1-10)**
1 = mild annoyance, 10 = they lose sleep over it

{{pain_score}} / 10

**What do they currently do to solve it?**
(Existing tools, manual workarounds, or nothing at all)

{{current_solution}}

---

## Idea 2: {{idea_name_2}}

**Who specifically has this problem?**
{{answer}}

**How painful is it? (1-10)**
{{pain_score}} / 10

**What do they currently do to solve it?**
{{current_solution}}

---

## Idea 3: {{idea_name_3}}

**Who specifically has this problem?**
{{answer}}

**How painful is it? (1-10)**
{{pain_score}} / 10

**What do they currently do to solve it?**
{{current_solution}}`,
            placeholders: ['{{idea_name_1}}', '{{idea_name_2}}', '{{idea_name_3}}', '{{answer}}', '{{pain_score}}', '{{current_solution}}'],
          },
        },
        {
          id: 'v2-2',
          title: 'Identify the existing workaround',
          description:
            'For each idea, Google how people solve this problem today. Find at least 2 existing solutions or workarounds. If nobody is doing anything — that might mean the problem isn\'t painful enough.',
          estimatedMinutes: 20,
          deliverable: '2+ existing solutions identified per idea',
        },
        {
          id: 'v2-3',
          title: 'Rank your ideas by problem strength',
          description:
            'Based on your answers, stack-rank your 3 ideas. Put the one with the clearest, most painful, most underserved problem at the top.',
          estimatedMinutes: 10,
          deliverable: 'Ranked list of 3 ideas by problem strength',
        },
      ],
    },
    {
      dayNumber: 3,
      title: 'Signal Scoring',
      subtitle: 'Score your ideas with real market signals',
      estimatedMinutes: 45,
      founderExample: {
        company: 'Dropbox',
        founderName: 'Drew Houston',
        quote:
          'Before writing a line of code, I made a demo video explaining what Dropbox would do. The waitlist went from 5,000 to 75,000 overnight.',
        lesson:
          'You don\'t need a product to test demand. A clear explanation of the problem + solution is enough.',
      },
      proTip:
        'Use the Decision Sprint tool to score systematically — don\'t just go with your gut.',
      tasks: [
        {
          id: 'v3-1',
          title: 'Run the Decision Sprint scorecard',
          description:
            'Open the Decision Sprint tool and score each of your top ideas on: problem severity, frequency, willingness to pay, reachable customer, differentiation, founder advantage, and early evidence.',
          estimatedMinutes: 25,
          deliverable: 'Scored ideas in the Decision Sprint tool',
          toolLink: {
            label: 'Open Decision Sprint',
            href: '/validate',
          },
        },
        {
          id: 'v3-2',
          title: 'Check demand signals online',
          description:
            'For your top-scoring idea, search for: Google Trends interest, Reddit/Twitter complaints, competitor ads (are people spending money to solve this?), and paid alternatives.',
          estimatedMinutes: 15,
          deliverable: '3+ demand signals documented',
        },
        {
          id: 'v3-3',
          title: 'Select your top 1-2 ideas to test',
          description:
            'Based on your Decision Sprint scores and demand signals, narrow to 1-2 ideas. You\'ll test these directly with real people tomorrow.',
          estimatedMinutes: 5,
          deliverable: '1-2 ideas selected for customer discovery',
        },
      ],
    },
    {
      dayNumber: 4,
      title: 'Customer Discovery',
      subtitle: 'Talk to real people who have the problem',
      estimatedMinutes: 60,
      founderExample: {
        company: 'Superhuman',
        founderName: 'Rahul Vohra',
        quote:
          'We asked users: "How would you feel if you could no longer use Superhuman?" When 40%+ said "very disappointed," we knew we had product-market fit.',
        lesson:
          'Talking to potential users early is the fastest way to de-risk your idea. 5 conversations > 50 hours of research.',
      },
      tasks: [
        {
          id: 'v4-1',
          title: 'Find 5 people who have the problem',
          description:
            'Search LinkedIn, Twitter/X, Reddit communities, Slack groups, or your personal network for people who match your target customer. Make a list of 5+ names.',
          estimatedMinutes: 15,
          deliverable: 'List of 5+ potential customers with contact info',
        },
        {
          id: 'v4-2',
          title: 'Write your outreach DM',
          description:
            'Write a short, non-salesy message asking if they\'d be open to a 10-minute chat about [the problem]. Use the DM script template.',
          estimatedMinutes: 15,
          deliverable: 'A ready-to-send outreach DM',
          template: {
            id: 'tmpl-dm-script',
            title: 'Cold Outreach DM Script',
            description: 'A non-salesy script for reaching out to potential customers.',
            content: `# Cold Outreach DM Script

## The Template

Hey {{first_name}},

I noticed you {{context_reason}} — I'm researching how {{target_group}} deal with {{problem_area}} and would love to hear your experience.

Would you be open to a quick 10-min chat this week? No pitch, just trying to understand the problem better.

Either way, appreciate your time!

---

## Key Principles:
- **Lead with THEIR context**, not your idea
- **Ask about the PROBLEM**, don't pitch a solution
- **Keep it short** — under 60 words
- **No pitch promise** — reduces friction

---

## Example Fills:

**For a freelancer productivity tool:**
> Hey Sarah, I noticed you've been freelancing for a few years — I'm researching how independent designers deal with managing multiple client projects and would love to hear your experience.

**For a meal planning app:**
> Hey Mike, I saw your post about meal prepping — I'm researching how busy parents deal with weekly meal planning and would love to hear your experience.`,
            placeholders: ['{{first_name}}', '{{context_reason}}', '{{target_group}}', '{{problem_area}}'],
          },
        },
        {
          id: 'v4-3',
          title: 'Send 5 outreach messages',
          description:
            'Customize your DM for each person and hit send. Track who you messaged in a simple spreadsheet or notes app. Don\'t overthink — just send.',
          estimatedMinutes: 30,
          deliverable: '5 outreach messages sent',
        },
      ],
    },
    {
      dayNumber: 5,
      title: 'Evidence Collection',
      subtitle: 'Log responses and score real interest',
      estimatedMinutes: 40,
      founderExample: {
        company: 'Buffer',
        founderName: 'Joel Gascoigne',
        quote:
          'I put up a landing page with just a pricing page — no product. When people clicked "buy," I knew there was real demand before I built anything.',
        lesson:
          'Real evidence is people taking action (replying, clicking, paying) — not people saying "cool idea."',
      },
      proTip:
        'Polite interest ("sounds cool!") is not validation. Look for urgency: questions, follow-ups, "when can I use this?"',
      tasks: [
        {
          id: 'v5-1',
          title: 'Log all responses',
          description:
            'For each person you messaged, record: Did they reply? What did they say? Did they ask follow-up questions? Rate their interest: ignored / polite / excited.',
          estimatedMinutes: 15,
          deliverable: 'Response log with interest ratings',
          template: {
            id: 'tmpl-response-log',
            title: 'Response Tracking Log',
            description: 'Track and score responses from your outreach.',
            content: `# Response Tracking Log

| Person | Replied? | Interest Level | Key Quote | Follow-up? |
|--------|----------|---------------|-----------|------------|
| {{name_1}} | Yes / No | Ignored / Polite / Excited | "..." | Yes / No |
| {{name_2}} | Yes / No | Ignored / Polite / Excited | "..." | Yes / No |
| {{name_3}} | Yes / No | Ignored / Polite / Excited | "..." | Yes / No |
| {{name_4}} | Yes / No | Ignored / Polite / Excited | "..." | Yes / No |
| {{name_5}} | Yes / No | Ignored / Polite / Excited | "..." | Yes / No |

---

## Scoring Guide:
- **Ignored**: No reply after 48 hours
- **Polite**: Replied but no real engagement ("sounds cool", "interesting")
- **Excited**: Asked questions, wanted to know more, offered to test, shared their pain

## Signal Strength:
- 0-1 Excited replies out of 5 = Weak signal. Consider pivoting.
- 2-3 Excited replies = Moderate signal. Worth exploring deeper.
- 4-5 Excited replies = Strong signal. Move to validation.`,
            placeholders: ['{{name_1}}', '{{name_2}}', '{{name_3}}', '{{name_4}}', '{{name_5}}'],
          },
        },
        {
          id: 'v5-2',
          title: 'Tally your demand signals',
          description:
            'Count: How many replied? How many showed genuine interest? Did anyone ask when they could use it or offer to pay? Write a 2-sentence summary of what you learned.',
          estimatedMinutes: 15,
          deliverable: 'Demand signal tally + 2-sentence summary',
        },
        {
          id: 'v5-3',
          title: 'Send follow-ups to interested people',
          description:
            'For anyone who showed interest, send a follow-up offering a quick 10-minute call. This is where real insights happen.',
          estimatedMinutes: 10,
          deliverable: 'Follow-up messages sent to interested prospects',
        },
      ],
    },
    {
      dayNumber: 6,
      title: 'PMF Pre-Check',
      subtitle: 'Pressure-test your idea against the market',
      estimatedMinutes: 50,
      founderExample: {
        company: 'Notion',
        founderName: 'Ivan Zhao',
        quote:
          'We almost ran out of money twice. What saved us was obsessing over a tiny group of power users who genuinely couldn\'t live without the product.',
        lesson:
          'Product-market fit isn\'t about everyone loving your idea. It\'s about a small group who can\'t live without it.',
      },
      tasks: [
        {
          id: 'v6-1',
          title: 'Run the PMF Lab on your top idea',
          description:
            'Open the PMF Lab and work through the problem statement, market need, and competitive landscape for your top idea. Be honest — the score is for you, not for show.',
          estimatedMinutes: 25,
          deliverable: 'PMF Lab analysis completed',
          toolLink: {
            label: 'Open PMF Lab',
            href: '/pmf-lab',
          },
        },
        {
          id: 'v6-2',
          title: 'Research 3 competitors or alternatives',
          description:
            'Find 3 products/services that solve a similar problem. For each, note: what they charge, what users complain about, and what gap you could fill.',
          estimatedMinutes: 20,
          deliverable: '3 competitors analyzed with gaps identified',
        },
        {
          id: 'v6-3',
          title: 'Document your key assumptions',
          description:
            'Write down 3 assumptions your idea depends on (e.g., "freelancers will pay $20/month for this"). You\'ll test these as you build.',
          estimatedMinutes: 5,
          deliverable: '3 key assumptions documented',
        },
      ],
    },
    {
      dayNumber: 7,
      title: 'Decision Day',
      subtitle: 'Choose your idea and commit to building',
      estimatedMinutes: 40,
      founderExample: {
        company: 'Basecamp',
        founderName: 'Jason Fried',
        quote:
          'We didn\'t do months of research. We picked a problem we knew, built the simplest version, and shipped it. The market told us the rest.',
        lesson:
          'At some point, more research is just procrastination. Pick the best option you have and start building.',
      },
      proTip:
        'There is no "perfect" idea. The best founders pick a strong-enough idea and execute relentlessly.',
      tasks: [
        {
          id: 'v7-1',
          title: 'Choose your winning idea',
          description:
            'Review your Decision Sprint scores, customer conversations, and PMF Lab results. Pick the ONE idea you\'re going to build. Write it down.',
          estimatedMinutes: 10,
          deliverable: 'One idea selected and committed to',
        },
        {
          id: 'v7-2',
          title: 'Write your 1-line value proposition',
          description:
            'Complete this sentence: "[Product name] helps [who] [do what] without [current pain point]." This is your north star for the next 14 days.',
          estimatedMinutes: 15,
          deliverable: 'A 1-line value proposition',
          template: {
            id: 'tmpl-value-prop',
            title: 'Value Proposition Template',
            description: 'Craft your 1-line value prop.',
            content: `# Value Proposition Template

## Formula:
**[Product name] helps [WHO] [DO WHAT] without [CURRENT PAIN POINT].**

---

## Examples:
- **Calendly** helps busy professionals schedule meetings without the back-and-forth email chain.
- **Notion** helps teams organize their work without juggling 5 different tools.
- **Loom** helps remote workers share updates without scheduling another meeting.

---

## Your Value Prop:

**{{product_name}}** helps **{{who}}** **{{do_what}}** without **{{pain_point}}**.

---

## Quick Test — Does Your Value Prop Pass?
- [ ] Is "who" specific enough to find them on LinkedIn?
- [ ] Is "do what" a real action they already want to do?
- [ ] Is "pain point" something they'd nod their head at?
- [ ] Could you explain this to a stranger in 10 seconds?`,
            placeholders: ['{{product_name}}', '{{who}}', '{{do_what}}', '{{pain_point}}'],
          },
        },
        {
          id: 'v7-3',
          title: 'Plan your next step',
          description:
            'You\'ve validated your idea. Now decide: start the "Ship MVP in 14 Days" journey, or take a specific next action (e.g., build a landing page, do more interviews). Write down your plan.',
          estimatedMinutes: 15,
          deliverable: 'A clear next step documented',
        },
      ],
    },
  ],
};
