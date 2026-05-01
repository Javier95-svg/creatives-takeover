export const DashboardSkeleton = () => (
  <div className="min-h-screen bg-background p-6 space-y-6 animate-pulse">
    {/* Header */}
    <div className="h-8 w-48 bg-muted rounded" />

    {/* Metric cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 bg-muted rounded-xl" />
      ))}
    </div>

    {/* Next best action */}
    <div className="h-40 bg-muted rounded-xl" />

    {/* Progress section */}
    <div className="space-y-3">
      <div className="h-4 w-32 bg-muted rounded" />
      <div className="h-3 bg-muted rounded w-full" />
      <div className="h-3 bg-muted rounded w-3/4" />
    </div>
  </div>
);

export default DashboardSkeleton;
