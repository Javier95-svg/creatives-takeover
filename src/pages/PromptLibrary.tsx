import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Copy, ExternalLink, Lightbulb, TrendingUp, Users, DollarSign, Rocket, Building2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import AnimatedBackground from "@/components/AnimatedBackground";

const PromptLibrary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const promptCategories = [
    { id: "all", name: "All Prompts", icon: Lightbulb },
    { id: "ai", name: "AI & Automation", icon: Rocket },
    { id: "ecommerce", name: "E-commerce", icon: DollarSign },
    { id: "saas", name: "SaaS & Tech", icon: Rocket },
    { id: "creator", name: "Creator Economy", icon: Users },
    { id: "local", name: "Local Business", icon: Building2 },
    { id: "consulting", name: "Consulting", icon: Users },
    { id: "sustainability", name: "Green & Climate Tech", icon: TrendingUp },
    { id: "health", name: "Health & Wellness", icon: TrendingUp },
  ];

  const prompts = [
    // AI & Automation Category
    {
      id: 1,
      title: "AI-Powered Customer Service Automation",
      category: "ai",
      description: "Build AI chatbots and customer support solutions for small businesses",
      prompt: "I want to start a business that provides AI-powered customer service automation for small and medium businesses. I have some technical background, $7,000 budget, and can work full-time. My goal is to help businesses reduce support costs while improving customer satisfaction using AI chatbots, automated email responses, and smart ticketing systems.",
      tags: ["AI", "automation", "customer service", "B2B"],
      difficulty: "Hard"
    },
    {
      id: 2,
      title: "AI Content Generation Agency",
      category: "ai",
      description: "Leverage AI tools to create content for businesses at scale",
      prompt: "I'm a marketer who wants to launch an AI content generation agency that creates blog posts, social media content, and marketing copy for businesses. I have marketing expertise, $4,000 budget, and can dedicate 40+ hours weekly. I want to use AI tools like GPT, Midjourney, and others to deliver high-quality content faster and cheaper than traditional agencies.",
      tags: ["AI", "content creation", "marketing", "agency"],
      difficulty: "Medium"
    },
    {
      id: 3,
      title: "No-Code AI App Builder Service",
      category: "ai",
      description: "Help businesses build AI-powered apps without coding",
      prompt: "I want to start a service that helps small businesses build AI-powered applications using no-code platforms like Bubble, Zapier, and AI APIs. I have some technical skills, $5,000 budget, and can work full-time. My target is businesses that want AI functionality but can't afford custom development.",
      tags: ["no-code", "AI", "app development", "B2B"],
      difficulty: "Medium"
    },

    // Creator Economy Category  
    {
      id: 4,
      title: "Creator Management Platform",
      category: "creator",
      description: "Help content creators manage their business operations",
      prompt: "I want to build a SaaS platform that helps content creators manage their brand partnerships, sponsorship deals, content calendar, and finances in one place. I have business experience, $12,000 budget, and can work full-time. The target market is mid-tier creators (10K-500K followers) who are getting overwhelmed managing their creator business.",
      tags: ["creator economy", "SaaS", "influencer marketing", "B2B"],
      difficulty: "Hard"
    },
    {
      id: 5,
      title: "Course Creation Consultancy",
      category: "creator",
      description: "Help experts turn knowledge into profitable online courses",
      prompt: "I want to start a consultancy that helps professionals and experts create, launch, and market online courses. I have marketing and educational background, $3,000 budget, and can start part-time. My goal is to help people monetize their expertise through course creation, from content development to launch strategy.",
      tags: ["online courses", "consulting", "education", "expertise monetization"],
      difficulty: "Medium"
    },
    {
      id: 6,
      title: "Micro-Influencer Marketplace",
      category: "creator",
      description: "Connect local businesses with micro-influencers",
      prompt: "I want to create a platform that connects local businesses with micro-influencers (1K-50K followers) in their area for authentic marketing campaigns. I have marketing experience, $8,000 budget, and can work full-time. The focus is on local restaurants, shops, and services working with community influencers.",
      tags: ["influencer marketing", "marketplace", "local business", "micro-influencers"],
      difficulty: "Hard"
    },

    // E-commerce Category (Updated for 2025)
    {
      id: 7,
      title: "Social Commerce Store",
      category: "ecommerce",
      description: "Build a business around social media selling and livestream shopping",
      prompt: "I want to start an e-commerce business focused on social commerce, using TikTok Shop, Instagram Shopping, and live selling to reach Gen Z customers. I have $6,000 budget, social media experience, and can dedicate 30+ hours weekly. The products will be trending lifestyle and tech accessories.",
      tags: ["social commerce", "TikTok", "live selling", "Gen Z"],
      difficulty: "Medium"
    },
    {
      id: 8,
      title: "Sustainable E-commerce Store",
      category: "ecommerce",
      description: "Starting an eco-friendly online retail business",
      prompt: "I want to start an e-commerce business that sells sustainable, eco-friendly products with carbon-neutral shipping and plastic-free packaging. My target market is environmentally conscious millennials and Gen Z consumers. I have $5,000 to start, marketing experience, and can dedicate 20-30 hours per week.",
      tags: ["sustainability", "e-commerce", "retail", "eco-friendly"],
      difficulty: "Medium"
    },
    {
      id: 9,
      title: "Subscription Box for Remote Workers",
      category: "ecommerce",
      description: "Curated productivity and wellness items for remote professionals",
      prompt: "I want to launch a subscription box service targeting remote workers and digital nomads, featuring productivity tools, ergonomic accessories, healthy snacks, and wellness items. I have $10,000 budget, some e-commerce experience, and can work full-time. The target audience is remote professionals who want to improve their home office setup and wellbeing.",
      tags: ["subscription", "remote work", "productivity", "wellness"],
      difficulty: "Hard"
    },

    // SaaS & Tech Category (Updated for 2025)
    {
      id: 10,
      title: "Micro-SaaS for Remote Teams",
      category: "saas",
      description: "Build a focused tool solving one specific remote work problem",
      prompt: "I'm a software developer who wants to create a micro-SaaS tool that helps remote teams track and improve their meeting effectiveness. I have technical skills, $8,000 budget, and can work full-time. The tool should integrate with Zoom/Teams and provide actionable insights to reduce meeting fatigue and improve productivity.",
      tags: ["micro-SaaS", "remote work", "productivity", "meetings"],
      difficulty: "Hard"
    },
    {
      id: 11,
      title: "AI-Powered Project Management Tool",
      category: "saas",
      description: "Smart project management with AI assistance and automation",
      prompt: "I want to create a SaaS project management tool that uses AI to predict project delays, suggest optimal task assignments, and automate routine project management tasks. I have technical skills, $15,000+ budget, and can work full-time. The target market is mid-size companies (50-200 employees) struggling with project visibility.",
      tags: ["saas", "AI", "project management", "automation"],
      difficulty: "Hard"
    },
    {
      id: 12,
      title: "Mobile App for Local Services",
      category: "saas",
      description: "Connecting service providers with customers",
      prompt: "I'm planning a mobile app that connects local service providers (plumbers, electricians, cleaners) with customers who need quick help. I have technical skills, $15,000 budget, and can work full-time. Think 'Uber for home services' but focused on my local market first with same-day booking capabilities.",
      tags: ["mobile app", "marketplace", "local services", "on-demand"],
      difficulty: "Hard"
    },

    // Green & Climate Tech Category
    {
      id: 13,
      title: "Carbon Footprint Tracking SaaS",
      category: "sustainability",
      description: "Help businesses measure and reduce their environmental impact",
      prompt: "I want to create a SaaS platform that helps small and medium businesses track their carbon footprint, get actionable reduction recommendations, and report on their sustainability progress. I have environmental science background, $12,000 budget, and can work full-time. The target market is companies preparing for ESG reporting requirements.",
      tags: ["climate tech", "sustainability", "SaaS", "ESG reporting"],
      difficulty: "Hard"
    },
    {
      id: 14,
      title: "Renewable Energy Consulting",
      category: "sustainability",
      description: "Help homeowners and businesses transition to clean energy",
      prompt: "I want to start a consulting business that helps homeowners and small businesses evaluate, plan, and implement renewable energy solutions like solar panels and battery storage. I have engineering background, $4,000 budget, and can start part-time. My goal is to make the transition to clean energy simple and cost-effective.",
      tags: ["renewable energy", "consulting", "solar", "sustainability"],
      difficulty: "Medium"
    },
    {
      id: 15,
      title: "Sustainable Product Marketplace",
      category: "sustainability",
      description: "Curated platform for verified eco-friendly products",
      prompt: "I want to create an online marketplace exclusively for verified sustainable and eco-friendly products, with strict vetting criteria and transparent impact metrics. I have e-commerce experience, $8,000 budget, and can work full-time. The platform will focus on helping conscious consumers find genuinely sustainable alternatives to everyday products.",
      tags: ["marketplace", "sustainability", "eco-friendly", "conscious consumption"],
      difficulty: "Hard"
    },

    // Health & Wellness Category
    {
      id: 16,
      title: "Mental Health App for Remote Workers",
      category: "health",
      description: "Digital wellness solution for isolated remote professionals",
      prompt: "I want to develop a mental health and wellness app specifically for remote workers dealing with isolation, work-life balance issues, and burnout. I have psychology background, $10,000 budget, and can work full-time. The app should include guided meditations, virtual coworking sessions, and mood tracking.",
      tags: ["mental health", "remote work", "wellness app", "burnout prevention"],
      difficulty: "Hard"
    },
    {
      id: 17,
      title: "Senior Care Coordination Service",
      category: "health",
      description: "Help families manage elderly care with technology",
      prompt: "I want to start a service that helps families coordinate care for elderly parents using a combination of technology and personal support. I have healthcare experience, $6,000 budget, and can dedicate 40+ hours weekly. The service will include medication reminders, appointment scheduling, and family communication tools.",
      tags: ["elderly care", "health tech", "family coordination", "aging population"],
      difficulty: "Medium"
    },
    {
      id: 18,
      title: "Corporate Wellness Platform",
      category: "health",
      description: "Comprehensive employee wellness programs for modern workplaces",
      prompt: "I want to create a comprehensive wellness platform for companies to improve employee health and reduce healthcare costs. I have HR and wellness background, $12,000 budget, and can work full-time. The platform should include fitness challenges, mental health resources, nutrition tracking, and stress management tools.",
      tags: ["corporate wellness", "employee health", "B2B", "workplace wellness"],
      difficulty: "Hard"
    },

    // Local Business Category (Updated)
    {
      id: 19,
      title: "Local Fitness Coaching with Virtual Reality",
      category: "local",
      description: "Combine in-person and VR fitness experiences",
      prompt: "I'm a certified personal trainer who wants to start a fitness business combining traditional personal training with virtual reality workout experiences. I have fitness expertise, $8,000 budget including VR equipment, and can work full-time. The target market is tech-savvy fitness enthusiasts looking for immersive workout experiences.",
      tags: ["fitness", "VR", "local", "innovative training"],
      difficulty: "Medium"
    },
    {
      id: 20,
      title: "Hyperlocal Delivery Network",
      category: "local",
      description: "Same-day delivery for local businesses and residents",
      prompt: "I want to create a hyperlocal delivery network that helps local businesses offer same-day delivery while also providing personal shopping and errand services for busy residents. I have logistics experience, $7,000 budget, and can work full-time. The focus is on building a strong community network of reliable delivery partners.",
      tags: ["delivery", "local business", "logistics", "community"],
      difficulty: "Medium"
    },
    {
      id: 21,
      title: "Coworking Space for Creators",
      category: "local",
      description: "Physical space designed for content creators and digital professionals",
      prompt: "I want to open a coworking space specifically designed for content creators, including podcast studios, video recording rooms, and photography setups alongside traditional workspaces. I have real estate experience, $25,000 budget, and can commit full-time. The target market is freelance creators, small agencies, and remote workers.",
      tags: ["coworking", "content creation", "real estate", "community"],
      difficulty: "Hard"
    },

    // Consulting Category (Updated)
    {
      id: 22,
      title: "AI Implementation Consultancy",
      category: "consulting",
      description: "Help businesses integrate AI tools into their operations",
      prompt: "I want to start a consultancy that helps small and medium businesses identify and implement AI tools to improve their operations, from customer service chatbots to automated data analysis. I have business and technical background, $5,000 budget, and can dedicate 35+ hours weekly. My goal is to democratize AI adoption for smaller companies.",
      tags: ["AI consulting", "business automation", "digital transformation", "B2B"],
      difficulty: "Medium"
    },
    {
      id: 23,
      title: "Remote Work Transition Consulting",
      category: "consulting",
      description: "Help traditional businesses successfully adopt remote work",
      prompt: "I want to help traditional businesses successfully transition to hybrid or fully remote work models. I have HR and organizational psychology background, $3,000 budget, and can start part-time. My services include culture assessment, tool recommendations, policy development, and change management for remote work adoption.",
      tags: ["remote work", "organizational change", "HR consulting", "business transformation"],
      difficulty: "Medium"
    },
    {
      id: 24,
      title: "Sustainability Compliance Consulting",
      category: "consulting",
      description: "Help businesses meet new environmental regulations and ESG requirements",
      prompt: "I want to start a consulting practice that helps businesses comply with increasing environmental regulations and ESG reporting requirements. I have environmental law and business background, $4,000 budget, and can work 30+ hours weekly. My target clients are mid-size companies facing new sustainability compliance challenges.",
      tags: ["ESG consulting", "sustainability", "compliance", "environmental regulations"],
      difficulty: "Medium"
    },

    // Additional trending categories
    {
      id: 25,
      title: "Digital Estate Planning Service",
      category: "consulting", 
      description: "Help people manage their digital assets and online presence after death",
      prompt: "I want to create a service that helps people organize and plan for their digital assets, social media accounts, cryptocurrency, and online subscriptions for when they pass away. I have legal background, $3,500 budget, and can start part-time. This addresses the growing need for digital legacy planning in our increasingly online world.",
      tags: ["digital estate", "legacy planning", "digital assets", "legal services"],
      difficulty: "Medium"
    },
    {
      id: 26,
      title: "Loneliness Solutions Platform",
      category: "health",
      description: "Combat social isolation with community-building technology",
      prompt: "I want to create a platform that helps combat loneliness and social isolation by connecting people with shared interests for both virtual and in-person activities. I have community organizing experience, $9,000 budget, and can work full-time. The focus is on creating meaningful connections for people struggling with social isolation, especially post-pandemic.",
      tags: ["social connection", "community building", "mental health", "loneliness"],
      difficulty: "Hard"
    },

    // AI & Emerging Tech Category (2025 Trends)
    {
      id: 27,
      title: "AI Voice Assistant for Seniors",
      category: "saas",
      description: "Voice-activated companion and helper for elderly users",
      prompt: "I want to create an AI-powered voice assistant specifically designed for seniors to help with medication reminders, emergency contacts, entertainment, and staying connected with family. I have tech background, $12,000 budget, and can work full-time. The product should be simple, reliable, and focused on improving quality of life for aging adults.",
      tags: ["AI", "voice technology", "elderly care", "healthcare"],
      difficulty: "Hard"
    },
    {
      id: 28,
      title: "AI-Powered Personal Finance Coach",
      category: "saas",
      description: "Smart financial planning and budgeting with AI insights",
      prompt: "I want to develop an AI-driven personal finance app that analyzes spending patterns, predicts future expenses, and provides personalized budgeting and investment advice. I have fintech experience, $15,000 budget, and can dedicate full-time. Target audience is millennials and Gen Z looking for smarter money management.",
      tags: ["AI", "fintech", "personal finance", "budgeting"],
      difficulty: "Hard"
    },
    {
      id: 29,
      title: "No-Code AI Automation Platform",
      category: "saas",
      description: "Help small businesses automate tasks without coding",
      prompt: "I want to create a no-code platform that allows small business owners to build AI-powered automations for customer service, data entry, and marketing tasks. I have technical background, $20,000+ budget, and can work full-time. The goal is to make AI automation accessible to non-technical business owners.",
      tags: ["no-code", "AI automation", "small business", "productivity"],
      difficulty: "Hard"
    },

    // Creator Economy & Social Commerce (2025)
    {
      id: 30,
      title: "AI Content Creation Studio",
      category: "creator",
      description: "AI-powered tools for content creators and marketers",
      prompt: "I want to launch a service that helps content creators and small businesses generate high-quality video, image, and text content using AI tools. I have marketing and design experience, $8,000 budget, and can work full-time. The service includes AI video editing, thumbnail generation, and content scheduling across platforms.",
      tags: ["AI content", "creator tools", "video editing", "automation"],
      difficulty: "Hard"
    },
    {
      id: 31,
      title: "Virtual Event Production Company",
      category: "creator",
      description: "Professional virtual and hybrid event planning and execution",
      prompt: "I want to start an event production company specializing in virtual and hybrid events for businesses, creators, and organizations. I have event planning experience, $10,000 budget, and can work full-time. Services include technical setup, engagement strategies, and post-event analytics for immersive online experiences.",
      tags: ["virtual events", "event planning", "business services", "technology"],
      difficulty: "Medium"
    },
    {
      id: 32,
      title: "Creator Analytics & Growth Platform",
      category: "creator",
      description: "Data-driven insights for content creator success",
      prompt: "I want to build a platform that provides deep analytics and growth strategies for content creators across multiple platforms (TikTok, Instagram, YouTube, etc.). I have data analysis background, $12,000 budget, and can work full-time. The platform will offer audience insights, optimal posting times, and content performance predictions.",
      tags: ["creator analytics", "social media", "data analysis", "growth hacking"],
      difficulty: "Hard"
    },

    // Health Tech & Mental Wellness (2025)
    {
      id: 33,
      title: "AI Mental Health Screening App",
      category: "health",
      description: "Early detection and intervention for mental health issues",
      prompt: "I want to develop an app that uses AI to analyze text, voice, and behavioral patterns to provide early mental health screening and connect users with appropriate resources. I have psychology and tech background, $15,000 budget, and can work full-time. The focus is on preventive mental healthcare and reducing barriers to treatment.",
      tags: ["mental health", "AI", "healthcare", "prevention"],
      difficulty: "Hard"
    },
    {
      id: 34,
      title: "Personalized Nutrition Planning Service",
      category: "health",
      description: "AI-driven meal planning based on individual health data",
      prompt: "I want to create a service that combines genetic testing, health metrics, and lifestyle data to provide personalized nutrition plans and meal recommendations. I have nutrition background, $10,000 budget, and can work full-time. The service includes meal delivery partnerships and health tracking integration.",
      tags: ["nutrition", "personalized medicine", "meal planning", "health optimization"],
      difficulty: "Hard"
    },
    {
      id: 35,
      title: "Workplace Wellness Coaching",
      category: "health",
      description: "On-site and virtual wellness programs for companies",
      prompt: "I want to start a wellness coaching business that provides on-site and virtual wellness programs for companies dealing with employee burnout and stress. I have wellness coaching certification, $5,000 budget, and can start part-time. Services include stress management workshops, fitness classes, and mental health first aid training.",
      tags: ["workplace wellness", "coaching", "corporate health", "stress management"],
      difficulty: "Medium"
    },

    // Climate Tech & Sustainability (2025)
    {
      id: 36,
      title: "Carbon Credit Marketplace for SMBs",
      category: "sustainability",
      description: "Simplified carbon offsetting for small businesses",
      prompt: "I want to create a marketplace that makes it easy for small businesses to purchase verified carbon credits and track their carbon neutrality progress. I have environmental science background, $12,000 budget, and can work full-time. The platform will focus on transparency, affordability, and measurable impact for climate-conscious SMBs.",
      tags: ["carbon credits", "climate tech", "sustainability", "marketplace"],
      difficulty: "Hard"
    },
    {
      id: 37,
      title: "Sustainable Fashion Rental Platform",
      category: "sustainability",
      description: "Circular fashion economy through clothing rental",
      prompt: "I want to launch a clothing rental platform focused on sustainable fashion brands, targeting environmentally conscious consumers who want to reduce textile waste. I have fashion industry experience, $15,000 budget, and can work full-time. The platform includes professional cleaning, style consultations, and rent-to-own options.",
      tags: ["sustainable fashion", "rental economy", "circular economy", "clothing"],
      difficulty: "Hard"
    },
    {
      id: 38,
      title: "Home Energy Optimization Service",
      category: "sustainability",
      description: "Smart home energy auditing and optimization",
      prompt: "I want to start a service that helps homeowners optimize their energy usage through smart home technology, solar installations, and energy-efficient upgrades. I have electrical engineering background, $8,000 budget, and can work full-time. The service includes energy audits, smart device installation, and ongoing optimization.",
      tags: ["energy efficiency", "smart home", "renewable energy", "home optimization"],
      difficulty: "Medium"
    },

    // Education & Skills Development (2025)
    {
      id: 39,
      title: "AI-Powered Learning Platform for Kids",
      category: "saas",
      description: "Personalized education technology for children",
      prompt: "I want to create an AI-powered learning platform that adapts to each child's learning style and pace, making education more engaging and effective. I have education and tech background, $18,000 budget, and can work full-time. The platform covers core subjects with gamification, progress tracking, and parent insights.",
      tags: ["EdTech", "AI", "children's education", "personalized learning"],
      difficulty: "Hard"
    },
    {
      id: 40,
      title: "Professional Skills Bootcamp",
      category: "consulting",
      description: "Intensive training for in-demand digital skills",
      prompt: "I want to start intensive bootcamp programs teaching high-demand skills like AI prompt engineering, no-code development, and digital marketing to professionals looking to upskill. I have training and business background, $7,000 budget, and can work full-time. Programs will be project-based with job placement assistance.",
      tags: ["skills training", "bootcamp", "professional development", "career transition"],
      difficulty: "Medium"
    },
    {
      id: 41,
      title: "Language Learning for Remote Workers",
      category: "saas",
      description: "Business-focused language learning with cultural context",
      prompt: "I want to develop a language learning platform specifically for remote workers who need to communicate effectively in international business settings. I have linguistics background, $10,000 budget, and can work full-time. The platform focuses on business communication, cultural awareness, and virtual meeting skills.",
      tags: ["language learning", "remote work", "business communication", "cultural training"],
      difficulty: "Hard"
    },

    // Local & Community Services (2025)
    {
      id: 42,
      title: "Neighborhood Social Network",
      category: "local",
      description: "Hyperlocal community platform for neighbors",
      prompt: "I want to create a social network app that connects neighbors for local recommendations, community events, skill sharing, and mutual aid. I have community organizing experience, $8,000 budget, and can work full-time. The platform emphasizes safety, verification, and building stronger local communities.",
      tags: ["community building", "social network", "local services", "neighborhood"],
      difficulty: "Hard"
    },
    {
      id: 43,
      title: "Mobile Car Care Service",
      category: "local",
      description: "On-demand automotive maintenance and detailing",
      prompt: "I want to start a mobile car care service that comes to customers' locations for routine maintenance, detailing, and minor repairs. I have automotive experience, $12,000 budget for equipment and vehicle, and can work full-time. The service targets busy professionals and includes electric vehicle specialization.",
      tags: ["automotive", "mobile service", "convenience", "on-demand"],
      difficulty: "Medium"
    },
    {
      id: 44,
      title: "Senior Tech Support Service",
      category: "local",
      description: "Patient technology help for elderly users",
      prompt: "I want to start a business providing patient, in-home technology support for seniors who struggle with smartphones, tablets, and smart home devices. I have customer service background, $3,000 budget, and can start part-time. Services include device setup, training, and ongoing support with a focus on safety and simplicity.",
      tags: ["senior services", "tech support", "elderly care", "digital literacy"],
      difficulty: "Easy"
    },

    // Fintech & Web3 (2025)
    {
      id: 45,
      title: "Micro-Investment App for Gen Z",
      category: "saas",
      description: "Social investing platform for young investors",
      prompt: "I want to create a micro-investment app that makes investing accessible and social for Gen Z users through fractional shares, gamification, and peer learning. I have fintech experience, $25,000+ budget, and can work full-time. The app includes investment education, social features, and integration with popular payment apps.",
      tags: ["fintech", "micro-investing", "Gen Z", "social investing"],
      difficulty: "Hard"
    },
    {
      id: 46,
      title: "Freelancer Financial Management",
      category: "saas",
      description: "All-in-one financial platform for independent contractors",
      prompt: "I want to build a financial management platform specifically for freelancers and independent contractors, including invoicing, expense tracking, tax preparation, and retirement planning. I have accounting background, $15,000 budget, and can work full-time. The platform addresses the unique financial challenges of gig economy workers.",
      tags: ["freelancer tools", "financial management", "gig economy", "accounting"],
      difficulty: "Hard"
    },

    // Advanced Healthcare & Biotech (2025)
    {
      id: 47,
      title: "Telemedicine Platform for Rural Areas",
      category: "health",
      description: "Bridge healthcare gaps in underserved communities",
      prompt: "I want to create a telemedicine platform specifically designed for rural and underserved communities, with features like mobile connectivity optimization and local health worker integration. I have healthcare and tech background, $20,000+ budget, and can work full-time. The goal is to improve healthcare access where traditional services are limited.",
      tags: ["telemedicine", "rural healthcare", "health equity", "digital health"],
      difficulty: "Hard"
    },
    {
      id: 48,
      title: "Pet Health Monitoring Service",
      category: "health",
      description: "Tech-enabled preventive care for pets",
      prompt: "I want to launch a service that uses wearable devices and AI to monitor pet health, detect early signs of illness, and provide personalized care recommendations to pet owners. I have veterinary background, $12,000 budget, and can work full-time. The service includes vet consultations and emergency alerts for pet health issues.",
      tags: ["pet health", "wearable tech", "veterinary care", "AI monitoring"],
      difficulty: "Hard"
    }
  ];

  const filteredPrompts = prompts.filter(prompt => {
    const matchesCategory = selectedCategory === "all" || prompt.category === selectedCategory;
    const matchesSearch = prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         prompt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         prompt.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied to clipboard!");
  };

  const useInBizMap = (prompt: string) => {
    // Copy to clipboard
    navigator.clipboard.writeText(prompt);
    // Open BizMap AI in new tab
    window.open('/dream2plan', '_blank');
    // Inform user to paste
    toast.success("Prompt copied! Paste it into BizMap AI to get started.");
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-green-100 text-green-800 border-green-200";
      case "Medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Hard": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Helmet>
        <title>Prompt Library - Ready-to-Use Business Ideas | BizMap AI</title>
        <meta name="description" content="Discover curated business idea prompts for BizMap AI. Get inspired with proven business concepts across e-commerce, SaaS, consulting, and more." />
      </Helmet>
      
      {/* Animated Background */}
      <AnimatedBackground />
      
      <div className="relative z-10">
        <Navigation />
        
        <div className="pt-16 sm:pt-20 pb-12 sm:pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 takeover-gradient creatives-font">
              Prompt Library
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 sm:mb-8 px-2">
              Get inspired with ready-to-use business idea prompts. Each prompt is crafted to help you get the most detailed and actionable business plans from BizMap AI.
            </p>
            
            {/* Search and Filter */}
            <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 sm:h-12 text-base touch-manipulation"
                />
              </div>
              
              <div className="flex flex-wrap gap-2 justify-center">
                {promptCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.id)}
                      className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm touch-manipulation"
                    >
                      <Icon className="w-3 sm:w-4 h-3 sm:h-4" />
                      <span className="hidden xs:inline">{category.name}</span>
                      <span className="xs:hidden">{category.name.split(' ')[0]}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Prompts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {filteredPrompts.map((prompt) => (
              <Card key={prompt.id} className="glass-card hover:shadow-lg transition-shadow">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-2">
                      <CardTitle className="text-lg sm:text-xl mb-2 leading-tight">{prompt.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                        {prompt.description}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`ml-2 text-xs whitespace-nowrap ${getDifficultyColor(prompt.difficulty)}`}
                    >
                      {prompt.difficulty}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 sm:gap-1.5">
                    {prompt.tags.slice(0, 4).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {prompt.tags.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{prompt.tags.length - 4}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="bg-muted/50 rounded-lg p-3 mb-4 text-sm">
                    <p className="line-clamp-4 leading-relaxed">{prompt.prompt}</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                    <Button
                      size="sm"
                      onClick={() => useInBizMap(prompt.prompt)}
                      className="flex-1 h-9 sm:h-10 text-sm touch-manipulation"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Use in BizMap AI</span>
                      <span className="sm:hidden">Use in BizMap</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyPrompt(prompt.prompt)}
                      className="w-full sm:w-auto h-9 sm:h-10 px-4 touch-manipulation"
                    >
                      <Copy className="w-4 h-4" />
                      <span className="ml-2 sm:hidden">Copy</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredPrompts.length === 0 && (
            <div className="text-center py-12">
              <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No prompts found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
            </div>
          )}

          {/* CTA Section */}
          <div className="mt-16 text-center">
            <Card className="glass-card max-w-2xl mx-auto">
              <CardContent className="p-8">
                <Rocket className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-4">Ready to Build Your Business?</h3>
                <p className="text-muted-foreground mb-6">
                  Take any of these prompts to BizMap AI and get a comprehensive business plan in minutes.
                </p>
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <a href="/dream2plan">Start with BizMap AI</a>
                </Button>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PromptLibrary;