import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Eye } from "lucide-react";

const MissionVision = () => {
  return (
    <section className="py-20 bg-background/50" id="mission-vision">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-16 animate-slide-up">
          <h2 className="text-4xl font-bold mb-6 gradient-text animate-text-shimmer">Our Mission & Vision</h2>
          <p className="text-lg text-muted-foreground leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Driven by purpose, guided by vision—discover what makes Creatives Takeover unique
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Mission */}
          <Card className="glass border-border group hover:shadow-xl transition-all duration-500 animate-slide-in-left hover-lift btn-magnetic">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl gradient-text animate-text-shimmer">Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed text-center">
                Our mission is to empower anyone, anywhere, to launch their own startup by making advanced AI automation tools accessible, affordable, and easy to use.
              </CardDescription>
              <CardDescription className="text-base leading-relaxed text-center">
                We believe entrepreneurship should not be limited by technical skills, financial barriers, or location. By combining cutting-edge AI with intuitive workflows, we aim to streamline every stage of the startup journey, from idea validation and market research to branding, product development, and launch, so individuals can focus on innovation and creativity.
              </CardDescription>
              <CardDescription className="text-base leading-relaxed text-center">
                We envision a world where any person with an idea can bring it to life in record time, supported by intelligent automation that reduces costs, accelerates progress, and removes complexity. Through our platform, we strive to democratize startup creation and ignite a new wave of diverse, AI-powered businesses that drive economic growth and positive change.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Vision */}
          <Card className="glass border-border group hover:shadow-xl transition-all duration-500 animate-slide-in-right hover-lift btn-magnetic" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Eye className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl gradient-text animate-text-shimmer">Our Vision</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed text-center">
                We envision a world where any person with an idea can bring it to life in record time, supported by intelligent automation that reduces costs, accelerates progress, and removes complexity. Through our platform, we strive to democratize startup creation and ignite a new wave of diverse, AI-powered businesses that drive economic growth and positive change.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

      </div>
    </section>
  );
};

export default MissionVision;