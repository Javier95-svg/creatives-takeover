import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Star, Rocket, TrendingUp, DollarSign, MapPin, Calendar, Search, ExternalLink, Clock, Building2, Award, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import FeaturedStartupCard from '@/components/propel/FeaturedStartupCard';
import { useJourneyProgress } from '@/hooks/useJourneyProgress';

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
    fundingRange: '$500k',
    deadline: 'Rolling',
    featured: true,
    applyUrl: 'https://www.ycombinator.com/apply'
  },
  {
    id: '2',
    name: 'Techstars',
    description: 'Another top-tier accelerator program. Offers $120k and intensive mentorship over a 3-month program.',
    type: 'accelerator',
    region: 'Global',
    industry: 'All Industries',
    fundingRange: '$120k',
    deadline: 'Rolling',
    featured: true,
    applyUrl: 'https://www.techstars.com/accelerators/'
  },
  {
    id: '3',
    name: '500 Startups',
    description: 'Global venture capital firm and startup accelerator. Provides seed funding, mentorship, and access to a global network.',
    type: 'accelerator',
    region: 'Global',
    industry: 'All Industries',
    fundingRange: '$150k',
    deadline: 'Rolling',
    featured: false,
    applyUrl: 'https://www.500.co/'
  },
  {
    id: '4',
    name: 'National Science Foundation SBIR',
    description: 'Offers grants to small businesses conducting research and development work that has the potential for commercialization.',
    type: 'grant',
    region: 'US',
    industry: 'Science & Technology',
    fundingRange: '$256k',
    deadline: 'Varies',
    featured: true,
    applyUrl: 'https://seedfund.nsf.gov/'
  },
  {
    id: '5',
    name: 'Small Business Innovation Research (SBIR)',
    description: 'A highly competitive program that encourages domestic small businesses to engage in Federal Research/Research and Development (R/R&D) with the potential for commercialization.',
    type: 'grant',
    region: 'US',
    industry: 'All Industries',
    fundingRange: '$50k - $250k',
    deadline: 'Varies',
    featured: false,
    applyUrl: 'https://www.sbir.gov/'
  },
  {
    id: '6',
    name: 'AngelList',
    description: 'Connect with angel investors and venture capitalists. Raise funding for your startup through syndicates and rolling funds.',
    type: 'equity',
    region: 'Global',
    industry: 'All Industries',
    fundingRange: 'Varies',
    deadline: 'Ongoing',
    featured: false,
    applyUrl: 'https://angel.co/'
  },
  {
    id: '7',
    name: 'SeedInvest',
    description: 'Online platform for investing in startups. Raise capital from accredited and non-accredited investors.',
    type: 'equity',
    region: 'US',
    industry: 'All Industries',
    fundingRange: 'Varies',
    deadline: 'Ongoing',
    featured: false,
    applyUrl: 'https://www.seedinvest.com/'
  },
  {
    id: '8',
    name: 'MassChallenge',
    description: 'Startup accelerator program with no equity taken. Provides mentorship, resources, and access to a global network.',
    type: 'accelerator',
    region: 'Global',
    industry: 'All Industries',
    fundingRange: 'N/A',
    deadline: 'Varies',
    featured: false,
    applyUrl: 'https://masschallenge.org/'
  },
  {
    id: '9',
    name: 'Startup World Cup',
    description: 'A global startup competition that brings together startups, investors, and ecosystem leaders from around the world.',
    type: 'competition',
    region: 'Global',
    industry: 'All Industries',
    fundingRange: '$1M',
    deadline: 'Varies',
    featured: true,
    applyUrl: 'https://startupworldcup.com/'
  },
  {
    id: '10',
    name: 'Clarity Prize',
    description: 'Annual competition awarding funding to the most promising social ventures addressing global challenges.',
    type: 'competition',
    region: 'Global',
    industry: 'Social Impact',
    fundingRange: '$50k',
    deadline: 'Varies',
    featured: false,
    applyUrl: 'https://www.studentcompetitions.com/competitions/clarity-prize'
  },
];

