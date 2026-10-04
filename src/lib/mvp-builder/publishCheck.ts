// The check MVP Builder runs before publishing, in the browser, with no test
// worker. It reads the built files and the preview's runtime state. Only a
// runtime error blocks (the founder can still publish anyway, knowingly); the
// rest says what a visitor will and will not be able to do.

export interface PublishCheckItem {
  id: 'loads' | 'form' | 'cta' | 'title';
  ok: boolean;
  label: string;
  hint?: string;
  blocking: boolean;
}

export interface PublishCheckInput {
  files: Array<{ path: string; content: string }>;
  runtimeError: string | null;
  previewErrors: string[];
  framework: string | null;
}

const isMarkup = (path: string) => /\.(html?|jsx|tsx|js|ts|vue|svelte)$/i.test(path);

export function hasLeadForm(files: PublishCheckInput['files']): boolean {
  return files.some((file) => isMarkup(file.path) && (/data-ct-lead/.test(file.content) || /ctLead\s*\??\.?\s*\(/.test(file.content)));
}

function hasRealCallToAction(files: PublishCheckInput['files']): boolean {
  return files.some((file) => {
    if (!isMarkup(file.path)) return false;
    // A link that goes somewhere, or a button inside a form that saves.
    const links = file.content.match(/<a\b[^>]*href=["']([^"'#][^"']*)["']/gi) ?? [];
    return links.length > 0 || /data-ct-lead/.test(file.content);
  });
}

function hasTitle(files: PublishCheckInput['files']): boolean {
  return files.some((file) => /\.html?$/i.test(file.path) && /<title>\s*[^<\s][^<]*<\/title>/i.test(file.content));
}

export function runPublishCheck(input: PublishCheckInput): { items: PublishCheckItem[]; blocked: boolean } {
  // Static previews report missing entries as errors; Vite apps run in a
  // WebContainer, so only their runtime error counts.
  const previewErrors = input.framework === 'react-vite' ? [] : input.previewErrors;
  const loads = !input.runtimeError && previewErrors.length === 0;
  const form = hasLeadForm(input.files);
  const items: PublishCheckItem[] = [
    {
      id: 'loads',
      ok: loads,
      label: loads ? 'Loads without errors' : 'The preview shows an error',
      hint: loads ? undefined : (input.runtimeError ?? previewErrors[0] ?? undefined),
      blocking: true,
    },
    {
      id: 'form',
      ok: form,
      label: form ? 'A form saves signups to your Leads tab' : 'No form saves signups yet',
      hint: form ? undefined : 'Ask in the chat: "Add an email signup form". Without one, visitors can look but not leave their details.',
      blocking: false,
    },
    {
      id: 'cta',
      ok: hasRealCallToAction(input.files),
      label: hasRealCallToAction(input.files) ? 'The main button leads somewhere' : 'No button leads anywhere yet',
      hint: 'Every page should give visitors one clear next step.',
      blocking: false,
    },
    {
      id: 'title',
      ok: input.framework === 'react-vite' || hasTitle(input.files),
      label: 'Has a page title for search and sharing',
      blocking: false,
    },
  ];
  return { items, blocked: items.some((item) => item.blocking && !item.ok) };
}
