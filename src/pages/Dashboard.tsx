import { PersonalizedDashboardClassic } from '@/components/dashboard/PersonalizedDashboardClassic';
import { PersonalizedDashboardV2 } from '@/components/dashboard/PersonalizedDashboardV2';
import DashboardPreview from '@/components/DashboardPreview';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUpgradePrompt } from '@/contexts/UpgradePromptContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { checkFeatureAccess } = useFeatureGating();
  const navigate = useNavigate();
  const { openUpgradePrompt } = useUpgradePrompt();
  const [useClassicDashboard, setUseClassicDashboard] = useState(false);

  // Load user's dashboard preference
  useEffect(() => {
    if (!user) return;

    const loadDashboardPreference = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('use_classic_dashboard')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUseClassicDashboard(profile.use_classic_dashboard || false);
      }
    };

    loadDashboardPreference();
  }, [user]);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7254/ingest/ee6f2963-fab2-49c2-8925-7093ad7fc9ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:15',message:'Dashboard useEffect entry',data:{hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    if (user) {
      try {
        const access = checkFeatureAccess('dashboard_access');
        // #region agent log
        fetch('http://127.0.0.1:7254/ingest/ee6f2963-fab2-49c2-8925-7093ad7fc9ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:20',message:'Dashboard access check result',data:{hasAccess:access.hasAccess,message:access.message,requiredTier:access.requiredTier},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        if (!access.hasAccess) {
          openUpgradePrompt({
            reason: 'feature',
            featureName: 'Dashboard',
            requiredTier: access.requiredTier as 'creator' | 'professional' | undefined,
            description: access.message,
          });
        }
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7254/ingest/ee6f2963-fab2-49c2-8925-7093ad7fc9ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:28',message:'Dashboard access check error',data:{errorMessage:error instanceof Error?error.message:String(error),errorStack:error instanceof Error?error.stack?.substring(0,300):''},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        console.error('Error checking dashboard access:', error);
      }
    }
  }, [user, checkFeatureAccess, openUpgradePrompt, navigate]);

  if (!user) {
    return (
      <>
        <Helmet>
          <title>Dashboard Preview - Creatives Takeover</title>
          <meta name="description" content="Preview the Creatives Takeover dashboard. Sign up to access BizMap AI progress tracking, business plans, community analytics, and project timeline management." />
        </Helmet>
        <DashboardPreview />
      </>
    );
  }

  // Check access before rendering
  let access;
  try {
    access = checkFeatureAccess('dashboard_access');
    // #region agent log
    fetch('http://127.0.0.1:7254/ingest/ee6f2963-fab2-49c2-8925-7093ad7fc9ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:40',message:'Dashboard render access check',data:{hasAccess:access.hasAccess},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7254/ingest/ee6f2963-fab2-49c2-8925-7093ad7fc9ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:45',message:'Dashboard render access check error',data:{errorMessage:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.error('Error checking dashboard access in render:', error);
    return (
      <>
        <Helmet>
          <title>Dashboard Preview - Creatives Takeover</title>
          <meta name="description" content="Preview the Creatives Takeover dashboard. Sign up to access BizMap AI progress tracking, business plans, community analytics, and project timeline management." />
        </Helmet>
        <DashboardPreview />
      </>
    );
  }
  if (!access.hasAccess) {
    return (
      <>
        <Helmet>
          <title>Dashboard Preview - Creatives Takeover</title>
          <meta name="description" content="Preview the Creatives Takeover dashboard. Sign up to access BizMap AI progress tracking, business plans, community analytics, and project timeline management." />
        </Helmet>
        <DashboardPreview />
      </>
    );
  }

  // Render the appropriate dashboard version based on user preference
  return useClassicDashboard ? <PersonalizedDashboardClassic /> : <PersonalizedDashboardV2 />;
};

export default Dashboard;
