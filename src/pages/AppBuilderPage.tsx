import SEO, { createSoftwareApplicationSchema } from '@/components/SEO';
import { MVPBuilder } from '@/components/mvp-builder/MVPBuilder';

export default function AppBuilderPage() {
  const structuredData = [
    createSoftwareApplicationSchema({
      name: 'MVP Builder',
      description: 'AI MVP builder for founders who want to turn product ideas into working prototypes with live preview.',
      url: '/mvp-builder',
      featureList: ['prompt-based app generation', 'live preview', 'iterative code updates'],
    }),
  ];

  return (
    <>
      <SEO
        title="AI MVP Builder | Creatives Takeover"
        description="Describe your product, generate a working MVP, and iterate with live preview and code updates inside an AI MVP builder."
        keywords="ai mvp builder, app builder ai, startup prototype builder, mvp generator, prompt to app"
        url="/mvp-builder"
        structuredData={structuredData}
      />
      <MVPBuilder />
    </>
  );
}
