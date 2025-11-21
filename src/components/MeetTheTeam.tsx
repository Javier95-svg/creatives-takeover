import { Card } from "@/components/ui/card";
import { Linkedin } from "lucide-react";

import javierPhoto from "@/assets/team-javier-pena.png";
import aamirPhoto from "@/assets/team-aamir-khan.png";
import danielaPhoto from "@/assets/team-daniela-hagg.png";
import tylerPhoto from "@/assets/team-tyler-tennant.png";

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
  {
    name: "Tyler Tennant",
    role: "Technical Lead",
    bio: "AI/ML Engineer with 7+ years of experience designing, building, and deploying production-grade AI systems.",
    linkedin: "https://www.linkedin.com/in/tyler-tennant-59a247398/",
    photo: tylerPhoto,
  },
];

const MeetTheTeam = () => {
  return (
    <section className="relative py-20 overflow-hidden" id="meet-the-team">
      {/* Enhanced Animated Wallpaper Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Multi-layer gradient backdrop with depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-secondary/8" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-primary/5" />
        <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-secondary/5 to-background/20" />
        
        {/* Dynamic conic gradient swirls - representing collaboration flow */}
        <div
          className="absolute inset-0 opacity-50 animate-[spin_45s_linear_infinite]"
          style={{
            backgroundImage:
              'conic-gradient(from 0deg at 30% 40%, rgba(59,130,246,0.25), rgba(139,92,246,0.2), rgba(236,72,153,0.15), transparent 65%), conic-gradient(from 180deg at 70% 60%, rgba(6,182,212,0.22), rgba(59,130,246,0.18), rgba(139,92,246,0.12), transparent 70%), conic-gradient(from 90deg at 50% 50%, rgba(168,85,247,0.15), transparent 50%)',
          }}
        />
        
        {/* Large rotating gradient orbs - team energy */}
        <div className="absolute -top-52 left-1/5 w-[60rem] h-[60rem] rounded-full bg-gradient-to-br from-primary/25 via-accent/20 to-secondary/15 blur-[120px] animate-[spin_50s_linear_infinite] opacity-70" />
        <div className="absolute top-1/2 -right-40 w-[50rem] h-[50rem] rounded-full bg-gradient-to-tl from-secondary/30 via-primary/20 to-accent/18 blur-[110px] animate-[spin_42s_linear_infinite_reverse] opacity-65" />
        <div className="absolute bottom-24 left-1/3 w-[45rem] h-[45rem] rounded-full bg-gradient-to-tr from-accent/28 via-primary/22 to-secondary/20 blur-[105px] animate-[spin_46s_linear_infinite] opacity-60" />
        <div className="absolute top-1/4 right-1/4 w-[40rem] h-[40rem] rounded-full bg-gradient-to-bl from-secondary/20 via-accent/15 to-transparent blur-[95px] animate-[spin_38s_linear_infinite_reverse] opacity-55" />
        <div className="absolute -bottom-32 left-1/2 w-[48rem] h-[48rem] rounded-full bg-gradient-to-t from-primary/18 via-secondary/12 to-transparent blur-[100px] animate-[spin_44s_linear_infinite] opacity-50" />
        
        {/* Sophisticated mesh pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'radial-gradient(at 20% 30%, hsl(var(--primary)) 0px, transparent 50%), radial-gradient(at 60% 40%, hsl(var(--secondary)) 0px, transparent 50%), radial-gradient(at 80% 70%, hsl(var(--accent)) 0px, transparent 50%)',
          }}
        />
        
        {/* Enhanced connection network - representing team bonds */}
        <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 1440 900" preserveAspectRatio="none">
          <defs>
            <linearGradient id="teamLineGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
              <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity="0.5" />
              <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="teamLineGradient2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.35" />
              <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.45" />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="teamLineGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0" />
              <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Curved connection paths */}
          <path
            d="M200 180 Q420 220 640 280 T1120 380"
            fill="none"
            stroke="url(#teamLineGradient1)"
            strokeWidth="2"
            strokeDasharray="16 24"
            className="animate-pulse"
            style={{ animationDuration: "4s" }}
          />
          <path
            d="M120 620 Q360 580 600 640 T1080 760"
            fill="none"
            stroke="url(#teamLineGradient2)"
            strokeWidth="1.8"
            strokeDasharray="14 22"
            className="animate-pulse"
            style={{ animationDuration: "5s", animationDelay: "0.5s" }}
          />
          <path
            d="M320 420 Q520 380 720 420 T1120 440"
            fill="none"
            stroke="url(#teamLineGradient3)"
            strokeWidth="2.2"
            strokeDasharray="18 26"
            className="animate-pulse"
            style={{ animationDuration: "4.5s", animationDelay: "1s" }}
          />
          <path
            d="M180 480 Q380 520 580 480 T980 460"
            fill="none"
            stroke="url(#teamLineGradient1)"
            strokeWidth="1.6"
            strokeDasharray="12 20"
            className="animate-pulse"
            style={{ animationDuration: "3.5s", animationDelay: "1.5s" }}
          />
          
          {/* Connection nodes */}
          {[
            { x: 200, y: 180 },
            { x: 640, y: 280 },
            { x: 1120, y: 380 },
            { x: 600, y: 640 },
            { x: 1080, y: 760 },
            { x: 720, y: 420 },
            { x: 580, y: 480 },
          ].map((node, i) => (
            <circle
              key={`node-${i}`}
              cx={node.x}
              cy={node.y}
              r="4"
              fill="hsl(var(--primary))"
              opacity="0.6"
              className="animate-pulse"
              style={{ animationDuration: `${3 + (i % 3)}s`, animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </svg>
        
        {/* Enhanced floating particles with varied sizes and glow */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute rounded-full bg-gradient-to-br from-primary/60 via-accent/50 to-secondary/40 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
            style={{
              width: `${4 + (i % 3) * 2}px`,
              height: `${4 + (i % 3) * 2}px`,
              top: `${10 + (i * 13) % 80}%`,
              left: `${8 + (i * 17) % 85}%`,
              animation: 'pulse 4s ease-in-out infinite',
              animationDelay: `${(i * 0.4) % 3}s`,
              filter: 'blur(0.5px)',
            }}
          />
        ))}
        
        {/* Glowing orbs - additional depth */}
        <div className="absolute top-20 right-1/4 w-32 h-32 rounded-full bg-gradient-to-br from-primary/30 via-transparent to-transparent blur-2xl animate-[ping_8s_linear_infinite] opacity-70" />
        <div className="absolute bottom-32 left-1/5 w-36 h-36 rounded-full bg-gradient-to-br from-secondary/25 via-transparent to-transparent blur-2xl animate-[ping_10s_linear_infinite_reverse] opacity-65" />
        <div className="absolute top-1/2 left-1/2 w-28 h-28 rounded-full bg-gradient-to-br from-accent/20 via-transparent to-transparent blur-xl animate-[ping_12s_linear_infinite] opacity-60" style={{ transform: 'translate(-50%, -50%)' }} />
        
        {/* Subtle shimmer effect */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: 'linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)',
            animation: 'shimmer 20s ease-in-out infinite',
          }}
        />
        
        {/* Overlay for readability with gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background/85" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16 animate-slide-up">
          <h2 className="text-5xl font-bold mb-4 gradient-text animate-text-shimmer">
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
