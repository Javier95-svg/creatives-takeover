import type { IcpDraftDocument } from "@/lib/icpBuilderSession";

// Brand assets for export watermarking. Same trifoil logo used across the app.
const LOGO_URL = "/lovable-uploads/04a4b9d0-4213-4186-ba00-c7acd22bad98.png";
const BRAND_NAME = "Creatives Takeover";
const BRAND_TEAL = "0F5B64";

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function fetchAsArrayBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Render the draft DOM to a multi-page A4 PDF and stamp the Creatives Takeover
 * logo + name into the bottom-right corner of EVERY page, so the brand travels
 * with the document wherever it's shared. The on-screen DOM watermark is hidden
 * during capture (via the data-icp-watermark attribute) to avoid doubling up.
 */
export async function downloadIcpDraftPdf(target: HTMLElement, fileName: string) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const canvas = await html2canvas(target, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    onclone: (clonedDoc) => {
      clonedDoc
        .querySelectorAll<HTMLElement>("[data-icp-watermark]")
        .forEach((node) => {
          node.style.display = "none";
        });
    },
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * pageWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  // Stamp the brand watermark on every page.
  const logoDataUrl = await fetchAsDataUrl(LOGO_URL);
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    if (logoDataUrl) {
      try {
        pdf.addImage(logoDataUrl, "PNG", pageWidth - 24, pageHeight - 22, 13, 13);
      } catch {
        // Non-fatal: keep the text brand even if the image fails.
      }
    }
    pdf.setFontSize(7);
    pdf.setTextColor(110, 110, 120);
    pdf.text(BRAND_NAME, pageWidth - 17.5, pageHeight - 6, { align: "center" });
  }

  pdf.save(fileName);
}

/**
 * Build a fully-formatted, branded Word (.docx) version of the ICP Draft from
 * the structured draft data — a real document, not a screenshot. The logo
 * appears as a letterhead in the header and the brand name in the footer on
 * every page, so the deliverable is unmistakably Creatives Takeover.
 */
