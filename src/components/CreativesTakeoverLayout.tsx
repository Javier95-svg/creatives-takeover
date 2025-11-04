import { ReactNode } from 'react';
import CreativesTakeoverHeader from './CreativesTakeoverHeader';
import SEO from './SEO';
import { Analytics } from '@vercel/analytics/next';

interface CreativesTakeoverLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

const CreativesTakeoverLayout = ({ 
  children, 
  title = "Creatives Takeover - Take over the creative world",
  description = "Take over the creative world — one project at a time. Professional creative services including design sprints, brand systems, AI workflows, and workshops."
}: CreativesTakeoverLayoutProps) => {
  return (
    <>
      <SEO
        title={title}
        description={description}
        url="/creatives-takeover"
      />

      <div className="min-h-screen bg-background">
        <CreativesTakeoverHeader />
        <main className="flex-1">
          {children}
        </main>
        <footer className="site-footer bg-card border-t border-border py-8">
          <div className="container mx-auto px-4 lg:px-6 text-center">
            <p className="text-muted-foreground text-sm">
              © <span id="year">{new Date().getFullYear()}</span> Creatives Takeover. All rights reserved.
            </p>
          </div>
        </footer>
        <Analytics />
      </div>
    </>
  );
};

export default CreativesTakeoverLayout;