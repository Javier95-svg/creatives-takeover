import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import innovationImage from "@/assets/innovation-leaders-unique.jpg";
import creativeImage from "@/assets/creative-enablers.jpg";
import communityImage from "@/assets/community-builders.jpg";

const WhatWeAre = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold mb-6 gradient-text">Who We Are</h2>
          <p className="text-xl text-muted-foreground">
            We are a revolutionary AI-powered platform dedicated to empowering creative professionals 
            with cutting-edge tools and insights to transform their creative journey.
          </p>
          <p className="text-lg text-muted-foreground mt-6">
            Creatives Takeover is a vibrant community built for creators and solopreneurs ready to bring their ideas to life. We guide you step-by-step from concept to launch, helping you build powerful no-code apps together. Whether you're a first-time founder or a curious creative, we make software creation accessible, collaborative, and genuinely fun. No code, no limits, just real solutions, built by you.
          </p>
        </div>

        {/* Mission and Vision First */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card className="glass border-border">
            <CardHeader>
              <CardTitle className="text-xl">Our Vision</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Empower a new wave of creators by making it effortless for anyone, anywhere to turn unique ideas into impactful software—without code, without barriers.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="glass border-border">
            <CardHeader>
              <CardTitle className="text-xl">Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Our mission is to guide and support solopreneurs and creators through every stage of their journey, from spark to launch, by building an inclusive, dynamic community and offering step-by-step tools and mentorship to create powerful, no-code applications.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Target Markets with Images */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="glass border-border overflow-hidden">
            <div className="h-48 overflow-hidden">
              <img 
                src={innovationImage} 
                alt="Innovation Leaders" 
                className="w-full h-full object-cover"
              />
            </div>
            <CardHeader>
              <CardTitle className="text-xl">Innovation Leaders</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                At the forefront of AI technology, we pioneer new ways to enhance creative workflows 
                and unlock unprecedented creative potential.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="glass border-border overflow-hidden">
            <div className="h-48 overflow-hidden">
              <img 
                src={creativeImage} 
                alt="Creative Enablers" 
                className="w-full h-full object-cover"
              />
            </div>
            <CardHeader>
              <CardTitle className="text-xl">Creative Enablers</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                We believe every creative has unique potential. Our mission is to provide the tools 
                and insights needed to amplify that creativity.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="glass border-border overflow-hidden">
            <div className="h-48 overflow-hidden">
              <img 
                src={communityImage} 
                alt="Community Builders" 
                className="w-full h-full object-cover"
              />
            </div>
            <CardHeader>
              <CardTitle className="text-xl">Community Builders</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                More than a platform, we're building a thriving community where creatives connect, 
                learn, and grow together.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default WhatWeAre;