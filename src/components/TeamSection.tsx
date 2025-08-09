import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import teamMember1 from "@/assets/team-member-1.jpg";
import teamMember2 from "@/assets/team-member-2.jpg";
import teamMember3 from "@/assets/team-member-3.jpg";
import { Linkedin, Twitter, Mail } from "lucide-react";

const TeamSection = () => {
  const teamMembers = [
    {
      name: "Sarah Chen",
      role: "Creative Director & Co-Founder",
      bio: "Former designer at Google with 8+ years of experience in user experience and product design. Passionate about making complex technology feel human and accessible.",
      image: teamMember1,
      skills: ["UX Design", "Product Strategy", "Design Systems"],
      social: {
        linkedin: "#",
        twitter: "#",
        email: "sarah@creativestakeover.com"
      }
    },
    {
      name: "Marcus Rodriguez",
      role: "Lead Developer & Co-Founder",
      bio: "Full-stack engineer who believes code should serve creativity, not constrain it. Previously built developer tools at Stripe and led engineering at two successful startups.",
      image: teamMember2,
      skills: ["Full-Stack Development", "No-Code Platforms", "DevOps"],
      social: {
        linkedin: "#",
        twitter: "#",
        email: "marcus@creativestakeover.com"
      }
    },
    {
      name: "Zoe Williams",
      role: "Community Manager",
      bio: "Community builder extraordinaire who's fostered growth in communities ranging from 100 to 100k+ members. Believes every creator has a story worth telling and sharing.",
      image: teamMember3,
      skills: ["Community Building", "Content Strategy", "Event Planning"],
      social: {
        linkedin: "#",
        twitter: "#",
        email: "zoe@creativestakeover.com"
      }
    }
  ];

  return (
    <section className="py-20 bg-background" id="team">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-16 animate-slide-up">
          <h2 className="text-4xl font-bold mb-6 gradient-text animate-text-shimmer">Meet Our Team</h2>
          <p className="text-lg text-muted-foreground leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            The passionate people behind Creatives Takeover, united by a shared vision 
            of empowering creators worldwide
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {teamMembers.map((member, index) => (
            <Card 
              key={member.name} 
              className="glass border-border group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 animate-zoom-in hover-lift btn-magnetic"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <Avatar className="w-24 h-24 mx-auto mb-4 ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all">
                    <AvatarImage src={member.image} alt={member.name} />
                    <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-bold mb-1">{member.name}</h3>
                  <p className="text-primary font-medium mb-3">{member.role}</p>
                </div>

                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {member.bio}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {member.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>

                <div className="flex justify-center space-x-3 pt-4 border-t border-border">
                  <Button variant="ghost" size="sm" className="p-2 h-8 w-8">
                    <Linkedin className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2 h-8 w-8">
                    <Twitter className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2 h-8 w-8">
                    <Mail className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </section>
  );
};

export default TeamSection;