import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Rocket, 
  TrendingUp, 
  DollarSign, 
  MapPin, 
  Calendar, 
  Search,
  ExternalLink,
  Clock,
  Building2,
  Award,
  Sparkles
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Opportunity {
  id: string;
  name: string;
  description: string;
  type: 'grant' | 'equity' | 'competition' | 'accelerator';
  region: string;
  industry: string;
  fundingRange: string;
  deadline: string;
  featured: boolean;
  applyUrl: string;
}

const opportunities: Opportunity[] = [
  {
    id: '1',
    name: 'Y Combinator',
    description: 'The world\'s most prestigious startup accelerator. Provides $500k for 7% equity plus mentorship from successful founders.',
    type: 'accelerator',
    region: 'Global',
    industry: 'All Industries',
    fundingRange: '$500,000',
    deadline: 'Rolling Applications',
    featured: true,
    applyUrl: 'https://www.ycombinator.com/apply'
  },
  {
    id: '2',
    name: 'TechStars',
    description: 'Global startup accelerator with programs in multiple cities. Offers $120k investment and extensive mentor network.',
    type: 'accelerator',
    region: 'Global',
    industry: 'Technology',
    fundingRange: '$120,000',
    deadline: 'Quarterly Deadlines',
    featured: true,
    applyUrl: 'https://www.techstars.com/apply'
  },
  {
    id: '3',
    name: 'SBIR/STTR Programs',
    description: 'US government grants for R&D innovation. Non-dilutive funding for tech-based businesses.',
    type: 'grant',
    region: 'USA',
    industry: 'Technology, R&D',
    fundingRange: '$50k - $1.5M',
    deadline: 'Multiple Yearly',
    featured: true,
    applyUrl: 'https://www.sbir.gov/'
  },
  {
    id: '4',
    name: 'Google for Startups',
    description: 'Google\'s accelerator program focusing on AI/ML startups with mentorship and cloud credits.',
    type: 'accelerator',
    region: 'Global',
    industry: 'AI/ML, Technology',
    fundingRange: 'Cloud Credits + Mentorship',
    deadline: 'Biannual Applications',
    featured: false,
    applyUrl: 'https://startup.google.com/'
  },
  {
    id: '5',
    name: 'Indie Hackers Pitch',
    description: 'Monthly pitch competition for bootstrapped startups. Winner gets $1,000 and community exposure.',
    type: 'competition',
    region: 'Global',
    industry: 'All Industries',
    fundingRange: '$1,000',
    deadline: 'Monthly',
    featured: false,
    applyUrl: 'https://www.indiehackers.com/'
  },
  {
    id: '6',
    name: 'MassChallenge',
    description: 'Zero-equity accelerator offering cash prizes and mentorship to high-impact startups.',
    type: 'accelerator',
    region: 'USA, Europe',
    industry: 'All Industries',
    fundingRange: 'Up to $1M Prizes',
    deadline: 'Spring/Fall',
    featured: true,
    applyUrl: 'https://masschallenge.org/'
  },
  {
    id: '7',
    name: 'Creative Destruction Lab',
    description: 'Science-based accelerator for massively scalable tech ventures.',
    type: 'accelerator',
    region: 'North America',
    industry: 'Deep Tech, AI',
    fundingRange: 'Mentorship + Network',
    deadline: 'Annual',
    featured: false,
    applyUrl: 'https://creativedestructionlab.com/'
  },
  {
    id: '8',
    name: 'Founder Institute',
    description: 'Pre-seed accelerator helping solo founders build their startup from idea stage.',
    type: 'accelerator',
    region: 'Global',
    industry: 'All Industries',
    fundingRange: '$50k - $100k',
    deadline: 'Rolling',
    featured: false,
    applyUrl: 'https://fi.co/'
  }
];

