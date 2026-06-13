import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, TrendingUp, DollarSign, ArrowRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Resource {
  id: string;
  category: string;
  title: string;
  description: string;
  link: string;
  icon: any;
  color: string;
}

const resources: Resource[] = [
  {
    id: 'mvp',
    category: 'Building & Product',
    title: 'Design your first MVP',
    description: 'Step-by-step guide to building your minimum viable product',
    link: '/bizmap-ai',
    icon: FileText,
    color: 'text-info'
  },
  {
    id: 'customers',
    category: 'Finding Customers',
    title: 'How to get first 10 users',
    description: 'Proven strategies to acquire your first paying customers',
    link: '/dashboard',
    icon: Users,
    color: 'text-success'
  },
  {
    id: 'pitch',
    category: 'Pitching Investors',
    title: 'Deck template + 5-min guide',
    description: 'Investor pitch deck template and quick pitching guide',
    link: '/dashboard',
    icon: TrendingUp,
    color: 'text-purple-600'
  },
  {
    id: 'fundraising',
    category: 'Fundraising',
    title: 'Pre-seed guide',
    description: 'Complete guide to raising your pre-seed round',
    link: '/dashboard',
    icon: DollarSign,
    color: 'text-warning'
  }
];

export const FounderResources = () => {
  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <CardTitle className="text-base">Founder Resources</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">Struggling with X? Start here:</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {resources.map((resource) => {
            const ResourceIcon = resource.icon;
            return (
              <Link
                key={resource.id}
                to={resource.link}
                className="block p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors`}>
                    <ResourceIcon className={`h-5 w-5 ${resource.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Badge variant="outline" className="text-xs mb-1">
                      {resource.category}
                    </Badge>
                    <p className="font-medium text-sm mb-1">{resource.title}</p>
                    <p className="text-xs text-muted-foreground">{resource.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

