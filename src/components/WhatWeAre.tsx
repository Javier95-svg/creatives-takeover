import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="glass border-border">
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

          <Card className="glass border-border">
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

          <Card className="glass border-border">
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