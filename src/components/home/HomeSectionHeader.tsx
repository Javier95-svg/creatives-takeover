import type { ReactNode } from "react";

type HomeSectionHeaderProps = {
  badge: string;
  title: ReactNode;
  id?: string;
  children?: ReactNode;
  /** Centred for sections whose content is centred under the heading. */
  align?: "start" | "center";
  className?: string;
};

/** The eyebrow, title and one-line lede every homepage section opens with. */
const HomeSectionHeader = ({ badge, title, id, children, align = "start", className = "" }: HomeSectionHeaderProps) => (
  <div className={`hx-head${align === "center" ? " hx-head--center" : ""} ${className}`}>
    <p className="homepage-section-badge hx-eyebrow">{badge}</p>
    <h2 id={id} className="homepage-section-title hx-title">
      {title}
    </h2>
    {children ? <p className="hx-lede">{children}</p> : null}
  </div>
);

export default HomeSectionHeader;
