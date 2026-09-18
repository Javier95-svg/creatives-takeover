import { useState } from 'react';
import { PulseHomeView } from '@/components/pulse/PulseHomeView';
import { PLATFORM_TOUR_FIXTURE } from '@/lib/platformTour/tourFixture';
import type { PulseHomeMessage } from '@/lib/pulseHome';
import { useTourGate } from '../PlatformTourGateContext';

// Deliberately the named view, not the default PulseHome export. That default is
// a hasApplicationConfig switch which lazy-loads PulseHomeLive as soon as the
// app is configured, which in production is always, and Live opens a Supabase
// conversation keyed to a signed-in user.
export function PulseHomePanel({ onNavigate }: { onNavigate: (path: string) => void }) {
  const openGate = useTourGate();
  // Opens empty on purpose. PulseHomeView switches to chat layout as soon as it
  // has a message, which hides the project chips, the stage badge and the quick
  // starts, and those are what show a visitor the assistant is working from a
  // real project rather than a blank prompt box.
  const [messages, setMessages] = useState<PulseHomeMessage[]>([]);
  const { account, project } = PLATFORM_TOUR_FIXTURE;
  // Any question gets the same honest answer. Replaying the seeded exchange
  // instead would attach a detailed interview critique to whatever the visitor
  // happened to type, which reads as broken rather than impressive. That worked
  // exchange is shown on the PMF Lab panel, where its subject actually is.
  const send = (text: string) => {
    const turn = `tour-${Date.now()}`;
    setMessages((previous) => [...previous,
      { id: `${turn}:user`, role: 'user', content: text },
      { id: `${turn}:assistant`, role: 'assistant', content:
        'This is a guided tour, so Pulse is not answering live here. With a free account it answers against your own stage, your saved tool outputs and your open tasks, and it only ever reasons about the project you have open. There is a worked answer on the PMF Lab panel, where Pulse argues the evidence is not yet good enough to call it.' },
    ]);
    openGate('pulse');
  };
  return <PulseHomeView
    concept="guided-journey"
    name={account.firstName}
    stage={project.stage}
    projectName={project.name}
    assignedStage={project.assignedStage}
    priorities={PLATFORM_TOUR_FIXTURE.priorities}
    messages={messages}
    navigate={onNavigate}
    onNew={() => setMessages([])}
    // pulseHomeStream is never imported here, so there is no path from this
    // panel to the model even if the composer is used.
    onSend={send}
  />;
}
