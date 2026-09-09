/** Shared by GTM execution and the prebuild validation recruitment step. */
export function buildBuyerInterviewScript(trigger: string, offer: string): string {
  return `1. Take me back to the last time ${trigger.toLowerCase()}.\n2. What did you try first?\n3. What alternatives did you compare?\n4. What made the problem expensive or urgent?\n5. Who influenced the decision?\n6. What evidence would make ${offer.toLowerCase()} credible?\n7. Where did you look for an answer?\n\nDo not pitch until the interview is complete. Capture exact customer language.`;
}
