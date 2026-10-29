import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';

/**
 * Crawler content: what a visitor reads on each public page, captured from the
 * real render and served inside #seo-fallback (scripts/generate-prerendered-pages.mjs).
 *
 * AI crawlers (GPTBot, ClaudeBot, PerplexityBot) do not run JavaScript, so
 * without this they saw a menu and a one-line summary on most pages. Capturing
 * the render rather than hand-writing a copy keeps the two identical: this spec
 * fails when a page's text no longer matches scripts/crawler-content.json.
 *
 * After changing the copy on one of these pages, refresh the capture with
 *   npm run seo:crawler-content
 */
// Tool pages are not listed: signed-out visitors get a short sign-in screen,
// so their hand-written route config says more. /insighta and /careers load
// their lists from Supabase, which the dummy env cannot reach.
export const CRAWLER_CONTENT_ROUTES = [
  '/',
  '/about',
  '/build',
  '/enterprise',
  '/for-founders',
  '/for-investors',
  '/pricing',
  '/founder-id',
  '/faq',
  '/privacy-policy',
  '/data-privacy',
  '/terms',
  '/bizmap-ai',
  '/startup-guide',
  '/tech-stack',
];

const SNAPSHOT_FILE = path.join(process.cwd(), 'scripts', 'crawler-content.json');
const updating = !!process.env.UPDATE_CRAWLER_CONTENT;

