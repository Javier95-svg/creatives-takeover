import { Check, X } from "lucide-react";
import { Card, CardContent } from "./ui/card";

const ComparisonTable = () => {
  const comparisons = [
    {
      feature: "Cost",
      creativeTakeover: "$49/month or $29 early access",
      businessCoach: "$2,000-5,000+ per month",
      diyYoutube: "Free (but scattered & overwhelming)",
      genericAI: "$20-30/month",
      businessSchool: "$10,000-50,000+ tuition"
    },
    {
      feature: "Time to Launch",
      creativeTakeover: "30 days with daily roadmap",
      businessCoach: "3-6 months typical timeline",
      diyYoutube: "Indefinite (no structure)",
      genericAI: "Requires you to know what to ask",
      businessSchool: "2-4 years program length"
    },
    {
      feature: "Creative Industry Focus",
      creativeTakeover: true,
      businessCoach: false,
      diyYoutube: false,
      genericAI: false,
      businessSchool: false
    },
    {
      feature: "Personalized Action Plan",
      creativeTakeover: true,
      businessCoach: true,
      diyYoutube: false,
      genericAI: "Limited",
      businessSchool: false
    },
    {
      feature: "Accountability & Support",
      creativeTakeover: true,
      businessCoach: true,
      diyYoutube: false,
      genericAI: false,
      businessSchool: "Limited"
    },
    {
      feature: "Active Community",
      creativeTakeover: "15,000+ creatives",
      businessCoach: "Depends on coach",
      diyYoutube: "YouTube comments",
      genericAI: false,
      businessSchool: "Alumni network"
    },
    {
      feature: "Market Research Included",
      creativeTakeover: true,
      businessCoach: "Sometimes",
      diyYoutube: false,
      genericAI: false,
      businessSchool: "Theory only"
    },
    {
      feature: "Sprint-Based Execution",
      creativeTakeover: true,
      businessCoach: false,
      diyYoutube: false,
      genericAI: false,
      businessSchool: false
    },
    {
      feature: "Learn While Building",
      creativeTakeover: true,
      businessCoach: true,
      diyYoutube: "Learn before doing",
      genericAI: false,
      businessSchool: "Theory-heavy"
    }
  ];

  const renderCell = (value: string | boolean) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-5 h-5 text-primary mx-auto" />
      ) : (
        <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
      );
    }
    return <span className="text-sm">{value}</span>;
  };

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block mb-4">
            <span className="px-4 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full border border-primary/20">
              Why Choose Us
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Built Different for Creatives
          </h2>
          <p className="text-lg text-muted-foreground">
            We're not trying to be everything to everyone. We're laser-focused on helping creatives build real businesses fast.
          </p>
        </div>

        {/* Comparison Card */}
        <Card className="max-w-6xl mx-auto border-2 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left p-4 font-semibold bg-muted/30 sticky left-0 z-10">Feature</th>
                    <th className="p-4 min-w-[150px] bg-primary/10 border-l-2 border-r-2 border-primary/20">
                      <div className="font-bold text-primary">Creatives Takeover</div>
                      <div className="text-xs text-muted-foreground mt-1">Our Platform</div>
                    </th>
                    <th className="p-4 min-w-[150px] bg-muted/30">
                      <div className="font-semibold">Business Coach</div>
                    </th>
                    <th className="p-4 min-w-[150px] bg-muted/30">
                      <div className="font-semibold">DIY YouTube</div>
                    </th>
                    <th className="p-4 min-w-[150px] bg-muted/30">
                      <div className="font-semibold">Generic AI Tools</div>
                    </th>
                    <th className="p-4 min-w-[150px] bg-muted/30">
                      <div className="font-semibold">Business School</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((row, index) => (
                    <tr key={index} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium bg-muted/30 sticky left-0 z-10">{row.feature}</td>
                      <td className="p-4 text-center bg-primary/5 border-l-2 border-r-2 border-primary/10 font-semibold">
                        {renderCell(row.creativeTakeover)}
                      </td>
                      <td className="p-4 text-center text-muted-foreground">
                        {renderCell(row.businessCoach)}
                      </td>
                      <td className="p-4 text-center text-muted-foreground">
                        {renderCell(row.diyYoutube)}
                      </td>
                      <td className="p-4 text-center text-muted-foreground">
                        {renderCell(row.genericAI)}
                      </td>
                      <td className="p-4 text-center text-muted-foreground">
                        {renderCell(row.businessSchool)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Note */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            We're not replacing human coaches or education—we're making business-building accessible to creatives who can't afford $5K/month coaching or years in business school.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ComparisonTable;
