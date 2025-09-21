import { Helmet } from 'react-helmet-async';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { AccountabilityDashboard } from '@/components/social/AccountabilityDashboard';

const Accountability = () => {
  return (
    <>
      <Helmet>
        <title>Accountability Partners - Startblocks</title>
        <meta name="description" content="Find accountability partners, track progress together, and stay motivated on your entrepreneurial journey with Startblocks." />
        <meta name="keywords" content="accountability partners, progress tracking, motivation, entrepreneurship, goal achievement" />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold tracking-tight">
                Accountability Partners
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Stay motivated and achieve your goals with the support of trusted accountability partners. 
                Connect, track progress, and celebrate wins together.
              </p>
            </div>

            <AccountabilityDashboard />
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default Accountability;