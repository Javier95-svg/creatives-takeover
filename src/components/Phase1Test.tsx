/**
 * Phase 1 Test Component
 * Use this to test all Phase 1 features after applying the migration
 */

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFounderProfile, useProfileCompleteness } from '@/hooks/useFounderProfile';
import { useProgressMilestones, useProgressBlockers, useProgressMetrics } from '@/hooks/useProgressTracker';
import { useAggregatedContext, useContextForAI, useProactiveSuggestions } from '@/hooks/useEnhancedContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export function Phase1Test() {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);

  // Test Hooks
  const { profile, createProfile, updateProfile, hasProfile } = useFounderProfile();
  const { completeness, missingFields } = useProfileCompleteness();
  const { milestones, createMilestone, completeMilestone } = useProgressMilestones(user?.id);
  const { blockers, createBlocker, resolveBlocker } = useProgressBlockers(user?.id);
  const { metrics } = useProgressMetrics(user?.id);
  const { context } = useAggregatedContext();
  const { formattedContext } = useContextForAI();
  const { suggestions } = useProactiveSuggestions();

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `✅ ${result}`]);
    toast.success(result);
  };

  const addError = (error: string) => {
    setTestResults(prev => [...prev, `❌ ${error}`]);
    toast.error(error);
  };

  // Test 1: Create Founder Profile
  const testCreateProfile = async () => {
    try {
      await createProfile({
        risk_tolerance: 'moderate',
        decision_making_style: 'data-driven',
        entrepreneurial_experience: 'first-time',
        skill_gaps: ['Marketing', 'Sales'],
        primary_goals: ['Launch MVP', 'Get first customers'],
      });
      addResult('Founder profile created successfully');
    } catch (error: any) {
      addError(`Profile creation failed: ${error.message}`);
    }
  };

  // Test 2: Update Profile
  const testUpdateProfile = async () => {
    try {
      await updateProfile({
        learning_preferences: ['Video tutorials', 'Hands-on practice'],
      });
      addResult('Profile updated successfully');
    } catch (error: any) {
      addError(`Profile update failed: ${error.message}`);
    }
  };

  // Test 3: Create Milestone
  const testCreateMilestone = async () => {
    try {
      await createMilestone({
        milestone_type: 'business_concept',
        milestone_name: 'Define Problem Statement',
        milestone_description: 'Clearly articulate the problem we are solving',
        target_day: 1,
      });
      addResult('Milestone created successfully');
    } catch (error: any) {
      addError(`Milestone creation failed: ${error.message}`);
    }
  };

  // Test 4: Complete Milestone
  const testCompleteMilestone = async () => {
    if (milestones.length === 0) {
      addError('No milestones to complete. Create one first!');
      return;
    }
    try {
      const firstMilestone = milestones[0];
      await completeMilestone(firstMilestone.id, 85);
      addResult(`Milestone "${firstMilestone.milestone_name}" completed with 85% quality`);
    } catch (error: any) {
      addError(`Milestone completion failed: ${error.message}`);
    }
  };

  // Test 5: Create Blocker
  const testCreateBlocker = async () => {
    try {
      await createBlocker({
        blocker_type: 'knowledge_gap',
        blocker_title: 'Need to learn market research',
        blocker_description: 'Not sure how to conduct effective market research',
        severity: 'medium',
      });
      addResult('Blocker created successfully');
    } catch (error: any) {
      addError(`Blocker creation failed: ${error.message}`);
    }
  };

  // Test 6: Resolve Blocker
  const testResolveBlocker = async () => {
    if (blockers.length === 0) {
      addError('No blockers to resolve. Create one first!');
      return;
    }
    try {
      const firstBlocker = blockers[0];
      await resolveBlocker({
        blockerId: firstBlocker.id,
        resolution: {
          status: 'resolved',
          resolution_notes: 'Completed online course on market research fundamentals',
        },
      });
      addResult(`Blocker "${firstBlocker.blocker_title}" resolved`);
    } catch (error: any) {
      addError(`Blocker resolution failed: ${error.message}`);
    }
  };

  // Test 7: Check Context Aggregation
  const testContextAggregation = () => {
    if (context) {
      addResult('Context aggregation working! See Console for details.');
      console.log('Aggregated Context:', context);
    } else {
      addError('Context aggregation failed or returned null');
    }
  };

  // Test 8: Check Formatted Context
  const testFormattedContext = () => {
    if (formattedContext) {
      addResult('Formatted context generated! See Console.');
      console.log('Formatted Context for AI:\n', formattedContext);
    } else {
      addError('Formatted context is empty');
    }
  };

  // Run All Tests
  const runAllTests = async () => {
    setTestResults([]);
    addResult('Starting Phase 1 tests...');

    if (!hasProfile) {
      await testCreateProfile();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await testUpdateProfile();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testCreateMilestone();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testCreateBlocker();
    await new Promise(resolve => setTimeout(resolve, 500));

    testContextAggregation();
    testFormattedContext();

    addResult('All tests completed!');
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-lg">Please sign in to test Phase 1 features</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-5xl">
      {/* Sticky Header */}
      <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 py-4 border-b">
        <h1 className="text-3xl font-bold gradient-text">Phase 1 Feature Testing</h1>
        <Button onClick={runAllTests} size="lg" className="shadow-lg">
          Run All Tests
        </Button>
      </div>

      {/* Vertical Scrollable List of Test Sections */}
      <div className="space-y-8">
        {/* Section 1: Founder Profile */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="text-2xl">1. Founder Profile</CardTitle>
            <CardDescription>
              {hasProfile ? `Profile ${completeness}% complete` : 'No profile created yet'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasProfile && profile ? (
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <p><strong>Risk Tolerance:</strong> {profile.risk_tolerance}</p>
                <p><strong>Decision Style:</strong> {profile.decision_making_style}</p>
                <p><strong>Experience:</strong> {profile.entrepreneurial_experience}</p>
                <p><strong>Skill Gaps:</strong> {profile.skill_gaps.join(', ') || 'None'}</p>
                <p><strong>Goals:</strong> {profile.primary_goals.join(', ') || 'None'}</p>
                {missingFields.length > 0 && (
                  <p className="text-yellow-600">
                    <strong>Missing:</strong> {missingFields.join(', ')}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Profile not created yet</p>
            )}
            <div className="flex gap-2">
              <Button onClick={testCreateProfile} disabled={hasProfile}>
                Create Profile
              </Button>
              <Button onClick={testUpdateProfile} disabled={!hasProfile} variant="outline">
                Update Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Progress Tracking */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-2xl">2. Progress Tracking</CardTitle>
            <CardDescription>Milestones, blockers, and metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Milestones */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Milestones ({milestones.length})</h3>
              {milestones.length > 0 ? (
                <div className="space-y-2">
                  {milestones.slice(0, 5).map(m => (
                    <div key={m.id} className="p-3 border rounded-lg bg-muted/30">
                      <p className="font-medium">{m.milestone_name}</p>
                      <p className="text-sm text-muted-foreground">Status: {m.status}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No milestones yet</p>
              )}
              <div className="flex gap-2">
                <Button onClick={testCreateMilestone} size="sm">Create Milestone</Button>
                <Button onClick={testCompleteMilestone} disabled={milestones.length === 0} variant="outline" size="sm">
                  Complete First
                </Button>
              </div>
            </div>

            {/* Blockers */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Blockers ({blockers.length})</h3>
              {blockers.length > 0 ? (
                <div className="space-y-2">
                  {blockers.map(b => (
                    <div key={b.id} className="p-3 border rounded-lg bg-red-50 dark:bg-red-950/20">
                      <p className="font-medium">{b.blocker_title}</p>
                      <p className="text-sm text-muted-foreground">Severity: {b.severity}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No blockers</p>
              )}
              <div className="flex gap-2">
                <Button onClick={testCreateBlocker} size="sm">Create Blocker</Button>
                <Button onClick={testResolveBlocker} disabled={blockers.length === 0} variant="outline" size="sm">
                  Resolve First
                </Button>
              </div>
            </div>

            {/* Metrics */}
            {metrics && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Progress Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-1">Current Day</p>
                    <p className="text-2xl font-bold">{metrics.currentDay}/30</p>
                  </div>
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-1">Velocity</p>
                    <p className="text-2xl font-bold">{metrics.velocity.toFixed(2)}/week</p>
                  </div>
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-1">Quality Score</p>
                    <p className="text-2xl font-bold">{metrics.qualityScore}/100</p>
                  </div>
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <p className={`text-lg font-bold ${metrics.onTrack ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.onTrack ? '✓ On Track' : '⚠ Behind'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Context Aggregation */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="text-2xl">3. Context Aggregation</CardTitle>
            <CardDescription>Combined data from all sources for AI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={testContextAggregation}>
                Test Context Aggregation
              </Button>
              <Button onClick={testFormattedContext} variant="outline">
                Test Formatted Context
              </Button>
            </div>
            {context && (
              <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-2">
                <p><strong>Profile:</strong> {context.founderProfile ? '✓ Loaded' : '✗ Missing'}</p>
                <p><strong>Milestones:</strong> {context.currentMilestones.length} active</p>
                <p><strong>Blockers:</strong> {context.activeBlockers.length} active</p>
                <p><strong>On Track:</strong> {context.insights.isOnTrack ? '✓ Yes' : '✗ No'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Test Results & Suggestions */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-2xl">4. Test Results & Suggestions</CardTitle>
            <CardDescription>Recent test outputs and AI recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Test Results */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Test Results</h3>
              {testResults.length > 0 ? (
                <div className="space-y-1 max-h-96 overflow-y-auto p-4 bg-muted/30 rounded-lg">
                  {testResults.map((result, idx) => (
                    <p key={idx} className="text-sm font-mono">{result}</p>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No tests run yet. Click "Run All Tests" above.</p>
              )}
            </div>

            {/* Proactive Suggestions */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Proactive Suggestions</h3>
              {suggestions.length > 0 ? (
                <div className="space-y-3">
                  {suggestions.map((suggestion, idx) => (
                    <div key={idx} className="p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          suggestion.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {suggestion.priority}
                        </span>
                        <span className="text-sm text-muted-foreground">{suggestion.type}</span>
                      </div>
                      <p className="font-medium">{suggestion.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No suggestions yet. Complete your profile and add milestones!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
