import React from 'react';

export const VCWallpaper: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:5.5rem_5.5rem] opacity-40" />
      <div className="absolute inset-x-0 top-24 h-px bg-gradient-to-r from-transparent via-sky-500/30 to-transparent" />
      <div className="absolute inset-x-0 top-44 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />

      <div className="absolute left-[8%] top-24 hidden w-72 rotate-[-8deg] rounded-3xl border border-sky-500/20 bg-background/70 p-5 shadow-[0_24px_80px_rgba(14,116,144,0.12)] backdrop-blur xl:block">
        <p className="text-label uppercase tracking-[0.35em] text-sky-600/75">Deal Memo</p>
        <div className="mt-4 space-y-3">
          <div className="h-2.5 w-24 rounded-full bg-sky-500/30" />
          <div className="h-2 w-full rounded-full bg-border/70" />
          <div className="h-2 w-5/6 rounded-full bg-border/60" />
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-center text-label font-medium text-sky-700">Seed</div>
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-center text-label font-medium text-violet-700">SaaS</div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-center text-label font-medium text-emerald-700">EU</div>
          </div>
        </div>
      </div>

      <div className="absolute right-[9%] top-32 hidden w-80 rotate-[7deg] rounded-[2rem] border border-cyan-500/20 bg-background/75 p-5 shadow-[0_30px_90px_rgba(8,145,178,0.12)] backdrop-blur xl:block">
        <div className="flex items-center justify-between">
          <p className="text-label uppercase tracking-[0.32em] text-cyan-700/75">Market Watch</p>
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400/35" />
            <span className="h-2.5 w-2.5 rounded-full bg-violet-400/35" />
          </div>
        </div>
        <div className="mt-5 flex h-24 items-end gap-2">
          <div className="w-full rounded-t-2xl bg-sky-500/20" style={{ height: '42%' }} />
          <div className="w-full rounded-t-2xl bg-sky-500/30" style={{ height: '68%' }} />
          <div className="w-full rounded-t-2xl bg-cyan-500/30" style={{ height: '55%' }} />
          <div className="w-full rounded-t-2xl bg-cyan-500/45" style={{ height: '82%' }} />
          <div className="w-full rounded-t-2xl bg-violet-500/30" style={{ height: '64%' }} />
          <div className="w-full rounded-t-2xl bg-violet-500/40" style={{ height: '92%' }} />
        </div>
        <div className="mt-4 flex items-center justify-between text-label text-muted-foreground">
          <span>Stage</span>
          <span>Sector</span>
          <span>Geography</span>
        </div>
      </div>

      <div
        className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, rgba(56, 189, 248, 0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(192, 132, 252, 0.35), transparent 55%)',
          animationDuration: '28s'
        }}
      />
      <div
        className="absolute -bottom-48 -left-40 h-[42rem] w-[42rem] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.22), transparent 62%), radial-gradient(circle at 35% 35%, rgba(34, 211, 238, 0.14), transparent 58%)'
        }}
      />
    </div>
  );
};
