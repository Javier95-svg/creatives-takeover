/**
 * One header style for every section of /pricing (2026-10-17): a small
 * eyebrow, the gradient title the page always used and an optional one-line
 * lede.
 */
const PricingSectionHeader = ({ eyebrow, title, lede }: { eyebrow: string; title: string; lede?: string }) => (
  <div className="mx-auto mb-10 max-w-2xl text-center">
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
    <h2 className="gradient-text mt-3 pb-1 font-space-grotesk text-3xl font-semibold tracking-tight text-balance lg:text-4xl">{title}</h2>
    {lede ? <p className="mt-3 text-base text-muted-foreground sm:text-lg">{lede}</p> : null}
  </div>
);

export default PricingSectionHeader;
