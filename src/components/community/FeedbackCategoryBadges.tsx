import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Lightbulb,
  BarChart,
  Megaphone,
  Shield
} from 'lucide-react';

interface FeedbackCategoryBadgesProps {
  categories: string[];
}

const categoryConfig: Record<string, { icon: any; color: string; label: string }> = {
  'market_validation': { 
    icon: Target, 
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', 
    label: 'Market Validation' 
  },
  'pricing_strategy': { 
    icon: DollarSign, 
    color: 'bg-green-500/10 text-green-600 border-green-500/20', 
    label: 'Pricing Strategy' 
  },
  'go_to_market': { 
    icon: Megaphone, 
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', 
    label: 'Go-to-Market' 
  },
  'target_audience': { 
    icon: Users, 
    color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', 
    label: 'Target Audience' 
  },
  'competitive_advantage': { 
    icon: TrendingUp, 
    color: 'bg-teal-500/10 text-teal-600 border-teal-500/20', 
    label: 'Competitive Advantage' 
  },
  'financial_projections': { 
    icon: BarChart, 
    color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', 
    label: 'Financial Projections' 
  },
  'product_strategy': { 
    icon: Lightbulb, 
    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', 
    label: 'Product Strategy' 
  },
  'risk_assessment': { 
    icon: Shield, 
    color: 'bg-red-500/10 text-red-600 border-red-500/20', 
    label: 'Risk Assessment' 
  },
};

const FeedbackCategoryBadges = ({ categories }: FeedbackCategoryBadgesProps) => {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const config = categoryConfig[category] || {
          icon: Target,
          color: 'bg-muted text-muted-foreground border-border',
          label: category.replace(/_/g, ' ')
        };
        
        const Icon = config.icon;
        
        return (
          <Badge
            key={category}
            variant="outline"
            className={`${config.color} flex items-center gap-1.5 px-2.5 py-1`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{config.label}</span>
          </Badge>
        );
      })}
    </div>
  );
};

export default FeedbackCategoryBadges;
