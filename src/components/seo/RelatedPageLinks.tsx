import { Link } from "react-router-dom";

interface RelatedPageLink {
  href: string;
  label: string;
}

interface RelatedPageLinksProps {
  title: string;
  links: RelatedPageLink[];
}

export default function RelatedPageLinks({ title, links }: RelatedPageLinksProps) {
  return (
    <nav
      aria-label={title}
      className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/75 p-3 backdrop-blur"
    >
      <span className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </span>
      {links.map((link) => (
        <Link
          key={link.href}
          to={link.href}
          className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
