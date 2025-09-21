import React from 'react';
import { Helmet } from "react-helmet-async";
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import DemoCallsDashboard from '@/components/demo/DemoCallsDashboard';
import AnimatedBackground from '@/components/AnimatedBackground';

const DemoCalls: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Live Demo Day Calls | Creatives Takeover Community</title>
        <meta 
          name="description" 
          content="Join live demo day calls to showcase your projects, get community feedback, and discover innovative solutions from fellow entrepreneurs." 
        />
        <meta name="keywords" content="demo day, live calls, community feedback, project showcase, entrepreneur demo, startup pitch" />
        <meta property="og:title" content="Live Demo Day Calls - Community Showcase" />
        <meta property="og:description" content="Showcase your projects and get valuable feedback from the entrepreneurial community." />
        <link rel="canonical" href="/demo-calls" />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10">
          <Navigation />
          <main className="pt-20">
            <div className="container mx-auto px-6 py-12">
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold gradient-text mb-4">
                  Live Demo Day Calls
                </h1>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Join our community demo calls to showcase your projects, get valuable feedback, 
                  and discover innovative solutions from fellow entrepreneurs.
                </p>
              </div>
              <DemoCallsDashboard />
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </>
  );
};

export default DemoCalls;