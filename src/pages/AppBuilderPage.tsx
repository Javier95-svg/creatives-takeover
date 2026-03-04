import SEO from '@/components/SEO';
import { MVPBuilder } from '@/components/mvp-builder/MVPBuilder';

export default function AppBuilderPage() {
  return (
    <>
      <SEO
        title="App Builder — Creatives Takeover"
        description="Build functional web apps by simply describing what you want. AI-powered vibe coding — describe, preview, iterate."
        keywords="ai app builder, vibe coding, no-code, mvp builder, web app generator"
        url="/mvp-builder"
      />
      <MVPBuilder />
    </>
  );
}
