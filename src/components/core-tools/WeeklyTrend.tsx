import { weeklyDisciplineSeries } from '@/lib/coreToolsExperience';

export default function WeeklyTrend({ logs }: { logs: Array<{ week_start_date: string; combined_score: number; calculation_version?: number }> }) {
  const series = weeklyDisciplineSeries(logs);
  return <section className="space-y-3 rounded-xl border p-4" aria-label="Weekly follow-through">
    <h3 className="font-semibold">Weekly follow-through</h3>
    <p className="text-sm text-muted-foreground">Saved consistency and experiment documentation, out of 100. Customer results remain separate.</p>
    {!series.length ? <p className="rounded-lg bg-muted p-3 text-sm">Save your first week to start this history. Earlier calculation versions stay in your reports.</p> : <table className="w-full text-left text-sm"><caption className="sr-only">Six weeks of saved execution discipline; missing weeks have no score.</caption><thead><tr><th scope="col" className="py-2">Week of</th><th scope="col">Saved score</th></tr></thead><tbody>{series.map(point => <tr key={point.date} className="border-t"><th scope="row" className="py-3 pr-4 font-normal">{point.date}</th><td>{point.score == null ? <span className="text-muted-foreground">Not recorded</span> : <div className="flex items-center gap-3"><progress aria-label={`Execution discipline for ${point.date}`} className="h-3 w-full max-w-48 accent-primary" max={100} value={point.score} /><span className="tabular-nums">{point.score}</span></div>}</td></tr>)}</tbody></table>}
  </section>;
}