const Propel = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [featuredPosts, setFeaturedPosts] = useState<any[]>([]);
  const { updateProgress } = useJourneyProgress();

  useEffect(() => {
    updateProgress('propel_viewed', true);
    fetchFeaturedPosts();
  }, []);

  const fetchFeaturedPosts = async () => {
    const { data } = await supabase
      .from('community_posts')
      .select('*')
      .eq('featured_on_propel', true)
      .limit(6);
    
    if (data) setFeaturedPosts(data);
  };

  const filteredOpportunities = opportunities.filter(opportunity => {
    const searchMatch = opportunity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        opportunity.description.toLowerCase().includes(searchQuery.toLowerCase());
    const regionMatch = regionFilter === "all" || opportunity.region === regionFilter;
    const typeMatch = typeFilter === "all" || opportunity.type === typeFilter;
    const industryMatch = industryFilter === "all" || opportunity.industry === industryFilter;

    return searchMatch && regionMatch && typeMatch && industryMatch;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'grant': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'equity': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'competition': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'accelerator': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <>
      <Helmet>
        <title>Propel - Investment Opportunities | Creatives Takeover</title>
        <meta name="description" content="Discover funding opportunities, accelerators, and competitions to propel your startup forward." />
        <meta property="og:title" content="Propel - Investment Opportunities | Creatives Takeover" />
        <meta property="og:description" content="Find the right funding and support to take your business to the next level." />
        <meta property="og:image" content="/og-propel.png" />
        <meta property="og:url" content="https://creativestakeover.com/propel" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="container mx-auto px-4 py-16">
          {/* Hero Section */}
          <section className="text-center mb-16">
            <h1 className="text-4xl font-bold text-foreground mb-4 flex items-center justify-center gap-3">
              <Rocket className="w-10 h-10 text-primary" />
              Propel Your Startup
            </h1>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              Unlock funding opportunities, connect with accelerators, and compete for prizes to take your business to new heights.
            </p>
          </section>
          
          {/* Featured Community Projects */}
          {featuredPosts.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
                    <Star className="w-8 h-8 text-amber-500" />
                    Investment-Ready Projects from Our Community
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Validated business plans from fellow entrepreneurs
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredPosts.map((post) => (
                  <FeaturedStartupCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          )}

          {/* Featured Opportunities */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-8 h-8 text-green-500" />
                  Featured Opportunities
                </h2>
                <p className="text-muted-foreground mt-2">
                  Hand-picked programs and funding sources to accelerate your growth
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOpportunities.filter(o => o.featured).map(opportunity => (
                <Card key={opportunity.id} className="p-6 hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
                  <div className="flex items-start justify-between mb-4">
                    <Badge className={getTypeColor(opportunity.type)}>
                      {opportunity.type}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2">
                    {opportunity.name}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                    {opportunity.description}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                    <DollarSign className="w-4 h-4" />
                    <span>{opportunity.fundingRange}</span>
                    <MapPin className="w-4 h-4" />
                    <span>{opportunity.region}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Deadline: {opportunity.deadline}</span>
                  </div>
                  <Button asChild variant="default" className="mt-4 w-full gap-2">
                    <a href={opportunity.applyUrl} target="_blank" rel="noopener noreferrer">
                      Apply Now
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </Card>
              ))}
            </div>
          </section>

          {/* Opportunity Directory */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
                  <Building2 className="w-8 h-8 text-blue-500" />
                  All Opportunities
                </h2>
                <p className="text-muted-foreground mt-2">
                  Explore a comprehensive directory of funding and support programs
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="max-w-xs">
                  <Input
                    type="search"
                    placeholder="Search opportunities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-background/80 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
                <Select onValueChange={setRegionFilter} defaultValue="all">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    <SelectItem value="Global">Global</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    {/* Add more regions as needed */}
                  </SelectContent>
                </Select>
                <Select onValueChange={setTypeFilter} defaultValue="all">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="grant">Grants</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="competition">Competitions</SelectItem>
                    <SelectItem value="accelerator">Accelerators</SelectItem>
                  </SelectContent>
                </Select>
                 <Select onValueChange={setIndustryFilter} defaultValue="all">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Industries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    <SelectItem value="Science & Technology">Science & Technology</SelectItem>
                    <SelectItem value="Social Impact">Social Impact</SelectItem>
                    {/* Add more industries as needed */}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOpportunities.map(opportunity => (
                <Card key={opportunity.id} className="p-6 hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
                  <div className="flex items-start justify-between mb-4">
                    <Badge className={getTypeColor(opportunity.type)}>
                      {opportunity.type}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2">
                    {opportunity.name}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                    {opportunity.description}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                    <DollarSign className="w-4 h-4" />
                    <span>{opportunity.fundingRange}</span>
                    <MapPin className="w-4 h-4" />
                    <span>{opportunity.region}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Deadline: {opportunity.deadline}</span>
                  </div>
                  <Button asChild variant="default" className="mt-4 w-full gap-2">
                    <a href={opportunity.applyUrl} target="_blank" rel="noopener noreferrer">
                      Apply Now
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </Card>
              ))}
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Propel;
