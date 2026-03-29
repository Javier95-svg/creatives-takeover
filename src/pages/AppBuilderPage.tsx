import { useEffect } from 'react';
import SEO from '@/components/SEO';
import { MVPBuilder } from '@/components/mvp-builder/MVPBuilder';

export default function AppBuilderPage() {
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, []);

  return (
    <>
      <SEO
        title="App Builder — Creatives Takeover"
        description="Build and iterate MVPs through natural-language prompts, live preview, and editable code. Describe your product, generate a working preview, inspect the code, and save your projects."
        keywords="ai app builder, mvp builder, live preview, product prototype, code generation"
        url="/mvp-builder"
      />
      <MVPBuilder />
    </>
  );
}
