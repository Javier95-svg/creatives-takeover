import { ReactNode, ElementType } from "react";

type PageSectionProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
};

const PageSection = ({ children, className = "", as: Tag = "section" }: PageSectionProps) => {
  return (
    <Tag className={`w-full py-16 sm:py-20`}> 
      <div className={`container mx-auto max-w-[1152px] px-6 sm:px-8 ${className}`}>
        {children}
      </div>
    </Tag>
  );
};

export default PageSection;

