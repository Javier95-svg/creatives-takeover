import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import { TaskCountContext } from './PersonalizedDashboardV2';
import {
  Target,
  Calendar,
  CheckSquare,
  Sparkles,
  Users,
  BookOpen,
  Command,
  Zap,
  FlaskConical,
  Library,
  Mail,
  FileSearch,
  ClipboardList,
  Home,
  BarChart3,
  Trash2,
  Rocket,
  LineChart,
  Filter,
  Handshake,
  type LucideIcon,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { DashboardCustomization } from './DashboardCustomization';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { resolveEntitlement, normalizePlan, type FeatureKey, type DashboardModeVariant } from '@/config/planPermissions';
import { useSubscription } from '@/hooks/useSubscription';

interface SidebarPreferences {
  showICPBuilder: boolean;
  showWaitlistMaker: boolean;
  showPMFLab: boolean;
  showMVPBuilder: boolean;
  showTechStack: boolean;
  showGTMStrategist: boolean;
  showDirectories: boolean;
  showFindMentor: boolean;
  showFindCoFounder: boolean;
  showFindAngel: boolean;
  showVCSearch: boolean;
  showAcceleratorHunt: boolean;
  showEmailTemplates: boolean;
  showPitchDeckAnalyzer: boolean;
  showInsightaTest: boolean;
  showNewspaper: boolean;
  showPromptLibrary: boolean;
}

type LegacySidebarPreferences = Partial<SidebarPreferences> & {
  showCommunity?: boolean;
  showRead?: boolean;
};

const defaultSidebarPreferences: SidebarPreferences = {
  showICPBuilder: true,
  showWaitlistMaker: true,
  showPMFLab: true,
  showMVPBuilder: true,
  showTechStack: true,
  showGTMStrategist: true,
  showDirectories: true,
  showFindMentor: true,
  showFindCoFounder: true,
  showFindAngel: true,
  showVCSearch: true,
  showAcceleratorHunt: true,
  showEmailTemplates: true,
  showPitchDeckAnalyzer: true,
  showInsightaTest: true,
  showNewspaper: true,
  showPromptLibrary: true,
};

const normalizePreferences = (raw: LegacySidebarPreferences | null | undefined): SidebarPreferences => {
  const merged: SidebarPreferences = {
    ...defaultSidebarPreferences,
    ...(raw || {}),
  };

  if (raw && typeof raw.showFindMentor === 'undefined' && typeof raw.showCommunity === 'boolean') {
    merged.showFindMentor = raw.showCommunity;
  }

  if (raw && typeof raw.showNewspaper === 'undefined' && typeof raw.showRead === 'boolean') {
    merged.showNewspaper = raw.showRead;
  }

  return merged;
};

interface ToolItem {
  path: string;
  label: string;
  icon: LucideIcon;
  prefKey: keyof SidebarPreferences;
  featureKey?: FeatureKey;
}

export const DashboardSidebar = () => {
  const location = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();
  const { user } = useAuth();
  const { subscriptionData } = useSubscription();
  const incompleteTaskCount = useContext(TaskCountContext);
  const [sidebarPreferences, setSidebarPreferences] = useState<SidebarPreferences>(defaultSidebarPreferences);
  const currentPlan = normalizePlan(subscriptionData?.subscription_tier);
  const dashboardMode = (resolveEntitlement('dashboard_mode', currentPlan).dashboardMode ?? currentPlan) as DashboardModeVariant;

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('sidebar_preferences')
        .eq('id', user.id)
        .single();

      if (data?.sidebar_preferences) {
        setSidebarPreferences(normalizePreferences(data.sidebar_preferences as LegacySidebarPreferences));
      }
    };

    loadPreferences();
  }, [user]);

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const dashboardNavItemsByMode: Record<DashboardModeVariant, Array<{ path: string; label: string; icon: LucideIcon }>> = {
    rookie: [
      { path: '/dashboard', label: 'Home', icon: Home },
      { path: '/tasks', label: 'Your Tasks', icon: CheckSquare },
    ],
    starter: [
      { path: '/dashboard', label: 'Home', icon: Home },
      { path: '/weekly-mission', label: 'Weekly Mission', icon: Calendar },
      { path: '/tasks', label: 'Your Tasks', icon: CheckSquare },
    ],
    rising: [
      { path: '/dashboard', label: 'Home', icon: Home },
      { path: '/focus-funnel', label: 'Focus Funnel', icon: Target },
      { path: '/decision-sprint', label: 'Decision Sprint', icon: ClipboardList },
      { path: '/core-metrics', label: 'Core Metrics', icon: BarChart3 },
      { path: '/weekly-mission', label: 'Weekly Mission', icon: Calendar },
      { path: '/tasks', label: 'Your Tasks', icon: CheckSquare },
    ],
    pro: [
      { path: '/dashboard', label: 'War Room', icon: Home },
      { path: '/focus-funnel', label: 'Focus Funnel', icon: Target },
      { path: '/decision-sprint', label: 'Decision Sprint', icon: ClipboardList },
      { path: '/core-metrics', label: 'Core Metrics', icon: BarChart3 },
      { path: '/weekly-mission', label: 'Weekly Mission', icon: Calendar },
      { path: '/tasks', label: 'Your Tasks', icon: CheckSquare },
    ],
  };

  const dashboardNavItems = dashboardNavItemsByMode[dashboardMode];

  const visibleToolPreferences: Record<DashboardModeVariant, Array<keyof SidebarPreferences>> = {
    rookie: ['showICPBuilder', 'showFindMentor', 'showFindCoFounder'],
    starter: ['showICPBuilder', 'showWaitlistMaker', 'showPMFLab', 'showFindMentor', 'showFindCoFounder', 'showVCSearch', 'showAcceleratorHunt', 'showEmailTemplates', 'showPromptLibrary'],
    rising: ['showICPBuilder', 'showWaitlistMaker', 'showPMFLab', 'showMVPBuilder', 'showTechStack', 'showGTMStrategist', 'showDirectories', 'showFindMentor', 'showFindCoFounder', 'showVCSearch', 'showAcceleratorHunt', 'showEmailTemplates', 'showPitchDeckAnalyzer', 'showInsightaTest', 'showNewspaper', 'showPromptLibrary'],
    pro: ['showICPBuilder', 'showWaitlistMaker', 'showPMFLab', 'showMVPBuilder', 'showTechStack', 'showGTMStrategist', 'showDirectories', 'showFindMentor', 'showFindCoFounder', 'showFindAngel', 'showVCSearch', 'showAcceleratorHunt', 'showEmailTemplates', 'showPitchDeckAnalyzer', 'showInsightaTest', 'showNewspaper', 'showPromptLibrary'],
  };

  const toolsItems: ToolItem[] = [
    { path: '/icp-builder', label: 'ICP Builder', icon: Target, prefKey: 'showICPBuilder', featureKey: 'icp_builder' },
    { path: '/waitlist', label: 'Waitlist Maker', icon: ClipboardList, prefKey: 'showWaitlistMaker', featureKey: 'waitlist_maker' },
    { path: '/pmf-lab', label: 'PMF Lab', icon: FlaskConical, prefKey: 'showPMFLab', featureKey: 'pmf_lab' },
    { path: '/mvp-builder', label: 'MVP Builder', icon: Rocket, prefKey: 'showMVPBuilder', featureKey: 'mvp_builder' },
    { path: '/tech-stack', label: 'Tech Stack', icon: Zap, prefKey: 'showTechStack', featureKey: 'tech_stack' },
    { path: '/go-to-market', label: 'GTM Strategist', icon: LineChart, prefKey: 'showGTMStrategist', featureKey: 'gtm_strategist' },
    { path: '/directories', label: 'Directories', icon: Filter, prefKey: 'showDirectories', featureKey: 'directories' },
    { path: '/community', label: 'Find a Mentor', icon: Users, prefKey: 'showFindMentor' },
    { path: '/community/co-founders', label: 'Find a Co-Founder', icon: Handshake, prefKey: 'showFindCoFounder' },
    { path: '/community/angels', label: 'Find your Angel', icon: Sparkles, prefKey: 'showFindAngel', featureKey: 'angels_community' },
    { path: '/insighta/vc-search', label: 'VC Search', icon: FileSearch, prefKey: 'showVCSearch', featureKey: 'vc_search_browse' },
    { path: '/insighta/accelerator-hunt', label: 'Accelerator Hunt', icon: Rocket, prefKey: 'showAcceleratorHunt', featureKey: 'accelerator_browse' },
    { path: '/insighta/email-templates', label: 'Email Templates', icon: Mail, prefKey: 'showEmailTemplates', featureKey: 'email_templates' },
    { path: '/insighta/pitch-deck-analyzer', label: 'Pitch Deck Analyzer', icon: BarChart3, prefKey: 'showPitchDeckAnalyzer', featureKey: 'pitch_deck_analyzer' },
    { path: '/insighta/test', label: 'Insighta Test', icon: Sparkles, prefKey: 'showInsightaTest', featureKey: 'insighta_test' },
    { path: '/newspaper', label: 'Newspaper', icon: BookOpen, prefKey: 'showNewspaper', featureKey: 'newspaper' },
    { path: '/prompt-library', label: 'Prompt Library', icon: Library, prefKey: 'showPromptLibrary', featureKey: 'prompt_library' },
  ].filter((item) => {
    if (!visibleToolPreferences[dashboardMode].includes(item.prefKey)) {
      return false;
    }

    if (!sidebarPreferences[item.prefKey]) {
      return false;
    }

    if (!item.featureKey) {
      return true;
    }

    return resolveEntitlement(item.featureKey, currentPlan).isVisible;
  });

  const removeTool = async (prefKey: keyof SidebarPreferences) => {
    const updatedPreferences: SidebarPreferences = { ...sidebarPreferences, [prefKey]: false };
    setSidebarPreferences(updatedPreferences);

    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ sidebar_preferences: updatedPreferences })
          .eq('id', user.id);
      } catch (error) {
        console.error('Error removing tool:', error);
      }
    }
  };

  return (
    <Sidebar collapsible="icon" className="glass-sidebar" variant="floating" side="left">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <span className="font-semibold text-sm group-data-[collapsible=icon]:hidden">
            Dashboard
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dashboardNavItems.map((item) => {
                const isTasksItem = item.path === '/tasks';
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.path} tooltip={item.label}>
                      <Link to={item.path} onClick={handleNavClick} className="flex items-center gap-2 w-full">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {isTasksItem && incompleteTaskCount > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground group-data-[collapsible=icon]:hidden">
                            {incompleteTaskCount > 99 ? '99+' : incompleteTaskCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <div className="flex items-center w-full group/tool">
                    <SidebarMenuButton asChild tooltip={item.label} className="flex-1">
                      <Link to={item.path} onClick={handleNavClick}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeTool(item.prefKey);
                      }}
                      className="opacity-0 group-hover/tool:opacity-100 p-1 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all mr-1 group-data-[collapsible=icon]:hidden"
                      title={`Remove ${item.label}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Personalize</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <DashboardCustomization />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-4 py-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-1">
            <Command className="h-3 w-3" />
            <span>+ B to toggle</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
