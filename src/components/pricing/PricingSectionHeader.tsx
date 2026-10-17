/**
 * One header style for every section of /pricing (2026-10-17): the gradient
 * title at subheading size and an optional one-line lede.
 */
const PricingSectionHeader = ({ title, lede }: { title: string; lede?: string }) => (
  <div className="mx-auto mb-12 max-w-3xl text-center">
    <h2 className="gradient-text pb-2 font-space-grotesk text-4xl font-semibold tracking-tight text-balance lg:text-5xl">{title}</h2>
    {lede ? <p className="mt-4 text-lg text-muted-foreground text-balance sm:text-xl">{lede}</p> : null}
  </div>
);

export default PricingSectionHeader;
