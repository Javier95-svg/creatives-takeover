import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

type HomeSectionHeaderProps = {
  badge: string;
  title: string;
  id?: string;
  children?: ReactNode;
};

/** The badge, title and lede every homepage section opens with. */
const HomeSectionHeader = ({ badge, title, id, children }: HomeSectionHeaderProps) => (
  <div className="hs-header">
    <Badge variant="outline" className="homepage-section-badge mb-5">
      {badge}
    </Badge>
    <h2 id={id} className="homepage-section-title text-3xl sm:text-4xl lg:text-[2.9rem] mb-5">
      {title}
    </h2>
    {children ? <p className="homepage-section-copy text-base sm:text-lg">{children}</p> : null}
  </div>
);

export default HomeSectionHeader;
