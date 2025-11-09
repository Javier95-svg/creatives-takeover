import { Card } from "@/components/ui/card";
import { Linkedin } from "lucide-react";

import javierPhoto from "@/assets/team-javier-pena.jpg";
import aamirPhoto from "@/assets/team-aamir-khan.jpg";
import danielaPhoto from "@/assets/team-daniela-hagg.jpg";

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
    <section className="py-20 bg-background/80" id="meet-the-team">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16 animate-slide-up">
          <h2 className="text-4xl font-bold mb-4 gradient-text animate-text-shimmer">
            Meet the Team
          </h2>
          <p
            className="text-lg text-muted-foreground leading-relaxed"
            style={{ animationDelay: "0.2s" }}
          >
            Trust is built by the people behind the product. Get to know the core team partnering with you to launch, automate, and scale.
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
