// Ready-to-send messages for the PMF survey link. A survey nobody receives
// gives no verdict: the hosted survey had 0 responses, and the step only
// offered "Copy link". Short, personal, and honest about the time it takes.

export interface SurveyOutreachMessage {
  channel: 'Direct message' | 'Email' | 'Community post';
  text: string;
}

export const PMF_TARGET_RESPONSES = 25;

export function buildSurveyOutreach(input: { productName: string; audience?: string | null; link: string }): SurveyOutreachMessage[] {
  const product = input.productName.trim() || 'my product';
  const audience = (input.audience ?? '').trim();
  const forWho = audience ? ` for ${audience.replace(/\.$/, '')}` : '';
  return [
    {
      channel: 'Direct message',
      text: `Hi {name}, you tried ${product} recently. Could you answer 3 quick questions? It takes under a minute and tells me what to build next: ${input.link}`,
    },
    {
      channel: 'Email',
      text: `Subject: One minute on ${product}?\n\nHi {name},\n\nI am building ${product}${forWho}. Your honest answer to three short questions would help me decide what to work on next. It takes under a minute:\n\n${input.link}\n\nThank you,\n{your name}`,
    },
    {
      channel: 'Community post',
      text: `I am building ${product}${forWho}. If you have used it, I would be grateful for one minute of honest feedback (3 questions, anonymous): ${input.link}`,
    },
  ];
}
