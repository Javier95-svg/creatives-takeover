// Verified traction report — exports the founder's weekly traction ledger as an
// investor-shareable PDF. Weeks whose retention numbers came from platform-
// tracked visits (score_breakdown.retentionSource === 'platform') carry a
// "platform-verified" badge; everything else is marked self-reported. The
// ledger's value is that it is weekly, timestamped, and deterministically
// scored — this export gives the streak an external audience.
import { supabase } from '@/integrations/supabase/client';

interface ReportLogRow {
  week_start_date: string;
  combined_score: number;
  consistency_score: number;
  channel_efficiency_score: number;
  experiment_quality_score: number;
  retention_health_score: number;
  consistency_streak_weeks: number;
  phase_seven_ready: boolean;
  new_users: number;
  seven_day_active_users: number;
  thirty_day_active_users: number;
  primary_acquisition_channel: string | null;
  score_breakdown: { retentionSource?: string } | null;
}

export async function exportTractionReportPdf(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('traction_engine_weekly_logs' as never)
    .select(
      'week_start_date, combined_score, consistency_score, channel_efficiency_score, experiment_quality_score, retention_health_score, consistency_streak_weeks, phase_seven_ready, new_users, seven_day_active_users, thirty_day_active_users, primary_acquisition_channel, score_breakdown',
    )
    .eq('user_id', userId)
    .order('week_start_date', { ascending: false })
    .limit(12);
  if (error) throw new Error('Could not load your traction history.');
  const logs = ((data ?? []) as ReportLogRow[]).reverse();
  if (logs.length === 0) throw new Error('No saved weeks yet — save your first weekly scorecard first.');

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  const latest = logs[logs.length - 1];
  const verifiedWeeks = logs.filter((log) => log.score_breakdown?.retentionSource === 'platform').length;
  const phaseSevenReady = logs.some((log) => log.phase_seven_ready);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Traction Ledger', margin, y);
  y += 22;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Weekly distribution + retention scorecards · generated ${new Date().toISOString().slice(0, 10)} · Creatives Takeover Traction Engine`,
    margin,
    y,
  );
  y += 28;

  // Summary strip
  doc.setTextColor(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const summaryBits = [
    `${logs.length} consecutive logged week${logs.length === 1 ? '' : 's'}`,
    `Latest score: ${latest.combined_score}/100`,
    `Streak: ${latest.consistency_streak_weeks} week${latest.consistency_streak_weeks === 1 ? '' : 's'}`,
    phaseSevenReady ? 'Phase 7 (fundraise-ready) threshold reached' : 'Phase 7 threshold not yet reached',
  ];
  doc.text(summaryBits.join('   ·   '), margin, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    verifiedWeeks > 0
      ? `${verifiedWeeks} of ${logs.length} weeks use retention data auto-collected from the founder's live published product (platform-verified).`
      : 'Retention figures are founder-reported. Platform-verified weeks appear automatically once the published MVP is live.',
    margin,
    y,
  );
  y += 24;

  // Table header
  const cols = [
    { label: 'Week', w: 64 },
    { label: 'Score', w: 40 },
    { label: 'Consist.', w: 46 },
    { label: 'Channel', w: 46 },
    { label: 'Quality', w: 46 },
    { label: 'Retention', w: 52 },
    { label: 'New', w: 36 },
    { label: '7d', w: 32 },
    { label: '30d', w: 36 },
    { label: 'Source', w: 88 },
  ];
  const startX = margin;
  doc.setFillColor(240, 240, 244);
  doc.rect(startX, y - 10, pageW - margin * 2, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(60);
  let x = startX + 4;
  cols.forEach((col) => {
    doc.text(col.label, x, y + 2);
    x += col.w;
  });
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20);
  logs.forEach((log) => {
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
    const verified = log.score_breakdown?.retentionSource === 'platform';
    const cells = [
      log.week_start_date,
      String(log.combined_score),
      String(log.consistency_score),
      String(log.channel_efficiency_score),
      String(log.experiment_quality_score),
      String(log.retention_health_score),
      String(log.new_users),
      String(log.seven_day_active_users),
      String(log.thirty_day_active_users),
      verified ? 'Platform-verified' : 'Self-reported',
    ];
    x = startX + 4;
    cells.forEach((cell, i) => {
      if (i === 9) doc.setTextColor(verified ? 22 : 120, verified ? 130 : 120, verified ? 93 : 120);
      doc.text(cell, x, y);
      if (i === 9) doc.setTextColor(20);
      x += cols[i].w;
    });
    if (log.phase_seven_ready) {
      doc.setTextColor(22, 130, 93);
      doc.setFontSize(7.5);
      doc.text('P7', startX + cols.reduce((sum, c) => sum + c.w, 0) + 2, y);
      doc.setFontSize(8.5);
      doc.setTextColor(20);
    }
    y += 15;
  });

  y += 18;
  doc.setFontSize(8);
  doc.setTextColor(120);
  const footer =
    'Scores are computed deterministically (equal-weighted consistency, channel efficiency, experiment quality, retention health) at the time each week was saved. ' +
    'Platform-verified weeks draw retention from visit tracking on the founder\'s published product; the ledger cannot be edited retroactively.';
  doc.text(doc.splitTextToSize(footer, pageW - margin * 2), margin, y);

  doc.save(`traction-ledger-${new Date().toISOString().slice(0, 10)}.pdf`);
}
