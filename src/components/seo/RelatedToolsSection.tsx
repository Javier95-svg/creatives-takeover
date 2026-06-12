import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface RelatedTool {
  name: string;
  description: string;
  url: string;
}

interface RelatedToolsSectionProps {
  tools: RelatedTool[];
}

export default function RelatedToolsSection({ tools }: RelatedToolsSectionProps) {
  return (
    <section className="rounded-5xl border border-border/60 bg-card/70 p-6 shadow-sm backdrop-blur sm:p-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Related Tools
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Each tool in the BizMap workflow connects to the next stage of your founder journey.
        </p>
        <ul className="grid gap-3 sm:grid-cols-3">
          {tools.map((tool) => (
            <li key={tool.url}>
              <Link
                to={tool.url}
                className="group flex flex-col gap-1 rounded-xl border border-border/50 bg-background/60 p-4 transition-colors hover:border-primary/40 hover:bg-muted/50"
              >
                <span className="flex items-center justify-between font-medium text-foreground group-hover:text-primary">
                  {tool.name}
                  <ArrowRight className="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed">{tool.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
