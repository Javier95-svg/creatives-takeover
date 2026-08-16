import { ArrowRight, MessageSquareText, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFirstCustomerSprint } from '@/hooks/useFirstCustomerSprint';

export default function FirstCustomerSprintPilotCallout() {
  const sprint = useFirstCustomerSprint();
  if (!sprint.enabled) return null;

  return (
    <section className="container mx-auto px-4 py-8 sm:px-6" aria-labelledby="first-customer-pilot-title">
      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <Badge variant="outline">Capacity-screened founder sprint</Badge>
            <h2 id="first-customer-pilot-title" className="mt-3 text-2xl font-bold sm:text-3xl">Reach three qualified buyer conversations in 30 days.</h2>
            <p className="mt-2 text-muted-foreground">For idea, concept-demo, and working-product B2B SaaS founders with 0–3 paying customers. We help prepare the target list, proof, and messages; you send every message and use one verified mentor checkpoint to decide what the evidence means.</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" />20 prospects</span>
              <span className="flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-primary" />10 manual messages</span>
            </div>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link to="/first-customer-sprint/apply?source=homepage">Apply for the sprint <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
