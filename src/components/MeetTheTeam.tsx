import { Card } from "@/components/ui/card";
import { Linkedin } from "lucide-react";

import javierPhoto from "@/assets/team-javier-pena.png";
import aamirPhoto from "@/assets/team-aamir-khan.png";
import danielaPhoto from "@/assets/team-daniela-hagg.png";

type TeamMember = {
  name: string;
  role: string;
  bio: string;
  linkedin: string;
  photo: string;
};

const teamMembers: TeamMember[] = [
  {
    name: "Javier Peña",
    role: "Founder & CEO",
    bio: "Serial entrepreneur focused on empowering creatives with trustworthy automation and accessible startup playbooks.",
    linkedin: "https://www.linkedin.com/in/javier-digital-marketing/",
    photo: javierPhoto,
  },
  {
    name: "Aamir Khan",
    role: "Chief Technology Officer",
    bio: "Product-minded technologist building resilient AI systems that keep founders shipping fast and learning faster.",
    linkedin: "https://www.linkedin.com/in/akgigyani/",
    photo: aamirPhoto,
  },
  {
    name: "Daniela Hägg",
    role: "Growth Associate",
    bio: "Customer advocate obsessed with clear positioning, data-backed experiments, and building community trust at every touchpoint.",
    linkedin: "https://www.linkedin.com/in/daniela-h-72752914b/",
    photo: danielaPhoto,
  },
];

const MeetTheTeam = () => {
  return (
    <section className="relative py-20 overflow-hidden" id="meet-the-team">
      {/* Animated Wallpaper Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        
        {/* Animated circles representing team collaboration */}
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-gradient-to-br from-secondary/15 to-transparent blur-3xl animate-pulse" style={{ animationDuration: "5s", animationDelay: "1s" }} />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-gradient-to-br from-accent/10 to-transparent blur-2xl animate-pulse" style={{ animationDuration: "6s", animationDelay: "2s" }} />
        
        {/* Connection lines - representing team collaboration */}
        <svg className="absolute inset-0 w-full h-full opacity-20">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {/* Animated connection lines */}
          <line x1="20%" y1="30%" x2="50%" y2="40%" stroke="url(#lineGradient)" strokeWidth="2" className="animate-pulse" style={{ animationDuration: "3s" }} />
          <line x1="50%" y1="40%" x2="80%" y2="35%" stroke="url(#lineGradient)" strokeWidth="2" className="animate-pulse" style={{ animationDuration: "4s", animationDelay: "0.5s" }} />
          <line x1="30%" y1="70%" x2="60%" y2="60%" stroke="url(#lineGradient)" strokeWidth="2" className="animate-pulse" style={{ animationDuration: "3.5s", animationDelay: "1s" }} />
          <line x1="60%" y1="60%" x2="75%" y2="75%" stroke="url(#lineGradient)" strokeWidth="2" className="animate-pulse" style={{ animationDuration: "4.5s", animationDelay: "1.5s" }} />
        </svg>
        
        {/* Floating particles */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/40 animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${3 + Math.random() * 3}s`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
        
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/70 to-background/90" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16 animate-slide-up">
          <h2 className="text-4xl font-bold mb-4 gradient-text animate-text-shimmer">
            Meet the Team
          </h2>
          <p
            className="text-lg text-muted-foreground leading-relaxed"
            style={{ animationDelay: "0.2s" }}
          >
            Behind every great product is a team you can trust. Meet the passionate innovators dedicated to your success—combining deep expertise in technology, growth, and entrepreneurship to help you build, launch, and scale with confidence.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member) => (
            <Card
              key={member.name}
              className="glass border-border/60 overflow-hidden flex flex-col"
            >
              <figure className="aspect-square overflow-hidden">
                <img
                  src={member.photo}
                  alt={`Portrait of ${member.name}`}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  loading="lazy"
                />
                <figcaption className="sr-only">{`${member.name}, ${member.role}`}</figcaption>
              </figure>

              <div className="p-6 flex flex-col flex-1">
                <div className="mb-3">
                  <h3 className="text-2xl font-semibold text-foreground">
                    {member.name}
                  </h3>
                  <p className="text-sm font-medium uppercase tracking-widest text-primary/80">
                    {member.role}
                  </p>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  {member.bio}
                </p>

                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  aria-label={`Connect with ${member.name} on LinkedIn`}
                >
                  <Linkedin className="h-5 w-5" />
                  <span>Connect on LinkedIn</span>
                </a>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MeetTheTeam;
