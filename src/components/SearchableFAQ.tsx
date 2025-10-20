import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  DollarSign, 
  Users, 
  Settings, 
  Download,
  Shield,
  HelpCircle
} from "lucide-react";

const SearchableFAQ = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const categories = [
    { name: "All", icon: <HelpCircle className="w-4 h-4" />, count: 52 },
    { name: "Pricing", icon: <DollarSign className="w-4 h-4" />, count: 12 },
    { name: "Community", icon: <Users className="w-4 h-4" />, count: 8 },
    { name: "Features", icon: <Settings className="w-4 h-4" />, count: 15 },
    { name: "Downloads", icon: <Download className="w-4 h-4" />, count: 10 },
    { name: "Security", icon: <Shield className="w-4 h-4" />, count: 7 }
  ];

  const faqData = [
    // Pricing Questions
    {
      id: 1,
      category: "Pricing",
      question: "What pricing plans do you offer?",
      answer: "We offer three flexible pricing plans: Starter ($9.99/month), Elite ($19.99/month), and Teams ($39.99/month). All plans include our core creative tools, with additional features and team capabilities in higher tiers. You can save 20% by choosing annual billing.",
      popular: true,
      tags: ["pricing", "plans", "subscription"]
    },
    {
      id: 2,
      category: "Pricing", 
      question: "Is there a free trial available?",
      answer: "Yes! We offer a 30-day free trial for all new users. No credit card required to start. You'll get full access to explore our platform, creative tools, and community features during your trial period.",
      popular: true,
      tags: ["free trial", "no credit card", "30 days"]
    },
    {
      id: 3,
      category: "Pricing",
      question: "Can I cancel my subscription anytime?",
      answer: "Absolutely! You can cancel your subscription at any time with no cancellation fees. Your access will continue until the end of your current billing period, and you won't be charged for the next cycle.",
      popular: false,
      tags: ["cancel", "refund", "billing"]
    },
    {
      id: 4,
      category: "Pricing",
      question: "Do you offer student discounts?",
      answer: "Yes, we offer a 50% student discount on all our plans. Simply verify your student status through our education partner to receive your discount code.",
      popular: false,
      tags: ["student", "discount", "education"]
    },

    // Community Questions
    {
      id: 5,
      category: "Community",
      question: "How do I join the creative community?",
      answer: "Joining our creative community is completely free! Simply create an account and you'll instantly gain access to our community forums, chat channels, collaboration spaces, and monthly events. Premium subscribers get additional perks like priority support and exclusive content.",
      popular: true,
      tags: ["join", "community", "free", "account"]
    },
    {
      id: 6,
      category: "Community",
      question: "What community events do you host?",
      answer: "We host regular events including creative workshops, portfolio review sessions, design challenges, networking meetups, and masterclasses with industry experts. Most events are free for community members, with some premium events for subscribers.",
      popular: false,
      tags: ["events", "workshops", "networking", "masterclasses"]
    },
    {
      id: 7,
      category: "Community",
      question: "Can I collaborate with other creatives?",
      answer: "Yes! Our platform includes built-in collaboration tools. You can create shared workspaces, work on projects together in real-time, share feedback, and connect with creatives worldwide. It's one of our most popular features.",
      popular: true,
      tags: ["collaboration", "workspaces", "projects", "feedback"]
    },

    // Features Questions
    {
      id: 8,
      category: "Features",
      question: "What creative tools are included?",
      answer: "Our platform includes AI-powered design tools, unlimited access to templates and assets, photo editing capabilities, collaboration features, cloud storage, analytics, and much more. The specific tools vary by plan level.",
      popular: true,
      tags: ["tools", "AI", "templates", "editing", "storage"]
    },
    {
      id: 9,
      category: "Features",
      question: "Do you have mobile apps?",
      answer: "Yes! We have mobile apps for both iOS and Android that sync seamlessly with your desktop work. You can access your projects, browse templates, collaborate with team members, and participate in community discussions on the go.",
      popular: false,
      tags: ["mobile", "iOS", "Android", "sync", "apps"]
    },
    {
      id: 10,
      category: "Features",
      question: "How does the AI-powered design assistant work?",
      answer: "Our AI assistant analyzes your design preferences, suggests improvements, automates repetitive tasks, and helps generate content ideas. It learns from your work style to provide increasingly personalized recommendations and shortcuts.",
      popular: true,
      tags: ["AI", "assistant", "automation", "suggestions", "personalized"]
    },
    {
      id: 11,
      category: "Features",
      question: "Can I use your tools offline?",
      answer: "Some features work offline through our desktop app, including basic editing and working on downloaded templates. However, collaboration features, AI tools, and cloud sync require an internet connection for full functionality.",
      popular: false,
      tags: ["offline", "desktop", "sync", "collaboration"]
    },

    // Downloads Questions
    {
      id: 12,
      category: "Downloads",
      question: "Are the downloads truly free?",
      answer: "Yes! We offer over 1000 completely free downloads including templates, fonts, images, and design assets. No hidden costs, no attribution required for most items, and commercial use is included for free resources.",
      popular: true,
      tags: ["free", "downloads", "commercial", "templates", "assets"]
    },
    {
      id: 13,
      category: "Downloads",
      question: "What file formats do you provide?",
      answer: "We provide downloads in multiple formats including PSD, AI, Figma, Sketch, PNG, JPG, SVG, PDF, and more. Most templates come in at least 2-3 different formats to ensure compatibility with your preferred tools.",
      popular: false,
      tags: ["formats", "PSD", "AI", "Figma", "PNG", "compatibility"]
    },
    {
      id: 14,
      category: "Downloads",
      question: "Can I use downloads for client projects?",
      answer: "Yes! All our free downloads include commercial licensing, meaning you can use them for client work, sell products created with them, and use them in commercial projects without additional fees or attribution requirements.",
      popular: true,
      tags: ["commercial", "licensing", "client work", "selling"]
    },

    // Security Questions
    {
      id: 15,
      category: "Security",
      question: "How secure is my data?",
      answer: "We use bank-level encryption (SSL/TLS), secure cloud storage, regular security audits, and comply with GDPR and other privacy regulations. Your creative work and personal data are protected with industry-leading security measures.",
      popular: false,
      tags: ["security", "encryption", "GDPR", "privacy", "data protection"]
    },
    {
      id: 16,
      category: "Security",
      question: "Do you share my creative work?",
      answer: "Never! Your creative work belongs to you. We don't share, sell, or use your work for any purpose other than providing our service. You maintain full ownership and control over everything you create on our platform.",
      popular: true,
      tags: ["privacy", "ownership", "creative work", "sharing"]
    },

    // Additional Popular Questions
    {
      id: 17,
      category: "Features",
      question: "How do I get started as a beginner?",
      answer: "Start with our free resources including beginner tutorials, starter templates, and step-by-step guides. Join our community for support, take advantage of the free trial, and begin with simple projects to build your skills gradually.",
      popular: true,
      tags: ["beginner", "getting started", "tutorials", "guides"]
    },
    {
      id: 18,
      category: "Community",
      question: "Is the community beginner-friendly?",
      answer: "Absolutely! Our community is known for being welcoming and supportive. We have dedicated spaces for beginners, mentorship programs, and community guidelines that ensure a positive environment for creators at all skill levels.",
      popular: true,
      tags: ["beginner friendly", "supportive", "mentorship", "welcoming"]
    },
    {
      id: 19,
      category: "Pricing",
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and select regional payment methods. All payments are processed securely through our payment partners.",
      popular: false,
      tags: ["payment", "credit cards", "PayPal", "secure"]
    },
    {
      id: 20,
      category: "Features",
      question: "How much cloud storage do I get?",
      answer: "Storage varies by plan: Starter includes 10GB, Elite includes 100GB, and Teams includes 500GB. All plans include automatic backup and sync across devices. Additional storage can be purchased if needed.",
      popular: false,
      tags: ["storage", "cloud", "backup", "sync", "plans"]
    }
  ];

  const toggleExpanded = (id: number) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const filteredFAQs = faqData.filter(faq => {
    const matchesCategory = selectedCategory === "All" || faq.category === selectedCategory;
    const matchesSearch = searchQuery === "" || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  return (
    <section className="py-20 lg:py-32 bg-muted/30" id="search-faq">
      <div className="container mx-auto px-6">
        {/* Search and Filter */}
        <div className="max-w-4xl mx-auto mb-16">
          {/* Search Bar */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-4 text-lg glass border-border"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((category) => (
              <Button
                key={category.name}
                variant={selectedCategory === category.name ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.name)}
                className="flex items-center space-x-2"
              >
                {category.icon}
                <span>{category.name}</span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  {category.count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Results Summary */}
        <div className="text-center mb-12">
          <p className="text-muted-foreground">
            Showing {filteredFAQs.length} {filteredFAQs.length === 1 ? 'result' : 'results'}
            {searchQuery && ` for "${searchQuery}"`}
            {selectedCategory !== "All" && ` in ${selectedCategory}`}
          </p>
        </div>

        {/* FAQ Items */}
        <div className="max-w-4xl mx-auto space-y-4">
          {filteredFAQs.length === 0 ? (
            <Card className="glass border-border text-center p-8">
              <CardContent>
                <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your search or browse a different category.
                </p>
                <Button variant="outline" asChild>
                  <Link to="/community">
                    Ask Our Community
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredFAQs.map((faq) => (
              <Card 
                key={faq.id} 
                className="glass border-border hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => toggleExpanded(faq.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {faq.popular && (
                          <Badge className="bg-primary text-white text-xs">
                            Popular
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {faq.category}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold mb-3">{faq.question}</h3>
                      
                      {expandedItems.includes(faq.id) && (
                        <div className="animate-fade-in">
                          <p className="text-muted-foreground leading-relaxed mb-4">
                            {faq.answer}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {faq.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      {expandedItems.includes(faq.id) ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Still Need Help */}
        <div className="text-center mt-16 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-4 gradient-text">
            Still Need Help?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Can't find the answer you're looking for? Our community and support team are here to help you succeed.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/community">
                Ask Our Community
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <a href="mailto:admin@creatives-takeover.com">
                Email Us
              </a>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <a href="https://t.me/creativestakeover" target="_blank" rel="noopener noreferrer">
                Join Our Telegram
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SearchableFAQ;