import { Linkedin, Mail, Users } from "lucide-react";

import danielaPhoto from "@/assets/team-daniela-hagg.webp";
import javierPhoto from "@/assets/team-javier-pena-profile.jpg";
import jelenaPhoto from "@/assets/team-jelena-dabovic.webp";
import lindseyPhoto from "@/assets/team-lindsey-martin.jpg";
import otiliaPhoto from "@/assets/team-otilia-dogaru.jpg";
import rominaPhoto from "@/assets/team-romina-roshandel.jpg";
import { Card } from "@/components/ui/card";

type TeamMember = {
  id: string;
  name: string;
  role: string;
  linkedin: string;
  x?: string;
  email?: string;
  photo: string;
};

const teamMembers: TeamMember[] = [
  {
    id: "founder",
    name: "Javier Peña",
    role: "Founder (CEO & CTO)",
    linkedin: "https://www.linkedin.com/in/javier-digital-marketing/",
    x: "https://x.com/JavierForge",
    email: "javier@creatives-takeover.com",
    photo: javierPhoto,
  },
  {
    id: "daniela-hagg",
    name: "Daniela Hägg",
    role: "Growth Associate",
    linkedin: "https://www.linkedin.com/in/daniela-h-72752914b/",
    email: "daniela.a.hagg@gmail.com",
    photo: danielaPhoto,
  },
  {
    id: "otilia-dogaru",
    name: "Otilia Dogaru",
    role: "Growth Associate",
    linkedin: "https://www.linkedin.com/in/otilia-dogaru/",
    email: "otiliadogaru.ldn@gmail.com",
    photo: otiliaPhoto,
  },
  {
    id: "jelena-dabovic",
    name: "Jelena Dabovic",
    role: "Content Partner",
    linkedin: "https://ba.linkedin.com/in/jelena-dabovic-b6847a38b",
    email: "jdabovic58@gmail.com",
    photo: jelenaPhoto,
  },
  {
    id: "lindsey-martin",
    name: "Lindsey Martin",
    role: "Sales Development Representative",
    linkedin: "https://www.linkedin.com/in/lindsey-m-2219abb0/",
    email: "lindsey@creatives-takeover.com",
    photo: lindseyPhoto,
  },
  {
    id: "romina-roshandel",
    name: "Romina Roshandel",
    role: "Sales Development Representative",
    linkedin: "https://www.linkedin.com/in/romina-roshandel-/",
    email: "romina@creatives-takeover.com",
    photo: rominaPhoto,
  },
];

const MeetTheTeam = () => {
  return (
    <section className="relative overflow-hidden py-20" id="meet-the-team">
      <div className="container relative z-10 mx-auto px-6">
        <div className="mx-auto mb-16 max-w-3xl animate-slide-up text-center">
          <h2 className="gradient-text animate-text-shimmer animate-fade-in flex items-center justify-center gap-3 text-6xl font-bold">
            <span>Meet the Team</span>
            <Users className="h-10 w-10" aria-hidden="true" />
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member) => (
            <Card
              key={member.id}
              id={member.id}
              className="glass flex min-h-64 flex-col border-border/60 p-6 transition-transform duration-300 ease-out hover:scale-[1.02]"
            >
              <div className="flex items-center gap-4">
                <img
                  src={member.photo}
                  alt={`Portrait of ${member.name}`}
                  className="h-20 w-20 shrink-0 rounded-full border-2 border-primary/25 object-cover shadow-md"
                  width={80}
                  height={80}
                  loading="lazy"
                  decoding="async"
                />
                <div className="min-w-0">
                  <h3 className="text-2xl font-semibold leading-tight text-foreground">{member.name}</h3>
                  <p className="mt-2 text-sm font-medium uppercase leading-5 tracking-widest text-primary/85">
                    {member.role}
                  </p>
                </div>
              </div>

              <div className="mt-auto flex flex-wrap gap-3 border-t border-border/50 pt-5">
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`View ${member.name} on LinkedIn`}
                >
                  <Linkedin className="h-4 w-4" aria-hidden="true" />
                  LinkedIn
                </a>
                {member.x && (
                  <a
                    href={member.x}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`View ${member.name} on X`}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    X
                  </a>
                )}
                {member.email && (
                  <a
                    href={`mailto:${member.email}`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Send a message to ${member.name}`}
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    Message
                  </a>
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
