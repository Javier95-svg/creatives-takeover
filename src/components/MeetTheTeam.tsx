import { Card } from "@/components/ui/card";
import { Linkedin } from "lucide-react";

import javierPhoto from "@/assets/team-javier-pena.png";
import domagojPhoto from "@/assets/team-domagoj-markota.png";
import danielaPhoto from "@/assets/team-daniela-hagg.png";

// #region agent log
if (typeof window !== 'undefined') { fetch('http://127.0.0.1:7249/ingest/39896c49-d999-4dc3-8e56-d8f6d08b7d91',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MeetTheTeam.tsx:6',message:'Image imports check',data:{javierPhoto:javierPhoto,domagojPhoto:domagojPhoto,danielaPhoto:danielaPhoto,javierType:typeof javierPhoto,domagojType:typeof domagojPhoto,danielaType:typeof danielaPhoto},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{}); }
// #endregion

type TeamMember = {
  name: string;
  role: string;
  bio: string;
  linkedin?: string;
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
    name: "Domagoj Markota",
    role: "Fractional CTO",
    bio: "",
    photo: domagojPhoto,
  },
  {
    name: "Daniela Hägg",
    role: "Growth Associate",
    bio: "Customer advocate obsessed with clear positioning, data-backed experiments, and building community trust at every touchpoint.",
    linkedin: "https://www.linkedin.com/in/daniela-h-72752914b/",
    photo: danielaPhoto,
  },
];

// #region agent log
if (typeof window !== 'undefined') { fetch('http://127.0.0.1:7249/ingest/39896c49-d999-4dc3-8e56-d8f6d08b7d91',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MeetTheTeam.tsx:37',message:'teamMembers array check',data:{length:teamMembers.length,members:teamMembers.map(m=>({name:m.name,role:m.role,photo:m.photo,photoType:typeof m.photo}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{}); }
// #endregion

const MeetTheTeam = () => {
  // #region agent log
  if (typeof window !== 'undefined') { fetch('http://127.0.0.1:7249/ingest/39896c49-d999-4dc3-8e56-d8f6d08b7d91',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MeetTheTeam.tsx:40',message:'MeetTheTeam render start',data:{teamMembersLength:teamMembers.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{}); }
  // #endregion
  return (
    <section className="relative py-20 overflow-hidden" id="meet-the-team">
      {/* Wallpaper Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        
        {/* Simple subtle circles */}
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-gradient-to-br from-secondary/10 to-transparent blur-3xl animate-pulse" style={{ animationDuration: "5s", animationDelay: "1s" }} />
        
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/70 to-background/90" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16 animate-slide-up">
          <h2 className="text-5xl font-bold mb-4 gradient-text animate-text-shimmer animate-fade-in">
            Meet the Team
          </h2>
          <p className="text-lg text-foreground/85 leading-relaxed">
            Our small team brings together tech, hustle, and a passion for helping others launch what matters. We believe in practical solutions, honest feedback, and building real community.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member) => {
            // #region agent log
            if (typeof window !== 'undefined') { fetch('http://127.0.0.1:7249/ingest/39896c49-d999-4dc3-8e56-d8f6d08b7d91',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MeetTheTeam.tsx:68',message:'Mapping team member',data:{name:member.name,role:member.role,photo:member.photo,photoType:typeof member.photo,hasLinkedIn:!!member.linkedin},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{}); }
            // #endregion
            return (
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

                <p className="text-sm text-foreground/85 leading-relaxed flex-1">
                  {member.bio}
                </p>

                {member.linkedin && (
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
                )}
              </div>
            </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default MeetTheTeam;
