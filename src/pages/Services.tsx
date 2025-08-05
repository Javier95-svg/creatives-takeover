import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import WhatWeDo from "@/components/WhatWeDo";

const Services = () => {
  return (
    <>
      <Helmet>
        <title>Services | Creative Subscription Services | Creatives Takeover</title>
        <meta 
          name="description" 
          content="Discover our creative subscription services offering unlimited design, AI-powered tools, and comprehensive creative platform solutions." 
        />
        <meta name="keywords" content="creative subscription services, unlimited design, creative platform, design subscription, AI creative tools" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <WhatWeDo />
      </div>
    </>
  );
};

export default Services;