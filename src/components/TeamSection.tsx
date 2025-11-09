import { Card, CardContent } from "@/components/ui/card";
import { Linkedin } from "lucide-react";

type TeamMember = {
  name: string;
  role: string;
  bio: string;
  photo: string;
  linkedin?: string;
};

const team: TeamMember[] = [
  {
    name: "Javier Peña",
    role: "Founder & CEO",
    bio: "Javier built BizMap after ten years guiding indie founders from napkin sketches to first revenue. He previously launched three accelerator-style programs and still coaches every founder cohort to keep their plans grounded in real outcomes.",
    photo: "/team/javier-pena.jpg",
    linkedin: "https://www.linkedin.com/in/javier-pena",
  },
  {
    name: "Aamir Khan",
    role: "CTO",
    bio: "Aamir is the systems thinker behind BizMap’s AI stack. He has led product engineering teams across fintech and creator tooling, and now focuses on keeping every conversation fast, reliable, and context-aware for founders under pressure.",
    photo: "/team/aamir-khan.jpg",
    linkedin: "https://www.linkedin.com/in/aamir-khan",
  },
  {
    name: "Daniela Hägg",
    role: "Growth Associate",
    bio: "Daniela runs onboarding, accountability pods, and community programming so founders never feel alone. Her background in partnerships and content helps translate customer insights into growth experiments every week.",
    photo: "/team/daniela-hagg.jpg",
    linkedin: "https://www.linkedin.com/in/daniela-hagg",
  },
];

const TeamSection = () => (
  <section id="team" className="py-20 bg-background/60">
    <div className="container mx-auto px-6">
      <div className="max-w-3xl mx-auto text-center mb-14">
        <h2 className="text-4xl font-semibold text-foreground mb-4">Meet the Team</h2>
        <p className="text-lg text-muted-foreground">
          BizMap is stewarded by operators, technologists, and community builders who sit in the trenches with founders every single day.
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {team.map((member) => (
          <Card key={member.name} className="h-full border border-border/50 shadow-sm bg-card">
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              <img
                src={member.photo}
                alt={member.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <CardContent className="p-6 space-y-3">
              <div>
                <h3 className="text-xl font-semibold text-foreground">{member.name}</h3>
                <p className="text-sm text-primary font-medium">{member.role}</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {member.bio}
              </p>
              {member.linkedin && (
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                  Connect on LinkedIn
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </section>
);

export default TeamSection;
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