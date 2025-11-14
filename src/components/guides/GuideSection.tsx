import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface GuideSectionProps {
  id?: string;
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}

const GuideSection = ({ id, title, icon: Icon, children, className = "" }: GuideSectionProps) => {
  return (
    <section id={id} className={`scroll-mt-24 mb-12 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        {Icon && (
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        )}
        <h2 className="text-3xl font-bold m-0">{title}</h2>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </section>
  );
};

export default GuideSection;
