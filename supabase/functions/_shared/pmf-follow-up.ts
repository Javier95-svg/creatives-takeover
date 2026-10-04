// The fixed "why?" asked after the Sean Ellis answer. Used when the AI cap for
// a survey is reached or the model is unavailable, so every respondent still
// gets a follow-up that fits their answer.

export function fixedFollowUp(answer: string, productName: string): string {
  const name = productName.trim() || 'it';
  if (answer === 'very') return `What would you miss most about ${name}?`;
  if (answer === 'somewhat') return `What would make ${name} a must-have for you?`;
  if (answer === 'not') return 'What is missing, or what would you use instead?';
  return `What would make you want to try ${name}?`;
}
