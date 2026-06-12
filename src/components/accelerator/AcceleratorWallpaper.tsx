import React from 'react';

export const AcceleratorWallpaper: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.08)_0,transparent_45%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.08)_0,transparent_35%)]" />

      <div className="absolute left-[-4%] top-20 h-72 w-72 rounded-full border border-amber-500/15 opacity-60" />
      <div className="absolute left-[2%] top-26 h-56 w-56 rounded-full border border-orange-500/15 opacity-50" />
      <div className="absolute right-[4%] top-24 h-80 w-80 rounded-full border border-amber-400/15 opacity-45" />

      <div className="absolute left-[9%] top-28 hidden w-72 rotate-[-7deg] rounded-5xl border border-amber-500/20 bg-background/75 p-5 shadow-[0_28px_90px_rgba(217,119,6,0.14)] backdrop-blur xl:block">
        <p className="text-label uppercase tracking-[0.34em] text-amber-700/75">Cohort Board</p>
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-label font-medium text-amber-700">
            Batch Review
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-center text-label font-medium text-orange-700">Mentors</div>
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-center text-label font-medium text-sky-700">Funding</div>
          </div>
          <div className="h-2 w-full rounded-full bg-border/70" />
          <div className="h-2 w-4/5 rounded-full bg-border/55" />
          <div className="h-2 w-3/5 rounded-full bg-border/45" />
        </div>
      </div>

      <div className="absolute right-[8%] top-36 hidden w-80 rotate-[8deg] rounded-5xl border border-orange-500/20 bg-background/80 p-5 shadow-[0_34px_100px_rgba(249,115,22,0.14)] backdrop-blur xl:block">
        <div className="flex items-center justify-between">
          <p className="text-label uppercase tracking-[0.32em] text-orange-700/75">Launch Map</p>
          <div className="flex gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-400/55" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/45" />
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400/35" />
          </div>
        </div>
        <div className="relative mt-6 h-28">
          <div className="absolute left-4 top-10 h-px w-56 bg-gradient-to-r from-amber-500/30 via-orange-500/40 to-transparent" />
          <div className="absolute left-4 top-10 h-3 w-3 rounded-full bg-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.4)]" />
          <div className="absolute left-24 top-5 h-4 w-4 rounded-full bg-orange-400/65 shadow-[0_0_24px_rgba(249,115,22,0.35)]" />
          <div className="absolute left-44 top-14 h-3.5 w-3.5 rounded-full bg-sky-400/55 shadow-[0_0_20px_rgba(56,189,248,0.3)]" />
          <div className="absolute left-60 top-2 h-5 w-5 rounded-full bg-amber-300/55 shadow-[0_0_24px_rgba(252,211,77,0.35)]" />
          <div className="absolute left-12 top-16 text-caption uppercase tracking-[0.22em] text-muted-foreground">Apply</div>
          <div className="absolute left-30 top-0 text-caption uppercase tracking-[0.22em] text-muted-foreground">Mentor</div>
          <div className="absolute left-48 top-20 text-caption uppercase tracking-[0.22em] text-muted-foreground">Build</div>
          <div className="absolute right-2 top-0 text-caption uppercase tracking-[0.22em] text-muted-foreground">Demo</div>
        </div>
      </div>

      <div
        className="absolute -top-40 -right-40 h-[54rem] w-[54rem] rounded-full opacity-70 blur-3xl animate-[spin_32s_linear_infinite]"
        style={{
          background:
            'radial-gradient(circle at 35% 30%, rgba(251, 191, 36, 0.24), transparent 58%), radial-gradient(circle at 70% 68%, rgba(249, 115, 22, 0.22), transparent 54%), radial-gradient(circle at 55% 50%, rgba(56, 189, 248, 0.12), transparent 48%)'
        }}
      />
      <div
        className="absolute -bottom-44 -left-32 h-[40rem] w-[40rem] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(249, 115, 22, 0.18), transparent 60%), radial-gradient(circle at 40% 40%, rgba(251, 191, 36, 0.14), transparent 55%)'
        }}
      />
    </div>
  );
};
