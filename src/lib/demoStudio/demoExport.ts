// Client-side MP4/GIF export of a Demo Studio walkthrough. Each step's screenshot
// is redrawn onto a canvas (matching DemoPlayer: image "contain" on black, caption
// card, optional watermark) and encoded in sequence.
//
// Video: real MP4 via WebCodecs VideoEncoder + mp4-muxer where available, with a
// MediaRecorder WebM fallback. GIF: gifenc. The heavy encoders are imported
// dynamically so they stay out of the main bundle.

export interface ExportStep {
  asset_url: string | null;
  title: string | null;
  caption: string | null;
}

export interface DemoExportOptions {
  showWatermark: boolean;
  primaryColor?: string;
  /** How long each step is held, in milliseconds. */
  perStepMs?: number;
}

const VIDEO_W = 1280;
const VIDEO_H = 720;
const GIF_W = 640;
const GIF_H = 360;
const DEFAULT_PER_STEP_MS = 2500;
const VIDEO_FPS = 15;
const WATERMARK_TEXT = 'Made with Creatives Takeover';

export function isExportSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  if (!canvas.getContext('2d')) return false;
  return typeof MediaRecorder !== 'undefined' || typeof (globalThis as { VideoEncoder?: unknown }).VideoEncoder !== 'undefined';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadImage(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2);
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.length) {
    // Ellipsize the last line if we ran out of room.
    let last = lines[maxLines - 1];
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

function drawStepFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  img: HTMLImageElement | null,
  step: ExportStep,
  opts: DemoExportOptions,
  progress: number,
): void {
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width, height);

  if (img && img.width && img.height) {
    const scale = Math.min(width / img.width, height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
  } else {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '500 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No image for this step', width / 2, height / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // Top progress accent (mirrors the player's progress bar).
  if (opts.primaryColor) {
    ctx.fillStyle = opts.primaryColor;
    ctx.fillRect(0, 0, Math.max(0, Math.min(1, progress)) * width, 6);
  }

  const scaleText = width / VIDEO_W;
  const title = (step.title ?? '').trim();
  const caption = (step.caption ?? '').trim();
  if (title || caption) {
    const pad = 20 * scaleText;
    const cardW = Math.min(720 * scaleText, width - 48 * scaleText);
    const titleFont = `600 ${Math.round(22 * scaleText)}px system-ui, sans-serif`;
    const capFont = `400 ${Math.round(18 * scaleText)}px system-ui, sans-serif`;
    const lineH = 26 * scaleText;
    const capLineH = 24 * scaleText;

    ctx.font = titleFont;
    const titleLines = title ? wrapText(ctx, title, cardW - pad * 2, 2) : [];
    ctx.font = capFont;
    const capLines = caption ? wrapText(ctx, caption, cardW - pad * 2, 3) : [];

    const gap = titleLines.length && capLines.length ? 8 * scaleText : 0;
    const cardH = titleLines.length * lineH + gap + capLines.length * capLineH + pad * 2;
    const cardX = 24 * scaleText;
    const cardY = height - 24 * scaleText - cardH;

    ctx.fillStyle = 'rgba(2,6,23,0.85)';
    roundRect(ctx, cardX, cardY, cardW, cardH, 12 * scaleText);
    ctx.fill();

    let ty = cardY + pad;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.font = titleFont;
    titleLines.forEach((l) => {
      ctx.fillText(l, cardX + pad, ty);
      ty += lineH;
    });
    ty += gap;
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = capFont;
    capLines.forEach((l) => {
      ctx.fillText(l, cardX + pad, ty);
      ty += capLineH;
    });
    ctx.textBaseline = 'alphabetic';
  }

  if (opts.showWatermark) {
    ctx.font = `500 ${Math.round(16 * scaleText)}px system-ui, sans-serif`;
    const tw = ctx.measureText(WATERMARK_TEXT).width;
    const padX = 12 * scaleText;
    const wmW = tw + padX * 2;
    const wmH = 30 * scaleText;
    const wmX = width - 16 * scaleText - wmW;
    const wmY = height - 16 * scaleText - wmH;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, wmX, wmY, wmW, wmH, wmH / 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textBaseline = 'middle';
    ctx.fillText(WATERMARK_TEXT, wmX + padX, wmY + wmH / 2);
    ctx.textBaseline = 'alphabetic';
  }
}

function createCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available in this browser.');
  return { canvas, ctx };
}

