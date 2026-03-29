import SEO from '@/components/SEO';
import { MVPBuilder } from '@/components/mvp-builder/MVPBuilder';

export default function AppBuilderPage() {
  return (
    <>
      <SEO
        title="App Builder — Creatives Takeover"
        description="Build and iterate MVPs through natural-language prompts, live preview, and editable code. Describe your product, generate a working project, inspect the files, and keep changes in sync."
        keywords="ai app builder, vibe coding, no-code, mvp builder, web app generator"
        url="/mvp-builder"
      />
      <MVPBuilder />
    </>
  );
}
