import type { IcpScoreCard } from "./icpScoreCard";
import { ICP_TEST_YOURS_URL } from "./icpScoreCard.ts";

/** Wrap without dropping words, including long URLs and explicit line breaks. */
export function wrapScoreCardText(text: string, measure: (value: string) => number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= width) { line = candidate; continue; }
      if (line) lines.push(line);
      line = "";
      for (const character of Array.from(word)) {
        if (line && measure(line + character) > width) { lines.push(line); line = ""; }
        line += character;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Export only the frozen, public score snapshot. No gated draft or network call. */
export async function downloadIcpScoreCardPng(card: IcpScoreCard): Promise<void> {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image export is unavailable in this browser.");
  const width = 1200;
  const padding = 64;
  const textWidth = width - padding * 2;
  context.font = "28px Arial, sans-serif";
  const ideaLines = wrapScoreCardText(card.idea || "Original idea not recorded", value => context.measureText(value).width, textWidth - 290);
  const sections = [
    { label: "LIKELY CUSTOMER", text: [card.personaName, card.roleLine].filter(Boolean).join(" — ") },
    { label: "RECOMMENDATION", text: card.headline },
    { label: "TOP RISK", text: card.topRisk },
  ].filter(section => section.text).map(section => ({ ...section,
    lines: wrapScoreCardText(section.text!, value => context.measureText(value).width, textWidth),
  }));
  const ideaHeight = Math.max(210, ideaLines.length * 40 + 64);
  canvas.width = width;
  canvas.height = 432 + ideaHeight + sections.reduce((height, section) => height + 74 + section.lines.length * 40, 0);

  context.fillStyle = "#13171b";
  context.fillRect(0, 0, width, canvas.height);
  context.strokeStyle = "#2ab4c4";
  context.lineWidth = 2;
  context.strokeRect(24, 24, width - 48, canvas.height - 48);
  const text = (value: string, x: number, y: number, size = 28, color = "#e5e7eb", bold = false) => {
    context.fillStyle = color;
    context.font = `${bold ? "bold " : ""}${size}px Arial, sans-serif`;
    context.fillText(value, x, y);
  };
  text("IDEA SCORE", padding, 90, 24, "#2ab4c4", true);
  text("YOUR IDEA", padding, 152, 20, "#9ca3af", true);
  ideaLines.forEach((line, index) => text(line, padding, 200 + index * 40));
  text(`${card.displayScore}`, width - padding - 240, 244, 100, "#2ab4c4", true);
  const scoreWidth = context.measureText(String(card.displayScore)).width;
  text("/100", width - padding - 240 + scoreWidth + 8, 244, 32, "#9ca3af");
  let y = 170 + ideaHeight;
  text(card.verdictLabel.toUpperCase(), padding, y, 24, "#2ab4c4", true);
  y += 42;
  // Keep the uncertainty attached to the assessment, even in the image.
  const note = card.openQuestionCount != null
    ? `AI assessment · ${card.openQuestionCount} open questions · Validate these assumptions`
    : "AI assessment · Validate these assumptions with real customers";
  text(note, padding, y, 22, "#9ca3af");
  y += 62;
  for (const section of sections) {
    text(section.label, padding, y, 20, "#9ca3af", true);
    y += 42;
    section.lines.forEach(line => { text(line, padding, y); y += 40; });
    y += 32;
  }
  context.strokeStyle = "#30363d";
  context.beginPath(); context.moveTo(padding, y); context.lineTo(width - padding, y); context.stroke();
  text("Creatives Takeover · @Creatives_Rule", padding, y + 52, 24, "#e5e7eb", true);
  text(`Test yours: ${ICP_TEST_YOURS_URL}`, padding, y + 96, 24, "#2ab4c4");

  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => {
    if (value) resolve(value); else reject(new Error("Could not create the score image."));
  }, "image/png"));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `idea-score-${card.displayScore}-creatives-takeover.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
