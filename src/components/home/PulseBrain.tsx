import { useEffect, useRef } from "react";

// The living brain at the top of the Project Memory band (Javier picked the
// "Neural brain" prototype, 2026-11-17). A brain drawn as a neural network:
// the six tools that feed Pulse send signals into it, impulses travel along
// the synapses, and the four memory lobes (decision, hypothesis, commitment,
// fact) light up in turn with the sample project's notes, the same ones the
// ledger below lists as text. Decorative, so hidden from screen readers.
//
// Cost: one canvas, no library. It only animates while on screen, caps the
// pixel ratio at 2, and draws one settled frame for reduced motion. Colours
// follow the site theme (the "dark" class on <html>) and redraw on toggle.

const TOOLS = ["ICP Builder", "Demo Studio", "PMF Lab", "MVP Builder", "GTM Strategist", "Traction Engine"];
const NOTES = [
  { kind: "Decision", text: "Sell to creators first" },
  { kind: "Hypothesis", text: "Creators pay $19 a month" },
  { kind: "Commitment", text: "Recruit 4 creators by Friday" },
  { kind: "Fact", text: "Two founders, part-time" },
];

type Palette = {
  mem: [string, string, string, string];
  teal: string;
  feed: string;
  tissue: [string, string];
  fold: string;
  edge: string;
  node: string;
  hot: (a: number) => string;
  tail: string;
  signal: string;
  tool: (glow: number) => string;
  card: string;
  cardText: string;
};

const DARK: Palette = {
  mem: ["#5b9bff", "#9a8cff", "#ff7f86", "#2fd88a"],
  teal: "#38d6c4",
  feed: "#c9fff7",
  tissue: ["rgba(91,155,255,0.16)", "rgba(154,140,255,0.03)"],
  fold: "rgba(160,180,255,0.07)",
  edge: "rgba(150,170,255,0.15)",
  node: "rgba(170,186,240,0.45)",
  hot: (a) => `rgba(220,232,255,${a})`,
  tail: "rgba(190,210,255,0.5)",
  signal: "#eaf1ff",
  tool: (g) => `rgba(214,222,245,${0.55 + g * 0.45})`,
  card: "rgba(10,16,32,0.84)",
  cardText: "#e9eefb",
};