async function exportViaWebCodecs(
  steps: ExportStep[],
  images: (HTMLImageElement | null)[],
  opts: DemoExportOptions,
  perStepMs: number,
): Promise<Blob> {
  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
  const { canvas, ctx } = createCanvas(VIDEO_W, VIDEO_H);

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: VIDEO_W, height: VIDEO_H },
    fastStart: 'in-memory',
  });

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error('Demo export VideoEncoder error:', e),
  });
  encoder.configure({
    codec: 'avc1.42001f',
    width: VIDEO_W,
    height: VIDEO_H,
    bitrate: 4_000_000,
    framerate: VIDEO_FPS,
    avc: { format: 'avc' },
  } as VideoEncoderConfig);

  const frameDurUs = Math.round(1_000_000 / VIDEO_FPS);
  const framesPerStep = Math.max(1, Math.round((VIDEO_FPS * perStepMs) / 1000));
  let timestamp = 0;

  for (let i = 0; i < steps.length; i += 1) {
    drawStepFrame(ctx, VIDEO_W, VIDEO_H, images[i], steps[i], opts, (i + 1) / steps.length);
    for (let f = 0; f < framesPerStep; f += 1) {
      const frame = new VideoFrame(canvas, { timestamp, duration: frameDurUs });
      encoder.encode(frame, { keyFrame: f === 0 });
      frame.close();
      timestamp += frameDurUs;
    }
  }

  await encoder.flush();
  encoder.close();
  muxer.finalize();
  return new Blob([muxer.target.buffer], { type: 'video/mp4' });
}

async function exportViaMediaRecorder(
  steps: ExportStep[],
  images: (HTMLImageElement | null)[],
  opts: DemoExportOptions,
  perStepMs: number,
): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  const { canvas, ctx } = createCanvas(VIDEO_W, VIDEO_H);
  const mimeType =
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4')
      ? 'video/mp4'
      : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
  const ext: 'mp4' | 'webm' = mimeType.includes('mp4') ? 'mp4' : 'webm';

  const stream = canvas.captureStream(30);
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  // Draw the first frame before recording starts so there is content immediately.
  drawStepFrame(ctx, VIDEO_W, VIDEO_H, images[0], steps[0], opts, 1 / steps.length);

  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
    recorder.start();
    void (async () => {
      await sleep(perStepMs);
      for (let i = 1; i < steps.length; i += 1) {
        drawStepFrame(ctx, VIDEO_W, VIDEO_H, images[i], steps[i], opts, (i + 1) / steps.length);
        await sleep(perStepMs);
      }
      recorder.stop();
      stream.getTracks().forEach((t) => t.stop());
    })();
  });

  return { blob: new Blob(chunks, { type: mimeType }), ext };
}

export async function exportDemoVideo(
  steps: ExportStep[],
  opts: DemoExportOptions,
): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  if (steps.length === 0) throw new Error('Nothing to export — add a step first.');
  const perStepMs = opts.perStepMs ?? DEFAULT_PER_STEP_MS;
  const images = await Promise.all(steps.map((s) => loadImage(s.asset_url)));

  const hasWebCodecs =
    typeof (globalThis as { VideoEncoder?: unknown }).VideoEncoder !== 'undefined' &&
    typeof (globalThis as { VideoFrame?: unknown }).VideoFrame !== 'undefined';

  if (hasWebCodecs) {
    try {
      const blob = await exportViaWebCodecs(steps, images, opts, perStepMs);
      return { blob, ext: 'mp4' };
    } catch (e) {
      console.warn('WebCodecs MP4 export failed, falling back to MediaRecorder:', e);
    }
  }
  return exportViaMediaRecorder(steps, images, opts, perStepMs);
}

export async function exportDemoGif(steps: ExportStep[], opts: DemoExportOptions): Promise<Blob> {
  if (steps.length === 0) throw new Error('Nothing to export — add a step first.');
  const perStepMs = opts.perStepMs ?? DEFAULT_PER_STEP_MS;
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
  const images = await Promise.all(steps.map((s) => loadImage(s.asset_url)));
  const { canvas, ctx } = createCanvas(GIF_W, GIF_H);

  const encoder = GIFEncoder();
  for (let i = 0; i < steps.length; i += 1) {
    drawStepFrame(ctx, GIF_W, GIF_H, images[i], steps[i], opts, (i + 1) / steps.length);
    const { data } = ctx.getImageData(0, 0, GIF_W, GIF_H);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    encoder.writeFrame(index, GIF_W, GIF_H, { palette, delay: perStepMs });
  }
  encoder.finish();
  return new Blob([encoder.bytes()], { type: 'image/gif' });
}

/** Trigger a browser download for an exported blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
