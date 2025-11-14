import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface GuideLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  breadcrumbs?: BreadcrumbItem[];
  seoKeywords?: string;
}

const GuideLayout = ({ 
  children, 
  title, 
  description, 
  breadcrumbs = [],
  seoKeywords = ""
}: GuideLayoutProps) => {
  const defaultBreadcrumbs: BreadcrumbItem[] = [
    { name: "Home", url: "/" },
    { name: "Insighta", url: "/insighta" },
    ...breadcrumbs,
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${title} | Creatives Takeover`}
        description={description}
        keywords={seoKeywords}
        url={window.location.pathname}
      />
      <Navigation />
      
      <main className="container mx-auto max-w-6xl px-6 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          {defaultBreadcrumbs.map((crumb, index) => (
            <div key={crumb.url} className="flex items-center gap-2">
              {index === 0 && <Home className="h-4 w-4" />}
              <Link 
                to={crumb.url} 
                className="hover:text-foreground transition-colors"
              >
                {crumb.name}
              </Link>
              {index < defaultBreadcrumbs.length - 1 && (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          ))}
        </nav>

        {/* Hero Section */}
        <div className="mb-12 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">{title}</h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            {description}
          </p>
        </div>

        {/* Main Content */}
        <div className="prose prose-lg max-w-none">
          {children}
        </div>

        {/* Back to Insighta CTA */}
        <div className="mt-16 p-8 bg-muted rounded-lg text-center">
          <h3 className="text-2xl font-bold mb-3">Ready to Find Funding?</h3>
          <p className="text-muted-foreground mb-6">
            Browse curated funding opportunities for creative entrepreneurs
          </p>
          <Link to="/insighta">
            <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              Browse Funding Opportunities
            </button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default GuideLayout;
