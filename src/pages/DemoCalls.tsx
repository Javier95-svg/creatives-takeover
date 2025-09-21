import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import DemoCallsDashboard from '@/components/demo/DemoCallsDashboard';

const DemoCalls: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-20">
        <DemoCallsDashboard />
      </main>
      <Footer />
    </div>
  );
};

export default DemoCalls;