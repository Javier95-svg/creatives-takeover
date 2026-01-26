/**
 * Sample co-founder posts shown as demo content
 * These appear alongside real posts from the database
 */

export interface SampleCofounderPost {
  id: string;
  user_id: string;
  project_name: string;
  project_description: string;
  industry: string | null;
  stage: string;
  looking_for: string[];
  commitment: string | null;
  location: string | null;
  equity_range: string | null;
  additional_info: string | null;
  created_at: string;
  status: string;
  is_sample: true;
  author: {
    full_name: string;
    avatar_url: string;
  };
}

const now = Date.now();
const hour = 3600000;
const day = 86400000;

export const sampleCofounderPosts: SampleCofounderPost[] = [
  {
    id: "sample-1",
    user_id: "sample-user-1",
    project_name: "GreenPlate",
    project_description: `Hey everyone! I'm Emily, a product designer based in London. I've been working on GreenPlate for about 3 months now. It's a meal planning app that reduces food waste by matching what's already in your fridge with recipes, and auto-generates a grocery list for what you're missing.

I've done the UX research, built wireframes, and validated the idea with 40+ user interviews. People genuinely love the concept, especially busy parents and eco-conscious millennials. The problem is I can't code. At all.

I need someone who can take my Figma files and turn them into a real product. Ideally React Native so we can ship on both iOS and Android. I'm thinking we start lean, get an MVP out, and apply to a climate-focused accelerator in Q2.

If you care about sustainability and want to build something people actually need, let's talk.`,
    industry: "FoodTech / Sustainability",
    stage: "building-mvp",
    looking_for: ["technical"],
    commitment: "Part-time (20+ hrs/week)",
    location: "London, UK (remote friendly)",
    equity_range: "40-50%",
    additional_info: "Already have a small waitlist of 200+ people from a landing page I launched last month. Looking for someone who's comfortable with React Native or Flutter. No agency devs please, I want a true co-founder who's in it for the long run.",
    created_at: new Date(now - 2 * hour).toISOString(),
    status: "active",
    is_sample: true,
    author: {
      full_name: "Emily Wynne",
      avatar_url: "https://randomuser.me/api/portraits/women/32.jpg",
    },
  },
  {
    id: "sample-2",
    user_id: "sample-user-2",
    project_name: "Vaultly",
    project_description: `I'm Sebastian, a backend engineer with 6 years of experience at fintech companies (worked at Monzo and a YC startup). I've built the core infrastructure for Vaultly, a personal finance tool that helps freelancers and gig workers manage irregular income.

The tech is solid. I've got automated income categorization, tax estimation for self-employed people, and a cash flow forecasting engine. What I don't have is anyone who can sell it.

I need a co-founder who actually understands go-to-market, growth loops, and how to get the first 1,000 users without burning money on ads. Someone who's done B2C before and can own the entire business side while I keep shipping features.

I'm not looking for a "growth hacker" or someone who just wants to run Facebook ads. I want someone who thinks about distribution as deeply as I think about architecture.`,
    industry: "FinTech",
    stage: "mvp-ready",
    looking_for: ["business", "marketing"],
    commitment: "Full-time",
    location: "Remote (UK/EU timezone preferred)",
    equity_range: "30-40%",
    additional_info: "MVP is live with 50 beta users. Monthly retention is strong but I've done zero marketing beyond asking friends. Bootstrapped so far. Open to fundraising once we nail product-market fit. Ideal person has experience with consumer fintech or subscription products.",
    created_at: new Date(now - 8 * hour).toISOString(),
    status: "active",
    is_sample: true,
    author: {
      full_name: "Sebastian Schwarz",
      avatar_url: "https://randomuser.me/api/portraits/men/75.jpg",
    },
  },
  {
    id: "sample-3",
    user_id: "sample-user-3",
    project_name: "StudioMatch",
    project_description: `I'm Lena, a music producer and audio engineer from Berlin. I've been in the music industry for 10 years and I keep running into the same problem: independent artists can't find affordable studio time, and studios sit empty half the week.

StudioMatch is basically Airbnb for recording studios. Artists browse available slots, book instantly, and studios fill their dead hours. Simple idea, massive market. There are 50,000+ recording studios in Europe alone.

I've talked to 30 studio owners and 60+ independent artists. Everyone wants this to exist. I've mapped out the product, the business model, and the initial market (starting with Berlin and London).

What I need is a technical co-founder who can build the marketplace. Bonus points if you've worked on booking/scheduling systems before or have any experience with two-sided marketplaces.`,
    industry: "Music / Marketplace",
    stage: "idea",
    looking_for: ["technical", "design"],
    commitment: "Part-time initially, full-time by Q3",
    location: "Berlin, Germany (remote ok for EU)",
    equity_range: "45-50%",
    additional_info: "I bring deep industry connections, 30+ studios already interested in listing, and a clear path to revenue from day one (commission model). Not looking for someone who needs convincing that this is a real problem. If you've ever tried booking a studio as an indie artist, you already know.",
    created_at: new Date(now - 1 * day).toISOString(),
    status: "active",
    is_sample: true,
    author: {
      full_name: "Lena Voss",
      avatar_url: "https://randomuser.me/api/portraits/women/44.jpg",
    },
  },
  {
    id: "sample-4",
    user_id: "sample-user-4",
    project_name: "CareCircle",
    project_description: `Hi, I'm James. I left my job as a nurse practitioner earlier this year to build something I've wanted for ages: a platform that connects elderly people living alone with local volunteers for simple social visits, errands, and companionship.

The loneliness epidemic among seniors is real and it's only getting worse. Government programs are slow. Care homes are expensive. What most elderly people actually want is someone to have tea with on a Tuesday afternoon.

I've been running this manually in my neighborhood for 6 months. 15 volunteers, 22 seniors matched. The feedback has been incredible and a local council wants to pilot it.

I need someone who can help me build a proper platform (matching algorithm, scheduling, volunteer management, safeguarding checks) and someone who understands nonprofit/social enterprise models and can help with grant applications and partnerships.`,
    industry: "HealthTech / Social Impact",
    stage: "early-users",
    looking_for: ["technical", "business"],
    commitment: "Full-time",
    location: "Manchester, UK",
    equity_range: "Equal split",
    additional_info: "This is a social enterprise, not a Silicon Valley moonshot. If you're motivated by impact over exits, we'll get along great. I have a meeting with a regional NHS partnership lead next month. Revenue model is B2G (council contracts) + B2B (corporate volunteer programs). Looking for someone who's ok starting scrappy and building something meaningful.",
    created_at: new Date(now - 1.5 * day).toISOString(),
    status: "active",
    is_sample: true,
    author: {
      full_name: "James Diaz",
      avatar_url: "https://randomuser.me/api/portraits/men/22.jpg",
    },
  },
  {
    id: "sample-5",
    user_id: "sample-user-5",
    project_name: "Briefd",
    project_description: `I'm Soof, a freelance brand strategist. After 5 years of writing creative briefs for agencies and startups, I realized the process is broken. Clients don't know what they want, designers get vague instructions, and everyone wastes time going back and forth.

Briefd is an AI tool that helps non-designers create clear, structured creative briefs in minutes. You answer a few guided questions about your brand, goals, and preferences, and it generates a brief that any designer can actually work with. Think of it as the translator between "I want something modern and clean" and actual design specifications.

I've built a working prototype using Lovable and it works surprisingly well. 80 people have tested it and the NPS score is 72. But I've hit the ceiling of what I can do with no-code.

Looking for a technical co-founder who can rebuild this properly, add integrations (Figma, Slack, project management tools), and help me scale it into a real SaaS product.`,
    industry: "Creative Tools / SaaS",
    stage: "mvp-ready",
    looking_for: ["technical"],
    commitment: "Full-time",
    location: "Barcelona, Spain (remote friendly)",
    equity_range: "40-50%",
    additional_info: "I have paying customers already (12 agencies on a $29/month beta plan). The product works, it just needs a real technical foundation. I handle all sales, marketing, customer success, and product decisions. You own the tech. Looking for someone who's excited about the creative industry and wants to build a product people genuinely love using.",
    created_at: new Date(now - 2 * day).toISOString(),
    status: "active",
    is_sample: true,
    author: {
      full_name: "Soof de Boer",
      avatar_url: "https://randomuser.me/api/portraits/women/65.jpg",
    },
  },
  {
    id: "sample-6",
    user_id: "sample-user-6",
    project_name: "PackTrail",
    project_description: `What's up, I'm Kai. Full stack dev, been building stuff since I was 14. Currently freelancing but ready to go all in on something.

PackTrail is a logistics tracking app for small e-commerce brands. The big guys (Shopify, Amazon) have great tracking. But if you're a small brand shipping 50 to 500 orders a month through multiple carriers, tracking is a nightmare. Customers bug you constantly asking "where's my order?"

I've built the core: real-time tracking aggregation from 20+ carriers, a branded tracking page brands can customize, and automated SMS/email updates. The tech works.

What I need is a co-founder who knows e-commerce, understands small brand pain points, and can handle sales and partnerships. Someone who can get us our first 50 paying customers while I keep building.

If you've run an e-commerce brand or worked in logistics, hit me up. Bonus if you have existing connections in the DTC space.`,
    industry: "E-commerce / Logistics",
    stage: "building-mvp",
    looking_for: ["business", "marketing"],
    commitment: "Full-time",
    location: "Remote (any timezone)",
    equity_range: "40-50%",
    additional_info: "I code fast and ship weekly. Looking for someone who moves at the same pace on the business side. No pitch deck warriors. I want someone who's comfortable cold emailing Shopify store owners and closing deals. Revenue model is straightforward SaaS ($49 to $199/month based on order volume).",
    created_at: new Date(now - 3 * day).toISOString(),
    status: "active",
    is_sample: true,
    author: {
      full_name: "Kai Nakamura",
      avatar_url: "https://randomuser.me/api/portraits/men/12.jpg",
    },
  },
  {
    id: "sample-7",
    user_id: "sample-user-7",
    project_name: "SkillSwap",
    project_description: `Hi! I'm Camila, a community builder and former program manager at a coding bootcamp. I spent 3 years watching students graduate with technical skills but zero business sense, and business people with great ideas but no technical ability.

SkillSwap is a platform where founders trade skills instead of paying for services. A developer builds your landing page, you write their marketing copy. A designer creates their brand identity, they handle your bookkeeping for a month. No money changes hands, just expertise.

I've been running this as a Discord community for 4 months. 300+ members, 85 successful swaps completed. People love it but Discord is messy for this. We need a proper platform with profiles, skill matching, swap tracking, and a reputation system.

I'm looking for a technical co-founder who gets the community-first approach and a finance person who can figure out the business model (freemium? premium matching? I have ideas but need someone who thinks about this stuff professionally).`,
    industry: "Community / Marketplace",
    stage: "early-users",
    looking_for: ["technical", "finance"],
    commitment: "Part-time (15-20 hrs/week)",
    location: "Lagos, Nigeria (remote first)",
    equity_range: "30-35% each",
    additional_info: "The community is the product. I have an engaged user base that's growing organically. What I need is people who can help me turn this into a sustainable business without killing the community vibe. I don't want to build another cold, transactional marketplace. If you believe in the power of community-led growth, we should chat.",
    created_at: new Date(now - 3.5 * day).toISOString(),
    status: "active",
    is_sample: true,
    author: {
      full_name: "Camila Ortiz",
      avatar_url: "https://randomuser.me/api/portraits/women/15.jpg",
    },
  },
  {
    id: "sample-8",
    user_id: "sample-user-8",
    project_name: "TutorLoop",
    project_description: `I'm Daniel, a high school math teacher from Toronto who's been tutoring on the side for 8 years. Here's what I know: the tutoring market is massive but the experience sucks for everyone involved.

Parents can't find reliable tutors. Tutors waste hours on admin. And the platforms that exist take 30-40% commission which means either tutors get underpaid or parents overpay.

TutorLoop is a local-first tutoring marketplace that takes only 10% commission by automating everything: scheduling, payments, progress reports, and parent communication. Think of it as Uber meets ClassDojo for tutoring.

I've been running a manual version in my area. 12 tutors, 45 families, $8K in transactions last month. It works but it's all spreadsheets and WhatsApp groups right now.

I need a technical co-founder to build the platform and a marketing co-founder to help me expand to other cities. The playbook works, it just needs proper tools and someone who knows how to scale a local service.`,
    industry: "EdTech",
    stage: "early-users",
    looking_for: ["technical", "marketing"],
    commitment: "Part-time transitioning to full-time",
    location: "Toronto, Canada (remote ok for North America)",
    equity_range: "25-35%",
    additional_info: "I'm not trying to build the next Chegg. I want a platform that actually works for independent tutors and makes education more accessible. If you've worked in education or have kids who've used tutoring services, you probably already understand the pain. Revenue from day one, no VC dependency needed.",
    created_at: new Date(now - 4 * day).toISOString(),
    status: "active",
    is_sample: true,
    author: {
      full_name: "Daniel Park",
      avatar_url: "https://randomuser.me/api/portraits/men/41.jpg",
    },
  },
  {
    id: "sample-9",
    user_id: "sample-user-9",
    project_name: "Canopy",
    project_description: `Hey, I'm Olivia. Former interior designer turned proptech enthusiast. After renovating 20+ apartments and dealing with the chaos of managing contractors, timelines, and budgets, I decided to build the tool I wish I had.

Canopy is a project management platform specifically for home renovations. Not generic PM tools that kind of work. A purpose-built tool where homeowners can plan their renovation, get AI-powered budget estimates, find vetted contractors, track progress with photo timelines, and manage payments with milestone-based releases.

I've validated the concept extensively. 60 homeowners surveyed, 15 in-depth interviews, and a landing page with 400+ signups. The renovation market in the UK alone is worth £27 billion annually and there's no dominant software player.

Looking for a technical co-founder to build the platform (web + mobile) and someone with experience in construction/trades who can help build the contractor network side.`,
    industry: "PropTech / Construction",
    stage: "idea",
    looking_for: ["technical", "business"],
    commitment: "Full-time",
    location: "London, UK (hybrid preferred)",
    equity_range: "35-45%",
    additional_info: "I have strong design skills (I'll own all product design and UX), industry knowledge from years of renovations, and connections with contractors across London. What I can't do is write code or build contractor partnerships at scale. If you've ever renovated a home and thought 'there has to be a better way,' you get it.",
    created_at: new Date(now - 5 * day).toISOString(),
    status: "active",
    is_sample: true,
    author: {
      full_name: "Olivia Smith",
      avatar_url: "https://randomuser.me/api/portraits/women/79.jpg",
    },
  },
  {
    id: "sample-10",
    user_id: "sample-user-10",
    project_name: "RepBot",
    project_description: `I'm Yusuf, a data scientist with a background in NLP. I've been building RepBot on the side for the past 4 months. It's an AI tool that monitors online reviews across Google, Trustpilot, Yelp, and social media, and helps small businesses respond intelligently and quickly.

For small business owners, managing online reputation is a nightmare. A bad review sits there for days because they're too busy running their shop. RepBot sends instant alerts, drafts personalized responses (not generic "thank you for your feedback" stuff), and gives you a weekly sentiment dashboard.

The tech is 80% done. NLP models are trained, integrations with major review platforms work, and the response generation is solid. What I'm missing is everything on the business side.

I need someone who understands small business owners, can build pricing that makes sense for a plumber or a cafe owner (not enterprise pricing), and can actually sell to these people. Cold outreach, partnerships with local business associations, whatever works.`,
    industry: "AI / SMB Tools",
    stage: "building-mvp",
    looking_for: ["business", "marketing"],
    commitment: "Full-time",
    location: "Dublin, Ireland (remote ok)",
    equity_range: "40-50%",
    additional_info: "I'm a builder, not a seller. I'll keep improving the product, you bring it to market. Ideal co-founder has experience selling to small businesses or has run one themselves. If you've ever left a review for a local business and wondered why nobody responded, you understand the opportunity here.",
    created_at: new Date(now - 6 * day).toISOString(),
    status: "active",
    is_sample: true,
    author: {
      full_name: "Yusuf Khan",
      avatar_url: "https://randomuser.me/api/portraits/men/86.jpg",
    },
  },
];