const Propel = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');

  const featuredOpportunities = opportunities.filter(opp => opp.featured);

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         opp.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = regionFilter === 'all' || opp.region.includes(regionFilter);
    const matchesType = typeFilter === 'all' || opp.type === typeFilter;
    const matchesIndustry = industryFilter === 'all' || opp.industry.toLowerCase().includes(industryFilter.toLowerCase());
    
    return matchesSearch && matchesRegion && matchesType && matchesIndustry;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'grant': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'equity': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'competition': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'accelerator': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Propel - Find Investment Opportunities | BizMap AI</title>
        <meta name="description" content="Discover startup contests, accelerator programs, funding opportunities, and investor networks to take your business to the next level." />
      </Helmet>
      
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-card to-muted py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        
        <div className="container relative z-10 mx-auto px-4 lg:px-6">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
              <Rocket className="w-4 h-4" />
              <span className="text-sm font-medium">Your Path to Funding</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 takeover-gradient creatives-font">
              Find Your Next Investment Opportunity
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              Discover startup contests, funding programs, and investor networks that can help your idea take off.
              From accelerators to pitch competitions, find the perfect opportunity to propel your business forward.
            </p>
            
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
              onClick={() => document.getElementById('opportunities')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Explore Opportunities
              <TrendingUp className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Opportunities */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <Sparkles className="w-3 h-3 mr-1" />
              Featured
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Top Opportunities Right Now
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Hand-picked programs with proven track records of helping startups succeed
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredOpportunities.map((opp) => (
              <Card key={opp.id} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {opp.name}
                      </h3>
                      <Badge className={getTypeColor(opp.type)}>
                        {opp.type.charAt(0).toUpperCase() + opp.type.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-4 line-clamp-3">
                    {opp.description}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                      <span>{opp.fundingRange}</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                      <span>{opp.region}</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                      <span>{opp.deadline}</span>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    variant="outline"
                    asChild
                  >
                    <a href={opp.applyUrl} target="_blank" rel="noopener noreferrer">
                      Apply Now
                      <ExternalLink className="ml-2 w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Investment Programs Directory */}
      <section id="opportunities" className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Investment Programs Directory
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Browse and filter through all available opportunities to find the perfect match for your startup
            </p>
          </div>

          {/* Filters */}
          <Card className="p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search opportunities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="Global">Global</SelectItem>
                  <SelectItem value="USA">USA</SelectItem>
                  <SelectItem value="Europe">Europe</SelectItem>
                  <SelectItem value="North America">North America</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="grant">Grant</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="competition">Competition</SelectItem>
                  <SelectItem value="accelerator">Accelerator</SelectItem>
                </SelectContent>
              </Select>

              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="ai">AI/ML</SelectItem>
                  <SelectItem value="deep tech">Deep Tech</SelectItem>
                  <SelectItem value="all industries">All Industries</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Opportunities List */}
          <div className="space-y-4">
            {filteredOpportunities.map((opp) => (
              <Card key={opp.id} className="hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-1">{opp.name}</h3>
                          <p className="text-muted-foreground">{opp.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-3">
                        <Badge className={getTypeColor(opp.type)}>
                          {opp.type.charAt(0).toUpperCase() + opp.type.slice(1)}
                        </Badge>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <DollarSign className="w-4 h-4 mr-1" />
                          {opp.fundingRange}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 mr-1" />
                          {opp.region}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-1" />
                          {opp.deadline}
                        </div>
                      </div>
                    </div>
                    
                    <Button asChild>
                      <a href={opp.applyUrl} target="_blank" rel="noopener noreferrer">
                        Apply Now
                        <ExternalLink className="ml-2 w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredOpportunities.length === 0 && (
            <Card className="p-12 text-center">
              <div className="text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No opportunities match your filters. Try adjusting your search criteria.</p>
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* Investor Discovery Coming Soon */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 lg:px-6">
          <Card className="relative overflow-hidden border-2 border-dashed border-primary/50">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
            <div className="relative p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Award className="w-8 h-8 text-primary" />
              </div>
              
              <Badge variant="outline" className="mb-4">
                <Clock className="w-3 h-3 mr-1" />
                Coming Soon
              </Badge>
              
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Angel Investor Directory
              </h2>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Soon, you'll be able to connect directly with verified angel investors and venture partners 
                inside Creatives Takeover. Get one-on-one introductions, pitch your project, and secure funding 
                without leaving the platform.
              </p>
              
              <Button size="lg" variant="outline" disabled>
                Notify Me When Available
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Community Spotlight */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              From Community to Funding
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Polish your business plan with community feedback before applying to these opportunities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💡</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Refine Your Plan</h3>
              <p className="text-muted-foreground mb-4">
                Share your business plan in the Community tab and get valuable feedback from experienced entrepreneurs
              </p>
              <Button variant="outline" asChild>
                <a href="/community">Visit Community</a>
              </Button>
            </Card>

            <Card className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Build with BizMap AI</h3>
              <p className="text-muted-foreground mb-4">
                Use our AI-powered tools to create a comprehensive business plan that's ready for investor review
              </p>
              <Button variant="outline" asChild>
                <a href="/dream2plan">Try BizMap AI</a>
              </Button>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Propel;
