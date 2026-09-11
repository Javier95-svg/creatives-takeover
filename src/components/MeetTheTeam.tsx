import { Card } from "@/components/ui/card";
import { Linkedin, Mail } from "lucide-react";

import javierPhoto from "@/assets/team-javier-pena.webp";
import domagojPhoto from "@/assets/team-domagoj-markota.webp";
import danielaPhoto from "@/assets/team-daniela-hagg.webp";
import jelenaPhoto from "@/assets/team-jelena-dabovic.webp";
import otiliaPhoto from "@/assets/team-otilia-dogaru.jpg";

type TeamMember = {
  name: string;
  role: string;
  linkedin?: string;
  x?: string;
  email?: string;
  photo: string;
};

const teamMembers: TeamMember[] = [
  {
    name: "Javier Peña",
    role: "Founder",
    linkedin: "https://www.linkedin.com/in/javier-digital-marketing/",
    x: "https://x.com/JavierForge",
    photo: javierPhoto,
  },
  {
    name: "Domagoj Markota",
    role: "Fractional CTO",
    email: "domagoj.markota@gmail.com",
    photo: domagojPhoto,
  },
  {
    name: "Daniela Hägg",
    role: "Growth Associate",
    linkedin: "https://www.linkedin.com/in/daniela-h-72752914b/",
    photo: danielaPhoto,
  },
  {
    name: "Jelena Dabovic",
    role: "Business Development Assistant",
    photo: jelenaPhoto,
  },
  {
    name: "Otilia Dogaru",
    role: "Sales Development Representative",
    linkedin: "https://www.linkedin.com/in/otilia-dogaru/",
    photo: otiliaPhoto,
  },
];

const MeetTheTeam = () => {
  return (
    <section className="relative py-20 overflow-hidden" id="meet-the-team">
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
          {teamMembers.map((member) => (
            <Card
              key={member.name}
              id={member.role === "Founder" ? "founder" : undefined}
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

                {(member.linkedin || member.email || member.x) && (
                  <div className="mt-6 flex flex-col gap-3">
                    {member.email ? (
                      <a
                        href={`mailto:${member.email}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                        aria-label={`Send a message to ${member.name}`}
                      >
                        <Mail className="h-5 w-5" />
                        <span>Send a Message</span>
                      </a>
                    ) : (
                      <>
                        {member.linkedin && (
                          <a
                            href={member.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                            aria-label={`Connect with ${member.name} on LinkedIn`}
                          >
                            <Linkedin className="h-5 w-5" />
                            <span>Connect on LinkedIn</span>
                          </a>
                        )}
                        {member.x && (
                          <a
                            href={member.x}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                            aria-label={`Connect with ${member.name} on X`}
                          >
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            <span>Connect on X</span>
                          </a>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MeetTheTeam;
