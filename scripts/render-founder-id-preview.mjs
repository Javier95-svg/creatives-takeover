import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import React from 'react';
import { ImageResponse } from '@vercel/og';
import { chromium } from '@playwright/test';

const result = await build({ entryPoints: ['api/_founder-id-card.tsx'], bundle: true, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic', write: false });
const mod = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const avatar = 'data:image/jpeg;base64,' + (await readFile('src/assets/team-javier-pena-profile.jpg')).toString('base64');
const response = new ImageResponse(React.createElement(mod.exports.FounderIdCard, {
  name: 'Javier Alonso', username: 'javier', tagline: 'Think. Test. Ship.',
  avatarUrl: avatar, stage: 'Traction', founderNumber: 24681,
}), { width: 1200, height: 630 });
const card = Buffer.from(await response.arrayBuffer());
await mkdir('docs/design/previews', { recursive: true });
await writeFile('docs/design/previews/founder-id-card-proposal.png', card);
const html = `<!doctype html><html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#e9edf3;font-family:Arial,sans-serif;color:#152031;padding:44px}.label{max-width:860px;margin:0 auto 18px;font-size:13px;letter-spacing:2px;color:#617088}.composer{max-width:860px;margin:auto;background:white;border:1px solid #d9dfe8;border-radius:22px;padding:30px 34px;box-shadow:0 18px 55px #24304b12}.top{display:flex;gap:14px;align-items:center}.avatar{width:46px;height:46px;border-radius:50%}.name{font-weight:700;font-size:16px}.handle{color:#738094;margin-top:4px;font-size:14px}.text{margin:24px 0 10px;font-size:23px;line-height:1.5}.link{color:#2884d5;font-size:20px;margin-bottom:24px}.card{border:1px solid #d7dfe9;border-radius:16px;overflow:hidden}.card img{display:block;width:100%}.meta{padding:13px 17px;font-size:14px;background:#fafbfd}.meta div{margin-bottom:5px;color:#758094}.note{max-width:860px;margin:18px auto 0;font-size:13px;color:#617088}</style><div class="label">FOUNDER ID · LUXURY CARD PREVIEW</div><div class="composer"><div class="top"><img class="avatar" src="${avatar}"><div><div class="name">Javier Alonso</div><div class="handle">@JavierForge</div></div></div><div class="text">Follow my journey building Creatives Takeover.</div><div class="link">creatives-takeover.com/@javier</div><div class="card"><img src="data:image/png;base64,${card.toString('base64')}"><div class="meta"><div>creatives-takeover.com</div>Javier Alonso | Founder ID</div></div></div><div class="note">Illustrative X sharing preview. 024 681 is a sample; real account numbers are assigned by the database.</div></html>`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 840 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: 'docs/design/previews/founder-id-x-preview.png', fullPage: true });
} finally {
  await browser.close();
}
console.log('Rendered Founder ID card and sharing screenshot. Sample number: 024 681.');
