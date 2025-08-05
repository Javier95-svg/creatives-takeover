import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import ResourcesHero from "@/components/ResourcesHero";
import TutorialsSection from "@/components/TutorialsSection";
import GuidesSection from "@/components/GuidesSection";
import DownloadsSection from "@/components/DownloadsSection";
import ResourcesNavigation from "@/components/ResourcesNavigation";

const Resources = () => {
  return (
    <>
      <Helmet>
        <title>Creative Resources | Free Tutorials, Guides & Downloads | Creatives Takeover</title>
        <meta 
          name="description" 
          content="Access free creative resources including tutorials, design guides, templates, and downloads. Learn creative skills with our comprehensive resource library." 
        />
        <meta name="keywords" content="creative resources, free tutorials, design guides, creative downloads, design templates, creative learning resources, free design assets" />
        <meta property="og:title" content="Free Creative Resources | Tutorials, Guides & Downloads" />
        <meta property="og:description" content="Discover our comprehensive library of free creative resources, tutorials, and guides to enhance your creative skills." />
        <link rel="canonical" href="/resources" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <ResourcesHero />
        <TutorialsSection />
        <GuidesSection />
        <DownloadsSection />
        <ResourcesNavigation />
      </div>
    </>
  );
};

export default Resources;