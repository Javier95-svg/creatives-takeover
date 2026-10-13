import { Link, useSearchParams } from 'react-router-dom';
import ProductStoryResult from '@/components/hero/ProductStoryResult';
import SEO from '@/components/SEO';
import '@/components/hero-cinematic-spotlight.css';

export default function ProductStoryStart() {
  const [params] = useSearchParams();
  const token = params.get('guest');
  return <main className="ct-story-resume">
    <SEO title="Your demo story | Creatives Takeover" description="Save your product pitch and demo story, then continue in Demo Studio." url="/start/product" noindex />
    <Link to="/#get-started">← Back to the starting experiences</Link>
    {token ? <ProductStoryResult key={token} resumeToken={token} runId={0} restore claimOnAuth />
      : <p>Describe your product on the homepage to get your demo story.</p>}
  </main>;
}
