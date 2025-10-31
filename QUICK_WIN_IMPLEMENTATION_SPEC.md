# Quick Win Implementation Spec

## Project Portfolio Widget Integration
**Priority:** HIGH | **Impact:** 27/30 | **Effort:** Low

---

## Overview
Add a "My Active Projects" section to the main `PersonalizedDashboard` that displays the user's top 3 active business projects with key metrics and quick actions.

---

## Technical Specifications

### File Structure
```
src/components/dashboard/
├── ProjectPortfolioWidget.tsx (NEW)
└── PersonalizedDashboard.tsx (MODIFY - add new component)

src/hooks/
└── useProjectPortfolio.ts (NEW)
```

---

## Component Design

### ProjectPortfolioWidget.tsx

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Building2, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProjectPortfolio } from '@/hooks/useProjectPortfolio';

interface Project {
  id: string;
  title: string;
  completionPercentage: number;
  businessHealthScore?: number;
  stage: string;
  lastUpdated: string;
}

export const ProjectPortfolioWidget = () => {
  const { projects, loading } = useProjectPortfolio();

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            My Active Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card className="backdrop-blur-sm bg-card/95 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            My Active Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="font-semibold">No active projects yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first business plan to get started
              </p>
            </div>
            <Button asChild>
              <Link to="/bizmap-ai">
                Create Your First Project
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            My Active Projects
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/projects-dashboard">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {projects.slice(0, 3).map((project) => (
            <div
              key={project.id}
              className="group p-4 rounded-lg border bg-card hover:border-primary/50 hover:bg-accent/30 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {project.title || 'Untitled Project'}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {project.stage}
                  </p>
                </div>
                {project.businessHealthScore !== undefined && (
                  <Badge
                    variant={
                      project.businessHealthScore >= 70 ? 'default' :
                      project.businessHealthScore >= 50 ? 'secondary' :
                      'outline'
                    }
                    className="ml-2 flex-shrink-0"
                  >
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {project.businessHealthScore}%
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{project.completionPercentage}%</span>
                </div>
                <Progress value={project.completionPercentage} className="h-2" />
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <Link to={`/bizmap-ai?session=${project.id}`}>
                    Continue
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-6">
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link to="/bizmap-ai">
                <Building2 className="w-4 h-4 mr-2" />
                Start Your First Project
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

---

## Hook Implementation

### useProjectPortfolio.ts

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChatSessions, ChatSession } from '@/hooks/useChatSessions';

interface ProjectData {
  id: string;
  title: string;
  completionPercentage: number;
  businessHealthScore?: number;
  stage: string;
  lastUpdated: string;
}

export const useProjectPortfolio = (limit: number = 3) => {
  const { user } = useAuth();
  const { sessions, loading } = useChatSessions();
  const [projects, setProjects] = useState<ProjectData[]>([]);

  useEffect(() => {
    if (loading || !user) return;

    const projectData: ProjectData[] = sessions
      .filter(session => !session.is_completed || session.current_step > 0)
      .slice(0, limit)
      .map(session => {
        // Calculate completion percentage
        const totalSteps = 7; // Based on wizard steps
        const completionPercentage = Math.min(
          (session.current_step / totalSteps) * 100,
          100
        );

        // Determine business stage based on completion
        const stage = 
          completionPercentage >= 80 ? 'Refinement' :
          completionPercentage >= 60 ? 'Development' :
          completionPercentage >= 40 ? 'Planning' :
          'Ideation';

        return {
          id: session.id,
          title: session.title || 'Untitled Project',
          completionPercentage: Math.round(completionPercentage),
          businessHealthScore: undefined, // Will fetch separately
          stage,
          lastUpdated: session.updated_at,
        };
      });

    // Sort by completion percentage (highest first) or last updated
    projectData.sort((a, b) => b.completionPercentage - a.completionPercentage);

    setProjects(projectData);

    // Optionally fetch business health scores
    fetchHealthScores(projectData);
  }, [sessions, loading, user, limit]);

  const fetchHealthScores = async (projectData: ProjectData[]) => {
    if (!user) return;

    try {
      const { data: scores } = await supabase
        .from('business_success_scores')
        .select('session_id, overall_score')
        .eq('user_id', user.id)
        .in('session_id', projectData.map(p => p.id));

      if (scores) {
        const scoreMap = new Map(
          scores.map(s => [s.session_id, s.overall_score])
        );

        setProjects(prev => prev.map(p => ({
          ...p,
          businessHealthScore: scoreMap.get(p.id),
        })));
      }
    } catch (error) {
      console.error('Error fetching health scores:', error);
    }
  };

  return { projects, loading };
};
```

---

## Integration into PersonalizedDashboard

### Modify PersonalizedDashboard.tsx

Add the import at the top:
```typescript
import { ProjectPortfolioWidget } from './ProjectPortfolioWidget';
```

Add the component to the dashboard layout (around line 263, after welcome header):

```typescript
{/* Welcome Header */}
<div className="relative overflow-hidden">
  {/* ... existing header code ... */}
</div>

{/* Main Content Grid */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Left Column - Progress Timeline (Featured) */}
  <div className="lg:col-span-2 space-y-6">
    
    {/* NEW: Project Portfolio Widget */}
    <ProjectPortfolioWidget />
    
    <ProgressTimeline />
    
    {/* Quick Actions - Simplified */}
    {/* ... existing code ... */}
    
    {/* Daily Priorities */}
    <DailyPriorities />
  </div>

  {/* Right Column - Sidebar Widgets */}
  <div className="space-y-6">
    {/* Task Calendar */}
    <TaskCalendar />
    
    {/* Recent Wins */}
    <RecentWins refreshTrigger={winsRefreshTrigger} />
  </div>
</div>
```

---

## Database Queries

### Already Available
The `useChatSessions` hook already provides:
- All chat sessions (business plans)
- Completion status
- Current step
- Last updated timestamp

### Additional Query (Optional Enhancement)
To add business health scores, query already exists in `useProjectPortfolio`:

```sql
SELECT session_id, overall_score
FROM business_success_scores
WHERE user_id = :userId
AND session_id IN (:sessionIds)
```

---

## Styling

### Design Principles
1. **Consistent with existing design:** Uses same Card, Badge, Button components
2. **Responsive:** Works on mobile (stacks vertically)
3. **Interactive:** Hover effects, transitions
4. **Informative:** Shows progress, score, quick actions

### Color Coding
- **Health Score Badges:**
  - ≥70%: Green (default)
  - 50-69%: Gray (secondary)
  - <50%: Outline
- **Progress Bars:** Gradient from primary to primary/60
- **Stage Tags:** Based on completion percentage

---

## Testing Checklist

### Functional Tests
- [ ] Widget loads with correct number of projects (max 3)
- [ ] Empty state shows when no projects exist
- [ ] Loading state displays skeleton
- [ ] Clicking "Continue" navigates to correct project
- [ ] "View All" button links to projects dashboard
- [ ] Health scores display correctly when available
- [ ] Progress percentages are accurate

### Visual Tests
- [ ] Projects sorted by completion (highest first)
- [ ] Long titles truncate properly
- [ ] Responsive layout works on mobile
- [ ] Hover states function correctly
- [ ] Colors match theme

### Edge Cases
- [ ] Handles 0 projects gracefully
- [ ] Handles 1 project correctly
- [ ] Handles exactly 3 projects
- [ ] Handles >3 projects (shows only 3)
- [ ] Missing health scores handled
- [ ] Untitled projects handled

---

## Performance Considerations

### Optimizations
1. **Lazy Load Health Scores:** Don't block initial render
2. **Memoization:** Use React.memo if needed
3. **Limit Data:** Only fetch 3 projects
4. **Caching:** Leverage React Query caching from useChatSessions

### Bundle Size Impact
- **New files:** ~5KB minified
- **No new dependencies**
- **Minimal bundle increase**

---

## Deployment Plan

### Phase 1: Development (Day 1-2)
1. Create `useProjectPortfolio.ts` hook
2. Create `ProjectPortfolioWidget.tsx` component
3. Test in isolation

### Phase 2: Integration (Day 2-3)
1. Integrate into `PersonalizedDashboard.tsx`
2. Test full flow
3. Fix styling issues

### Phase 3: Testing (Day 4)
1. User acceptance testing
2. Performance testing
3. Cross-browser testing

### Phase 4: Deployment (Day 5)
1. Deploy to staging
2. QA sign-off
3. Production release

---

## Success Metrics

### Quantitative
- **Engagement:** 40% increase in clicks to projects
- **Navigation:** 30% reduction in clicks to reach projects page
- **Time:** Average 2 seconds saved per dashboard visit

### Qualitative
- Users report "better overview" of their business
- Reduced confusion about project status
- Increased sense of progress

---

## Future Enhancements

### Version 2
- Add project comparison view
- Show funding progress
- Add project notes/preview
- Quick actions menu

### Version 3
- Drag-and-drop project prioritization
- Project timeline view
- Shared project view with partners

---

## Rollback Plan

If issues occur:
1. **Immediate:** Hide component with feature flag
2. **Quick fix:** Use conditional rendering
3. **Full rollback:** Revert commit, redeploy

---

## Dependencies

### Existing
- `useAuth` from `@/contexts/AuthContext`
- `useChatSessions` from `@/hooks/useChatSessions`
- UI components from `@/components/ui/*`
- Supabase client

### New
- None

---

## Conclusion

This quick win delivers immediate value by surfacing the user's most important work—their business projects—front and center on the dashboard. With low effort and high impact, it transforms the dashboard from an activity tracker into a business intelligence hub.

**Time Estimate:** 2-3 days  
**Risk Level:** Low  
**Expected Impact:** High user engagement increase