async function captureCrawlerContent(page: Page, route: string) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#root')).not.toBeEmpty();
  // Below-the-fold sections mount as they near the viewport (LoadWhenNear), so
  // walk down the page until its height stops growing.
  let lastHeight = 0;
  for (let step = 0; step < 60; step += 1) {
    const height = await page.evaluate(() => {
      window.scrollBy(0, 700);
      return document.documentElement.scrollHeight;
    });
    await page.waitForTimeout(120);
    const atBottom = await page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2);
    if (atBottom && height === lastHeight) break;
    lastHeight = height;
  }
  await page.waitForTimeout(1200);

  return page.evaluate(async () => {
    type Block = { tag: string; html: string; text: string };
    const BLOCK_DISPLAYS = new Set(['block', 'flex', 'grid', 'list-item', 'table', 'table-row', 'table-cell', 'flow-root', 'table-caption']);
    // Never content: chrome, media, hidden nodes, charts (their captions say what
    // they show), and the product mockups on the homepage and /enterprise.
    const SKIP = 'nav, footer, script, style, noscript, template, svg, canvas, video, audio, iframe, img, picture, input, textarea, select, [aria-hidden="true"], [role="dialog"], [role="tooltip"], [data-crawler-skip], #seo-fallback, .ct-hero__spotlight, .ent-window, .chart-container';
    // Controls: their labels ("Monthly", "Open tool") are not content. A heading
    // still keeps the text of a button inside it (accordion questions).
    const CONTROLS = 'button, form, [role="tab"], [role="tablist"]';
    const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const squash = (value: string) => value.replace(/\s+/g, ' ').replace(/(\d) %/g, '$1%').trim();
    const words = (text: string) => (text ? text.split(' ').length : 0);
    const isNumber = (text: string) => /^[~<>≈+▲▼$€£-]?\s?\d[\d.,]*\s?(%|x|k|m|b|mo|\+)?$/i.test(text) || /^\d+ in \d+$/.test(text) || text === '%';
    const isHidden = (el: Element) => {
      const style = getComputedStyle(el);
      return style.display === 'none' || style.visibility === 'hidden';
    };
    const skipped = (el: Element) => el.matches(SKIP) || isHidden(el) || (el.tagName === 'HEADER' && !!el.querySelector('nav'));
    const isBlock = (el: Element) => BLOCK_DISPLAYS.has(getComputedStyle(el).display);

    // Inline HTML for one block: text, internal links and bold survive; an
    // icon that carries an aria-label (pricing ticks and crosses) becomes text.
    const inline = (el: Element): string => {
      let out = '';
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          out += escapeText(node.textContent ?? '');
        } else if (node instanceof Element) {
          if (node.tagName.toLowerCase() === 'svg') {
            const label = node.getAttribute('aria-label');
            if (label && node.getAttribute('aria-hidden') !== 'true') out += ` ${escapeText(label)} `;
            continue;
          }
          if (skipped(node)) continue;
          if (node.tagName === 'BR') { out += ' '; continue; }
          const inner = inline(node);
          const spaced = getComputedStyle(node).display !== 'inline';
          let piece = inner;
          if (node.tagName === 'A') {
            const href = node.getAttribute('href') ?? '';
            if (((href.startsWith('/') && !href.startsWith('//')) || href.startsWith('mailto:')) && squash(inner)) piece = `<a href="${href.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">${squash(inner)}</a>`;
          } else if ((node.tagName === 'STRONG' || node.tagName === 'B') && squash(inner)) {
            piece = `<strong>${squash(inner)}</strong>`;
          }
          out += spaced ? ` ${piece} ` : piece;
        }
      }
      return out;
    };
    const textOf = (html: string) => squash(html.replace(/<[^>]+>/g, ''));
    const hasBlockChild = (el: Element): boolean => [...el.children].some((child) => !skipped(child) && (isBlock(child) || hasBlockChild(child)));

    const table = (el: Element): Block | null => {
      const rows = [...el.querySelectorAll('tr')].filter((row) => !skipped(row)).map((row) => {
        const cells = [...row.children].filter((cell) => !skipped(cell)).map((cell) => {
          const tag = cell.tagName === 'TH' ? 'th' : 'td';
          const span = (cell as HTMLTableCellElement).colSpan > 1 ? ` colspan="${(cell as HTMLTableCellElement).colSpan}"` : '';
          return `<${tag}${span}>${squash(inline(cell))}</${tag}>`;
        });
        return `<tr>${cells.join('')}</tr>`;
      });
      const html = rows.join('');
      const text = textOf(html);
      return text ? { tag: 'table', html, text } : null;
    };

    // Radix accordions unmount closed answers, so open each in turn and keep
    // what it shows. Answers are emitted right after their question.
    const answers = new Map<Element, Block[]>();
    const walk = (el: Element, out: Block[]) => {
      if (skipped(el) || el.matches(CONTROLS)) return;
      if (el.tagName === 'TABLE') {
        const block = table(el);
        if (block) out.push(block);
        return;
      }
      const heading = /^H[1-6]$/.test(el.tagName);
      if (heading || !hasBlockChild(el)) {
        const html = squash(inline(el));
        const text = textOf(html);
        if (text) {
          const tag = heading ? el.tagName.toLowerCase() : el.tagName === 'LI' ? 'li' : 'p';
          out.push({ tag, html, text });
        }
        const trigger = heading ? el.querySelector('button[aria-controls]') : null;
        if (trigger && answers.has(trigger)) out.push(...answers.get(trigger)!);
        return;
      }
      const inner: Block[] = [];
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = squash(node.textContent ?? '');
          if (text) inner.push({ tag: 'p', html: escapeText(text), text });
        } else if (node instanceof Element) {
          walk(node, inner);
        }
      }
      // A stat card ("20" "%" "of new startups charge..." "Stripe, 2025") is one
      // statement; split up, the number loses its meaning.
      const total = inner.reduce((sum, block) => sum + words(block.text), 0);
      const statCard = inner.length > 1 && total <= 30 && inner.every((block) => block.tag === 'p')
        && inner.some((block) => isNumber(block.text)) && inner.some((block) => words(block.text) >= 4);
      if (statCard) {
        const html = squash(inner.map((block) => block.html).join(' '));
        out.push({ tag: 'p', html, text: textOf(html) });
      } else {
        out.push(...inner);
      }
    };

    const root = document.querySelector('#root main') ?? document.getElementById('root')!;
    const triggers = [...root.querySelectorAll(':is(h2, h3, h4)[data-orientation] > button[aria-controls]')];
    for (const trigger of triggers) {
      if (trigger.getAttribute('aria-expanded') !== 'true') (trigger as HTMLElement).click();
      await new Promise((resolve) => setTimeout(resolve, 150));
      const region = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
      const blocks: Block[] = [];
      if (region) for (const child of region.children) walk(child, blocks);
      answers.set(trigger, blocks);
    }

    const collected: Block[] = [];
    walk(root, collected);
    // Short leftovers are UI labels ("Monthly", "Read", stepper digits), not
    // content. Headings, links, email addresses and figures ("$9 /month") stay.
    const blocks = collected.filter((block) => block.tag !== 'p' || block.html.includes('<a ') || block.text.includes('@')
      || (words(block.text) > 3 ? true : /[\d$€£]/.test(block.text) && !/^\d{1,2}$/.test(block.text)));

    // Marquees and responsive duplicates repeat text; keep the first.
    const seen = new Set<string>();
    const unique = blocks.filter((block) => (seen.has(block.text) ? false : (seen.add(block.text), true)));
    const lines: string[] = [];
    for (let index = 0; index < unique.length; index += 1) {
      const block = unique[index];
      if (block.tag === 'li') {
        if (unique[index - 1]?.tag !== 'li') lines.push('<ul>');
        lines.push(`  <li>${block.html}</li>`);
        if (unique[index + 1]?.tag !== 'li') lines.push('</ul>');
      } else {
        lines.push(`<${block.tag}>${block.html}</${block.tag}>`);
      }
    }
    return lines.join('\n');
  });
}

function readSnapshot(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
  } catch {
    return {};
  }
}

for (const route of CRAWLER_CONTENT_ROUTES) {
  test(`crawler content matches the rendered page: ${route}`, async ({ page }) => {
    test.setTimeout(90_000);
    const html = await captureCrawlerContent(page, route);
    expect(html.length, `${route} captured no text`).toBeGreaterThan(200);
    if (updating) {
      const snapshot = readSnapshot();
      snapshot[route] = html;
      const ordered = Object.fromEntries(CRAWLER_CONTENT_ROUTES.filter((key) => key in snapshot).map((key) => [key, snapshot[key]]));
      fs.writeFileSync(SNAPSHOT_FILE, `${JSON.stringify(ordered, null, 2)}\n`);
      return;
    }
    expect(html, `${route} copy changed; run npm run seo:crawler-content`).toBe(readSnapshot()[route]);
  });
}