const LIGHT: Palette = {
  mem: ["#2f6fe4", "#6d5ce6", "#e44b58", "#12a564"],
  teal: "#0f9c8c",
  feed: "#0b7f72",
  tissue: ["rgba(79,143,247,0.13)", "rgba(139,124,246,0.03)"],
  fold: "rgba(60,80,160,0.07)",
  edge: "rgba(60,80,160,0.15)",
  node: "rgba(60,80,150,0.42)",
  hot: (a) => `rgba(40,80,220,${a})`,
  tail: "rgba(50,90,220,0.45)",
  signal: "#2a55d8",
  tool: (g) => `rgba(40,50,80,${0.6 + g * 0.4})`,
  card: "rgba(255,255,255,0.94)",
  cardText: "#1a2238",
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (p: number) => 1 - Math.pow(1 - p, 3);
const alpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

type Node = { u: number; v: number; x: number; y: number; heat: number; adj: number[] };
type Signal = { a: number; b: number; p: number; v: number };
type Tool = { name: string; x: number; y: number; ax: number; glow: number };
type Feed = { tool: Tool; target: number; p: number };
type Lobe = { node: number; flash: number };
type Scene = {
  nodes: Node[];
  edges: [number, number][];
  lobes: Lobe[];
  tools: Tool[];
  path: Path2D;
  cx: number;
  cy: number;
  S: number;
  signals: Signal[];
  feeds: Feed[];
  spawn: number;
  feed: number;
};

// A side view of a brain as overlapping ellipses: cerebrum, temporal lobe,
// cerebellum and stem, in units of the brain's half width.
const SHAPES: [number, number, number, number][] = [
  [0, -0.05, 1, 0.68],
  [-0.1, 0.28, 0.62, 0.3],
  [0.64, 0.42, 0.3, 0.2],
  [0.38, 0.62, 0.1, 0.26],
];
const LOBES: [number, number][] = [[-0.62, -0.2], [0.28, -0.48], [-0.12, 0.36], [0.72, 0.02]];

function build(w: number, h: number): Scene {
  const narrow = w < 700;
  const S = Math.min(w * (narrow ? 0.4 : 0.3), h * 0.5);
  const cx = narrow ? w / 2 : w * 0.56;
  const cy = h * 0.47;
  const inside = (u: number, v: number) => SHAPES.some(([x, y, rx, ry]) => ((u - x) / rx) ** 2 + ((v - y) / ry) ** 2 <= 1);
  const nodes: Node[] = [];
  for (let k = 0; k < 9000 && nodes.length < 300; k++) {
    const u = rand(-1, 1);
    const v = rand(-0.75, 0.9);
    if (!inside(u, v) || nodes.some((n) => (n.u - u) ** 2 + (n.v - v) ** 2 < 0.07 ** 2)) continue;
    nodes.push({ u, v, x: cx + u * S, y: cy + v * S, heat: 0, adj: [] });
  }
  const edges: [number, number][] = [];
  nodes.forEach((n, i) => {
    nodes
      .map((m, j) => [j, (m.x - n.x) ** 2 + (m.y - n.y) ** 2] as const)
      .filter(([j]) => j !== i)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .forEach(([j]) => {
        if (n.adj.includes(j)) return;
        n.adj.push(j);
        nodes[j].adj.push(i);
        edges.push([i, j]);
      });
  });
  const nearest = (u: number, v: number) =>
    nodes.reduce((best, n, i) => ((n.u - u) ** 2 + (n.v - v) ** 2 < (nodes[best].u - u) ** 2 + (nodes[best].v - v) ** 2 ? i : best), 0);
  const tools: Tool[] = narrow ? [] : TOOLS.map((name, i) => ({ name, x: w * 0.05, y: cy - S * 0.55 + i * ((S * 1.25) / 5), ax: 0, glow: 0 }));
  const path = new Path2D();
  // Start each ellipse as its own subpath, or the path draws a straight line
  // from one ellipse to the next and leaves a wedge in the fill.
  SHAPES.forEach(([x, y, rx, ry]) => {
    path.moveTo(cx + x * S + rx * S, cy + y * S);
    path.ellipse(cx + x * S, cy + y * S, rx * S, ry * S, 0, 0, Math.PI * 2);
  });
  return {
    nodes, edges, tools, path, cx, cy, S,
    lobes: LOBES.map(([u, v]) => ({ node: nearest(u, v), flash: 0 })),
    signals: [], feeds: [], spawn: 0, feed: 0,
  };
}

function card(ctx: CanvasRenderingContext2D, P: Palette, x: number, y: number, kind: string, text: string, color: string, a: number, align: "left" | "right", width: number) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = "600 10.5px Inter, system-ui, sans-serif";
  const kw = ctx.measureText(kind.toUpperCase()).width + kind.length * 1.5;
  ctx.font = "500 13px Inter, system-ui, sans-serif";
  const tw = ctx.measureText(text).width;
  const bw = Math.max(kw, tw) + 24;
  const bh = 46;
  const bx = clamp(align === "left" ? x : x - bw, 8, width - bw - 8);
  ctx.fillStyle = P.card;
  ctx.strokeStyle = alpha(color, 0.55);
  ctx.lineWidth = 1;
  pill(ctx, bx, y - bh / 2, bw, bh, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "600 10.5px Inter, system-ui, sans-serif";
  const spaced = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ("letterSpacing" in spaced) spaced.letterSpacing = "1.5px";
  ctx.fillText(kind.toUpperCase(), bx + 12, y - 4);
  if ("letterSpacing" in spaced) spaced.letterSpacing = "0px";
  ctx.fillStyle = P.cardText;
  ctx.font = "500 13px Inter, system-ui, sans-serif";
  ctx.fillText(text, bx + 12, y + 14);
  ctx.restore();
}

function draw(ctx: CanvasRenderingContext2D, s: Scene, P: Palette, w: number, t: number, dt: number) {
  const { nodes } = s;
  const tissue = ctx.createRadialGradient(s.cx, s.cy, s.S * 0.1, s.cx, s.cy, s.S * 1.15);
  tissue.addColorStop(0, P.tissue[0]);
  tissue.addColorStop(1, P.tissue[1]);
  ctx.fillStyle = tissue;
  ctx.fill(s.path);

  // Folds of the cortex, clipped to the brain.
  ctx.save();
  ctx.clip(s.path);
  ctx.strokeStyle = P.fold;
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 11; k++) {
    ctx.beginPath();
    for (let u = -1; u <= 1.001; u += 0.02) {
      const x = s.cx + u * s.S;
      const y = s.cy + (-0.62 + k * 0.13) * s.S + Math.sin(u * 11 + k * 1.7 + t * 0.3) * s.S * 0.035;
      if (u === -1) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  ctx.lineWidth = 0.7;
  ctx.strokeStyle = P.edge;
  ctx.beginPath();
  s.edges.forEach(([a, b]) => {
    ctx.moveTo(nodes[a].x, nodes[a].y);
    ctx.lineTo(nodes[b].x, nodes[b].y);
  });
  ctx.stroke();

  s.spawn -= dt;
  if (s.spawn <= 0 && s.signals.length < 70) {
    s.spawn = 0.08;
    const a = (Math.random() * nodes.length) | 0;
    const b = nodes[a].adj[(Math.random() * nodes[a].adj.length) | 0];
    if (b !== undefined) s.signals.push({ a, b, p: 0, v: rand(1.4, 2.4) });
  }
  s.feed -= dt;
  if (s.feed <= 0 && s.tools.length) {
    s.feed = 0.7;
    const tool = s.tools[(Math.random() * s.tools.length) | 0];
    tool.glow = 1;
    const left = nodes.map((n, i) => [n, i] as const).filter(([n]) => n.u < -0.35);
    const target = left.length ? left[(Math.random() * left.length) | 0][1] : 0;
    s.feeds.push({ tool, target, p: 0 });
  }

  s.tools.forEach((tool) => {
    tool.glow = Math.max(0, tool.glow - dt * 1.2);
    ctx.font = "500 13px Inter, system-ui, sans-serif";
    ctx.fillStyle = P.tool(tool.glow);
    ctx.fillText(tool.name, tool.x, tool.y + 4);
    tool.ax = tool.x + ctx.measureText(tool.name).width + 10;
    ctx.fillStyle = alpha(P.teal, 0.4 + tool.glow * 0.6);
    ctx.beginPath();
    ctx.arc(tool.ax, tool.y, 3 + tool.glow * 2, 0, Math.PI * 2);
    ctx.fill();
  });

  s.feeds = s.feeds.filter((f) => {
    f.p += dt * 0.9;
    const n = nodes[f.target];
    const sx = f.tool.ax;
    const sy = f.tool.y;
    const mx = (sx + n.x) / 2;
    const my = sy - 30;
    const p = ease(Math.min(1, f.p));
    const x = (1 - p) ** 2 * sx + 2 * (1 - p) * p * mx + p * p * n.x;
    const y = (1 - p) ** 2 * sy + 2 * (1 - p) * p * my + p * p * n.y;
    ctx.strokeStyle = alpha(P.teal, 0.12);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(mx, my, n.x, n.y);
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = P.teal;
    ctx.shadowBlur = 12;
    ctx.fillStyle = P.feed;
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (f.p < 1) return true;
    for (let k = 0; k < 3 && n.adj.length; k++) s.signals.push({ a: f.target, b: n.adj[k % n.adj.length], p: 0, v: 2.2 });
    return false;
  });

  s.signals = s.signals.filter((sg) => {
    sg.p += dt * sg.v;
    const A = nodes[sg.a];
    const B = nodes[sg.b];
    const p = Math.min(1, sg.p);
    const q = Math.max(0, sg.p - 0.35);
    const x = A.x + (B.x - A.x) * p;
    const y = A.y + (B.y - A.y) * p;
    ctx.strokeStyle = P.tail;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(A.x + (B.x - A.x) * q, A.y + (B.y - A.y) * q);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = P.signal;
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
    if (sg.p < 1) return true;
    B.heat = 1;
    const lobe = s.lobes.find((l) => l.node === sg.b);
    if (lobe) lobe.flash = 1;
    if (Math.random() < 0.82 && B.adj.length) {
      sg.a = sg.b;
      sg.b = B.adj[(Math.random() * B.adj.length) | 0];
      sg.p = 0;
      return true;
    }
    return false;
  });

  nodes.forEach((n) => {
    n.heat = Math.max(0, n.heat - dt * 2);
    ctx.fillStyle = n.heat > 0.05 ? P.hot(0.5 + n.heat * 0.5) : P.node;
    ctx.beginPath();
    ctx.arc(n.x, n.y, 1.2 + n.heat * 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  // The four memory lobes; one takes the spotlight at a time so every note is read.
  const spot = Math.floor(t / 2.8) % 4;
  s.lobes.forEach((lobe, i) => {
    if (i === spot) lobe.flash = Math.max(lobe.flash, 0.9);
    lobe.flash = Math.max(0, lobe.flash - dt * 0.7);
    const n = nodes[lobe.node];
    const color = P.mem[i];
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 + i);
    const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 30 + lobe.flash * 26);
    halo.addColorStop(0, alpha(color, 0.55 * (0.4 + lobe.flash)));
    halo.addColorStop(1, alpha(color, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(n.x, n.y, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(n.x, n.y, 4.5 + pulse * 1.5 + lobe.flash * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const right = n.x > s.cx;
    card(ctx, P, n.x + (right ? 18 : -18), n.y, NOTES[i].kind, NOTES[i].text, color, Math.min(1, lobe.flash * 1.4), right ? "left" : "right", w);
  });
}

export default function PulseBrain() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    let palette = root.classList.contains("dark") ? DARK : LIGHT;
    let w = 0;
    let h = 0;
    let scene: Scene | null = null;
    let t = 0;
    let raf = 0;
    let last = 0;
    let visible = false;

    const step = (dt: number) => {
      if (!scene) return;
      t += dt;
      ctx.clearRect(0, 0, w, h);
      draw(ctx, scene, palette, w, t, dt);
    };
    const settle = () => { for (let i = 0; i < (reduce ? 420 : 150); i++) step(1 / 60); };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      if (!r.width) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scene = build(w, h);
      t = 0;
      settle();
    };
    const loop = (now: number) => {
      step(Math.min(0.05, (now - last) / 1000));
      last = now;
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      if (visible && !reduce && !document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    const sizer = new ResizeObserver(resize);
    sizer.observe(canvas);
    const watcher = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      start();
    });
    watcher.observe(canvas);
    // Follow the site's theme toggle.
    const theme = new MutationObserver(() => {
      const next = root.classList.contains("dark") ? DARK : LIGHT;
      if (next === palette) return;
      palette = next;
      if (!visible || reduce) { ctx.clearRect(0, 0, w, h); step(0); }
    });
    theme.observe(root, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("visibilitychange", start);

    return () => {
      cancelAnimationFrame(raf);
      sizer.disconnect();
      watcher.disconnect();
      theme.disconnect();
      document.removeEventListener("visibilitychange", start);
    };
  }, []);

  return <canvas ref={ref} className="hm-brain" aria-hidden="true" />;
}