export async function downloadIcpDraftDocx(draft: IcpDraftDocument, fileName: string) {
  const {
    Document,
    Packer,
    Paragraph,
    HeadingLevel,
    AlignmentType,
    TextRun,
    ImageRun,
    Header,
    Footer,
  } = await import("docx");

  const logoBuffer = await fetchAsArrayBuffer(LOGO_URL);

  const heading = (text: string) =>
    new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 160 } });
  const subheading = (text: string) =>
    new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } });
  const body = (text: string) =>
    new Paragraph({ children: [new TextRun(text)], spacing: { after: 160 } });
  const bullet = (text: string) =>
    new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 80 } });
  const labelled = (label: string, value: string) =>
    new Paragraph({
      children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value)],
      spacing: { after: 120 },
    });

  const children: InstanceType<typeof Paragraph>[] = [];

  // Title block
  children.push(
    new Paragraph({
      text: draft.customer.personaName,
      heading: HeadingLevel.TITLE,
      spacing: { after: 60 },
    }),
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: draft.customer.roleLine, italics: true, color: "555555" })],
      spacing: { after: draft.customer.metaLine ? 40 : 200 },
    }),
  );
  if (draft.customer.metaLine) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: draft.customer.metaLine, color: "777777" })],
        spacing: { after: 200 },
      }),
    );
  }

  // 1. Ideal Customer
  children.push(heading("Ideal Customer"));
  if (draft.customer.summary) children.push(body(draft.customer.summary));
  if (draft.customer.behaviors.length) {
    children.push(subheading("Behavior signals"));
    draft.customer.behaviors.forEach((item) => children.push(bullet(item)));
  }
  if (draft.customer.whereToFind.length) {
    children.push(subheading("Where to find them"));
    draft.customer.whereToFind.forEach((item) => children.push(bullet(item)));
  }
  if (draft.customer.motivations.length) {
    children.push(subheading("Motivations"));
    draft.customer.motivations.forEach((item) => children.push(bullet(item)));
  }
  if (draft.customer.triggerContext) children.push(labelled("Trigger context", draft.customer.triggerContext));
  if (draft.customer.actionTrigger) children.push(labelled("Why they act now", draft.customer.actionTrigger));

  // 2. Core Pain Point
  children.push(heading("Core Pain Point"));
  if (draft.pain.quote) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `“${draft.pain.quote}”`, italics: true })],
        spacing: { after: 160 },
      }),
    );
  }
  if (draft.pain.rootCause) children.push(labelled("Root cause", draft.pain.rootCause));
  if (draft.pain.whyItHurts) children.push(labelled("Why it hurts", draft.pain.whyItHurts));
  if (draft.pain.triggerMoment) children.push(labelled("Trigger moment", draft.pain.triggerMoment));
  if (draft.pain.costOfInaction) children.push(labelled("Cost of inaction", draft.pain.costOfInaction));

  // 3. What You Are Building
  children.push(heading("What You Are Building"));
  if (draft.build.valueProposition) children.push(body(draft.build.valueProposition));
  if (draft.build.replaces.length) {
    children.push(subheading("Replaces"));
    draft.build.replaces.forEach((item) => children.push(bullet(item)));
  }
  if (draft.build.coreFeatures.length) {
    children.push(subheading("Core features"));
    draft.build.coreFeatures.forEach((feature) =>
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${feature.title}: `, bold: true }),
            new TextRun(feature.description),
          ],
          bullet: { level: 0 },
          spacing: { after: 80 },
        }),
      ),
    );
  }
  if (draft.build.outcome) children.push(labelled("Outcome", draft.build.outcome));

  // 4. Moat & Competition
  children.push(heading("Moat & Competition"));
  if (draft.moat.moatType) children.push(labelled("Moat type", draft.moat.moatType));
  if (draft.moat.edge) children.push(labelled("Edge", draft.moat.edge));
  if (draft.moat.edgeSource) children.push(labelled("Source of advantage", draft.moat.edgeSource));
  if (draft.moat.whyHardToCopy) children.push(labelled("Why it is hard to copy", draft.moat.whyHardToCopy));
  if (draft.moat.incumbentGap) children.push(labelled("Why incumbents miss it", draft.moat.incumbentGap));
  if (draft.competition.summary) {
    children.push(subheading("Competitive landscape"));
    children.push(body(draft.competition.summary));
  }
  draft.competition.directCompetitors.forEach((competitor) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: competitor.name, bold: true })],
        spacing: { before: 100, after: 40 },
      }),
    );
    if (competitor.doesWell) children.push(labelled("What they do well", competitor.doesWell));
    if (competitor.gap) children.push(labelled("Gap", competitor.gap));
  });
  if (draft.competition.exploitableGap) children.push(labelled("Exploitable gap", draft.competition.exploitableGap));

  // 5. Confidence
  if (draft.confidence?.summary || draft.confidence?.missingSignals?.length) {
    children.push(heading("Confidence"));
    if (draft.confidence.level) children.push(labelled("Confidence level", draft.confidence.level));
    if (draft.confidence.summary) children.push(body(draft.confidence.summary));
    if (draft.confidence.missingSignals?.length) {
      children.push(subheading("Signals still to gather"));
      draft.confidence.missingSignals.forEach((item) => children.push(bullet(item)));
    }
  }

  // 6. Next Actions
  if (draft.nextActions?.length) {
    children.push(heading("Next Actions"));
    draft.nextActions.forEach((action) =>
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${action.title}: `, bold: true }),
            new TextRun(action.description),
          ],
          bullet: { level: 0 },
          spacing: { after: 80 },
        }),
      ),
    );
  }

  const headerLogoRun = logoBuffer
    ? [new ImageRun({ type: "png", data: logoBuffer, transformation: { width: 22, height: 22 } })]
    : [];

  const header = new Header({
    children: [
      new Paragraph({
        children: [
          ...headerLogoRun,
          new TextRun({ text: "  Creatives Takeover", bold: true, color: BRAND_TEAL, size: 18 }),
          new TextRun({ text: "  ·  ICP Draft", color: "999999", size: 16 }),
        ],
        spacing: { after: 80 },
      }),
    ],
  });

  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Built with ", color: "999999", size: 14 }),
          new TextRun({ text: BRAND_NAME, bold: true, color: BRAND_TEAL, size: 14 }),
          new TextRun({ text: " — the platform for first-time founders", color: "999999", size: 14 }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        headers: { default: header },
        footers: { default: footer },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, fileName);
}
