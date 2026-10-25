import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";

// Renders the markdown subset Startup Pedia entries are written in. Internal
// links stay in the SPA; external ones open in a new tab. The prerendered HTML
// uses src/lib/markdownToHtml.ts for the same content.
export default function PediaMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children: text }) => <h3>{text}</h3>,
        h2: ({ children: text }) => <h3>{text}</h3>,
        a: ({ href = "", children: text }) =>
          href.startsWith("/") ? (
            <Link to={href}>{text}</Link>
          ) : (
            <a href={href} target={href.startsWith("#") ? undefined : "_blank"} rel={href.startsWith("#") ? undefined : "noopener noreferrer"}>
              {text}
            </a>
          ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
