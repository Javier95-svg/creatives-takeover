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
            <Badge variant="outline">8–10 founder pilot · mixed cohort</Badge>
            <h2 id="first-customer-pilot-title" className="mt-3 text-2xl font-bold sm:text-3xl">Reach three qualified buyer conversations in 30 days.</h2>
            <p className="mt-2 text-muted-foreground">For B2B SaaS founders with a working product and 0–3 customers. Bring real prospects, send the messages yourself, and use one GTM mentor checkpoint to decide what the evidence means.</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" />20 prospects</span>
              <span className="flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-primary" />10 manual messages</span>
            </div>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link to="/first-customer-sprint/apply?source=homepage">Apply for the pilot <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
