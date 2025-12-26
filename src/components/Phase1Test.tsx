/**
 * Phase 1 Test Component
 * Use this to test all Phase 1 features after applying the migration
 */

import React, { useState } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { useFounderProfile, useProfileCompleteness } from '@/hooks/useFounderProfile';
import { useProgressMilestones, useProgressBlockers, useProgressMetrics } from '@/hooks/useProgressTracker';
import { useAggregatedContext, useContextForAI, useProactiveSuggestions } from '@/hooks/useEnhancedContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export function Phase1Test() {
  const user = useUser();
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Phase 1 Feature Testing</h1>
        <Button onClick={runAllTests} size="lg">
          Run All Tests
        </Button>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="context">Context</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Founder Profile</CardTitle>
              <CardDescription>
                {hasProfile ? `Profile ${completeness}% complete` : 'No profile created yet'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasProfile && profile ? (
                <div className="space-y-2">
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
                <p className="text-gray-500">Profile not created yet</p>
              )}
              <div className="flex gap-2">
                <Button onClick={testCreateProfile} disabled={hasProfile}>
                  Create Profile
                </Button>
                <Button onClick={testUpdateProfile} disabled={!hasProfile}>
                  Update Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Milestones ({milestones.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {milestones.length > 0 ? (
                <div className="space-y-2">
                  {milestones.slice(0, 5).map(m => (
                    <div key={m.id} className="p-2 border rounded">
                      <p className="font-medium">{m.milestone_name}</p>
                      <p className="text-sm text-gray-600">Status: {m.status}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No milestones yet</p>
              )}
              <div className="flex gap-2">
                <Button onClick={testCreateMilestone}>Create Milestone</Button>
                <Button onClick={testCompleteMilestone} disabled={milestones.length === 0}>
                  Complete First
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Blockers ({blockers.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {blockers.length > 0 ? (
                <div className="space-y-2">
                  {blockers.map(b => (
                    <div key={b.id} className="p-2 border rounded">
                      <p className="font-medium">{b.blocker_title}</p>
                      <p className="text-sm text-gray-600">Severity: {b.severity}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No blockers</p>
              )}
              <div className="flex gap-2">
                <Button onClick={testCreateBlocker}>Create Blocker</Button>
                <Button onClick={testResolveBlocker} disabled={blockers.length === 0}>
                  Resolve First
                </Button>
              </div>
            </CardContent>
          </Card>

          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle>Progress Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Current Day</p>
                    <p className="text-2xl font-bold">{metrics.currentDay}/30</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Velocity</p>
                    <p className="text-2xl font-bold">{metrics.velocity.toFixed(2)}/week</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Quality Score</p>
                    <p className="text-2xl font-bold">{metrics.qualityScore}/100</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className={`text-lg font-bold ${metrics.onTrack ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.onTrack ? '✓ On Track' : '⚠ Behind'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Context Tab */}
        <TabsContent value="context" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aggregated Context</CardTitle>
              <CardDescription>Combined data from all sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button onClick={testContextAggregation}>
                  Test Context Aggregation
                </Button>
                <Button onClick={testFormattedContext} className="ml-2">
                  Test Formatted Context
                </Button>
                {context && (
                  <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
                    <p><strong>Profile:</strong> {context.founderProfile ? '✓ Loaded' : '✗ Missing'}</p>
                    <p><strong>Milestones:</strong> {context.currentMilestones.length} active</p>
                    <p><strong>Blockers:</strong> {context.activeBlockers.length} active</p>
                    <p><strong>On Track:</strong> {context.insights.isOnTrack ? '✓' : '✗'}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tests Tab */}
        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>Recent test outputs</CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length > 0 ? (
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {testResults.map((result, idx) => (
                    <p key={idx} className="text-sm font-mono">{result}</p>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No tests run yet. Click "Run All Tests" above.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Proactive Suggestions</CardTitle>
              <CardDescription>AI-generated recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              {suggestions.length > 0 ? (
                <div className="space-y-3">
                  {suggestions.map((suggestion, idx) => (
                    <div key={idx} className="p-3 border rounded">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          suggestion.priority === 'high' ? 'bg-red-100 text-red-800' :
                          suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {suggestion.priority}
                        </span>
                        <span className="text-sm text-gray-600">{suggestion.type}</span>
                      </div>
                      <p className="font-medium">{suggestion.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No suggestions yet. Complete your profile and add milestones!</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
