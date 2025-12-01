import { ReactNode, ElementType } from "react";

type PageSectionProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
};

const PageSection = ({ children, className = "", as: Tag = "section" }: PageSectionProps) => {
  return (
    <Tag className={`w-full py-12 sm:py-16`}> 
      <div className={`container mx-auto max-w-[1152px] px-6 ${className}`}>
        {children}
      </div>
    </Tag>
  );
};

export default PageSection;

