import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import { TaskCountContext } from './TaskCountContext';
import {
  BookmarkCheck,
  Brain,
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
  FolderOpen,
  Gift,
  Repeat2,
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
import {
  getDashboardModeConfig,
  normalizePlan,
  resolveDashboardMode,
  resolveEntitlement,
  type DashboardNavIconKey,
  type DashboardSidebarToolKey,
  type FeatureKey,
} from '@/config/planPermissions';
import { useSubscription } from '@/hooks/useSubscription';
import { useDashboardNavigation } from '@/contexts/DashboardNavigationContext';

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
  showSavedMentors: boolean;
  showDecisionSprint: boolean;
  showCoreMetrics: boolean;
  showAiGoals: boolean;
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
  showSavedMentors: true,
  showDecisionSprint: true,
  showCoreMetrics: true,
  showAiGoals: true,
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
  toolKey: DashboardSidebarToolKey;
  path: string;
  label: string;
  icon: LucideIcon;
  prefKey: keyof SidebarPreferences;
  featureKey?: FeatureKey;
}

export const DashboardSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setOpenMobile, isMobile } = useSidebar();
  const { user } = useAuth();
  const { subscriptionData } = useSubscription();
  const incompleteTaskCount = useContext(TaskCountContext);
  const { activeSection, setActiveSection } = useDashboardNavigation();
  const [sidebarPreferences, setSidebarPreferences] = useState<SidebarPreferences>(defaultSidebarPreferences);
  const currentPlan = normalizePlan(subscriptionData?.subscription_tier);
  const modeConfig = getDashboardModeConfig(resolveDashboardMode(currentPlan));

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

  const navIconMap: Record<DashboardNavIconKey, LucideIcon> = {
    home: Home,
    folder_open: FolderOpen,
    bookmark_check: BookmarkCheck,
    calendar: Calendar,
    check_square: CheckSquare,
    target: Target,
    clipboard_list: ClipboardList,
    bar_chart_3: BarChart3,
    gift: Gift,
    repeat_2: Repeat2,
  };

  const dashboardNavItems = modeConfig.navItems.map((item) => ({
    ...item,
    icon: navIconMap[item.iconKey],
  }));

  const buildNavTarget = (path: string, sectionId?: string) => {
    if (!sectionId) {
      return path;
    }

    return `${path}#${sectionId}`;
  };

  const isNavItemActive = (path: string, sectionId?: string) => {
    if (sectionId) {
      return location.pathname === path && (location.hash === `#${sectionId}` || activeSection === sectionId);
    }

    if (path === '/dashboard') {
      return location.pathname === path && !activeSection;
    }

    return location.pathname === path;
  };

  const handleDashboardSectionClick = (sectionId: string, path: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    handleNavClick();
    setActiveSection(sectionId);

    if (location.pathname !== path) {
      navigate(buildNavTarget(path, sectionId));
      return;
    }

    const targetElement = document.getElementById(sectionId);
    if (!targetElement) {
      navigate(buildNavTarget(path, sectionId));
      return;
    }

    window.history.replaceState(null, '', buildNavTarget(path, sectionId));
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toolsItems: ToolItem[] = [
    { toolKey: 'icp_builder', path: '/icp-builder', label: 'ICP Builder', icon: Target, prefKey: 'showICPBuilder', featureKey: 'icp_builder' },
    { toolKey: 'waitlist_maker', path: '/waitlist', label: 'Waitlist Maker', icon: ClipboardList, prefKey: 'showWaitlistMaker', featureKey: 'waitlist_maker' },
    { toolKey: 'pmf_lab', path: '/pmf-lab', label: 'PMF Lab', icon: FlaskConical, prefKey: 'showPMFLab', featureKey: 'pmf_lab' },
    { toolKey: 'mvp_builder', path: '/mvp-builder', label: 'MVP Builder', icon: Rocket, prefKey: 'showMVPBuilder', featureKey: 'mvp_builder' },
    { toolKey: 'tech_stack', path: '/tech-stack', label: 'Tech Stack', icon: Zap, prefKey: 'showTechStack', featureKey: 'tech_stack' },
    { toolKey: 'gtm_strategist', path: '/go-to-market', label: 'GTM Strategist', icon: LineChart, prefKey: 'showGTMStrategist', featureKey: 'gtm_strategist' },
    { toolKey: 'directories', path: '/directories', label: 'Directories', icon: Filter, prefKey: 'showDirectories', featureKey: 'directories' },
    { toolKey: 'saved_mentors', path: '/saved-mentors', label: 'Saved Mentors', icon: BookmarkCheck, prefKey: 'showSavedMentors' },
    { toolKey: 'decision_sprint', path: '/decision-sprint', label: 'Decision Sprint', icon: ClipboardList, prefKey: 'showDecisionSprint' },
    { toolKey: 'core_metrics', path: '/core-metrics', label: 'Core Metrics', icon: BarChart3, prefKey: 'showCoreMetrics' },
    { toolKey: 'ai_goals', path: '/ai-goals', label: 'AI Goals Planner', icon: Brain, prefKey: 'showAiGoals' },
    { toolKey: 'find_mentor', path: '/community', label: 'Find a Mentor', icon: Users, prefKey: 'showFindMentor' },
    { toolKey: 'find_cofounder', path: '/community/co-founders', label: 'Find a Co-Founder', icon: Handshake, prefKey: 'showFindCoFounder' },
    { toolKey: 'find_angel', path: '/community/angels', label: 'Find your Angel', icon: Sparkles, prefKey: 'showFindAngel', featureKey: 'angels_community' },
    { toolKey: 'vc_search', path: '/vc-search', label: 'VC Search', icon: FileSearch, prefKey: 'showVCSearch', featureKey: 'vc_search_browse' },
    { toolKey: 'accelerator_hunt', path: '/accelerator-hunt', label: 'Accelerator Hunt', icon: Rocket, prefKey: 'showAcceleratorHunt', featureKey: 'accelerator_browse' },
    { toolKey: 'email_templates', path: '/email-templates', label: 'Email Templates', icon: Mail, prefKey: 'showEmailTemplates', featureKey: 'email_templates' },
    { toolKey: 'pitch_deck_analyzer', path: '/pitch-deck-analyzer', label: 'Pitch Deck Analyzer', icon: BarChart3, prefKey: 'showPitchDeckAnalyzer', featureKey: 'pitch_deck_analyzer' },
    { toolKey: 'insighta_test', path: '/insighta-test', label: 'Insighta Test', icon: Sparkles, prefKey: 'showInsightaTest', featureKey: 'insighta_test' },
    { toolKey: 'newspaper', path: '/newspaper', label: 'Newspaper', icon: BookOpen, prefKey: 'showNewspaper', featureKey: 'newspaper' },
    { toolKey: 'prompt_library', path: '/prompt-library', label: 'Prompt Library', icon: Library, prefKey: 'showPromptLibrary', featureKey: 'prompt_library' },
  ].filter((item) => {
    if (!modeConfig.visibleTools.includes(item.toolKey)) {
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

      <SidebarContent className="dashboard-sidebar-scroll pr-2">
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dashboardNavItems.map((item) => {
                const isTasksItem = item.path === '/dashboard/tasks';
                const target = buildNavTarget(item.path, item.sectionId);
                return (
                  <SidebarMenuItem key={target}>
                    <SidebarMenuButton asChild isActive={isNavItemActive(item.path, item.sectionId)} tooltip={item.label}>
                      <Link
                        to={target}
                        onClick={item.sectionId ? handleDashboardSectionClick(item.sectionId, item.path) : handleNavClick}
                        className="flex items-center gap-2 w-full"
                      >
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
