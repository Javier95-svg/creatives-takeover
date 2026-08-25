import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useContext, useMemo } from 'react';
import { TaskCountContext } from './TaskCountContext';
import {
  BookmarkCheck,
  Target,
  Calendar,
  CheckSquare,
  Command,
  ClipboardList,
  Home,
  BarChart3,
  Trash2,
  FolderOpen,
  Gift,
  Repeat2,
  Settings,
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
  SidebarMenuSkeleton,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getActivationPreferenceState } from '@/lib/activationState';
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
import { useDashboardJourney } from '@/contexts/DashboardDataContext';
import { useDashboardBootstrapProfile } from '@/contexts/DashboardBootstrapContext';
import { cn } from '@/lib/utils';
import { groupToolItemsByStage } from '@/lib/sidebarJourneyGroups';
import { shouldReduceOnboardingNav } from '@/lib/onboardingPath';
import type { ActivationIntent } from '@/lib/retentionSystem';
import { getDashboardTool } from '@/config/dashboardToolRegistry';
import type { BizMapStage } from '@/lib/bizmapStages';

// Task 4: during the forced-onboarding window, collapse the sidebar to the
// essentials — dashboard home, the daily loop, and the two onboarding paths.
const ONBOARDING_NAV_PATHS = new Set(['/dashboard', '/dashboard/tasks', '/dashboard/routine']);
const DEFAULT_ONBOARDING_TOOL_KEYS = new Set<DashboardSidebarToolKey>(['waitlist_maker']);
const UNIVERSAL_MORE_TOOL_KEYS = new Set<DashboardSidebarToolKey>([
  'saved_mentors',
  'decision_sprint',
  'core_metrics',
  'ai_goals',
]);

const TOOL_KEY_BY_ACTIVATION_INTENT: Partial<Record<ActivationIntent, DashboardSidebarToolKey>> = {
  build_demo: 'waitlist_maker',
  run_icp: 'icp_builder',
  start_validation: 'decision_sprint',
  find_mentor: 'find_mentor',
  save_mentor: 'find_mentor',
  send_message: 'find_mentor',
  book_call: 'find_mentor',
  unlock_pitch_deck: 'pitch_deck_analyzer',
  unlock_tech_stack: 'tech_stack',
  unlock_insighta: 'insighta_test',
};

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

// Everything the sidebar needs from `profiles` before it can decide which
// entries belong to this account. Cached per user id for the lifetime of the
// tab so route changes (which remount the sidebar) repaint the settled panel
// instead of the pre-fetch guess.
interface SidebarPersonalization {
  preferences: SidebarPreferences;
  reduceOnboardingNav: boolean;
  activationIntent: ActivationIntent | null;
}

const sidebarPersonalizationCache = new Map<string, SidebarPersonalization>();

// Rows rendered while personalization/plan are still unknown. Matches the
// settled panel's shape (a nav block plus tool groups) so resolving swaps
// content in without shifting the surrounding layout.
const SIDEBAR_SKELETON_ROWS = 5;

interface ToolItem {
  toolKey: DashboardSidebarToolKey;
  path: string;
  label: string;
  icon: LucideIcon;
  prefKey: keyof SidebarPreferences;
  featureKey?: FeatureKey;
}

function registryToolItem(
  toolKey: DashboardSidebarToolKey,
  prefKey: keyof SidebarPreferences,
  featureKey?: FeatureKey,
): ToolItem {
  const definition = getDashboardTool(toolKey);
  return {
    toolKey,
    path: definition.route,
    label: definition.label,
    icon: definition.icon,
    prefKey,
    featureKey,
  };
}

export const DashboardSidebarContent = ({ currentStage }: { currentStage: BizMapStage | null }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setOpenMobile, isMobile } = useSidebar();
  const { user, loading: authLoading } = useAuth();
  const bootstrapProfile = useDashboardBootstrapProfile();
  // Tiers are pricing data the sidebar never reads; skipping them keeps
  // `subscriptionLoading` tied to the plan lookup that actually gates entries.
  const { subscriptionData, loading: subscriptionLoading } = useSubscription({ fetchTiers: false });
  const incompleteTaskCount = useContext(TaskCountContext);
  const { activeSection, setActiveSection } = useDashboardNavigation();
  const userId = user?.id ?? null;
  const [loadedPersonalization, setLoadedPersonalization] = useState<
    { userId: string; value: SidebarPersonalization } | null
  >(null);
  const currentPlan = normalizePlan(subscriptionData?.subscription_tier);
  const modeConfig = getDashboardModeConfig(resolveDashboardMode(currentPlan));

  // Read the cache during render (not in an effect) so a remount paints the
  // known-good panel on the first frame rather than one frame later.
  const bootstrapPersonalization = useMemo(() => user && bootstrapProfile
    ? ({
        preferences: bootstrapProfile.sidebar_preferences
          ? normalizePreferences(bootstrapProfile.sidebar_preferences as LegacySidebarPreferences)
          : defaultSidebarPreferences,
        reduceOnboardingNav: shouldReduceOnboardingNav(
          { onboarding_completed: bootstrapProfile.onboarding_completed, user_preferences: bootstrapProfile.user_preferences },
          user.created_at,
        ),
        activationIntent: getActivationPreferenceState(bootstrapProfile.user_preferences).activationIntent,
      } satisfies SidebarPersonalization)
    : null, [bootstrapProfile, user]);
  const personalization =
    (loadedPersonalization && loadedPersonalization.userId === userId ? loadedPersonalization.value : null)
    ?? (userId ? sidebarPersonalizationCache.get(userId) ?? null : null)
    ?? bootstrapPersonalization;

  const sidebarPreferences = personalization?.preferences ?? defaultSidebarPreferences;
  const reduceOnboardingNav = personalization?.reduceOnboardingNav ?? false;
  const activationIntent = personalization?.activationIntent ?? null;

  // Until both the profile row and the plan are known, every entry we could
  // render is a guess — `defaultSidebarPreferences` shows tools the stored
  // preferences hide, and an unresolved plan reads as the lowest tier. Render
  // placeholders instead of a panel that visibly rewrites itself.
  const signedOut = !authLoading && !userId;
  const isPersonalized = personalization !== null || signedOut;
  const isPlanKnown = signedOut || (!authLoading && !subscriptionLoading);
  const entriesResolved = isPersonalized && isPlanKnown;

  useEffect(() => {
    if (!user || !bootstrapPersonalization) return;
    let isCancelled = false;
    const activeUserId = user.id;

    if (!isCancelled) {
      sidebarPersonalizationCache.set(activeUserId, bootstrapPersonalization);
      setLoadedPersonalization({ userId: activeUserId, value: bootstrapPersonalization });
    }

    return () => {
      isCancelled = true;
    };
  }, [bootstrapPersonalization, user]);

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

  const dashboardNavItems = modeConfig.navItems
    .filter((item) => !reduceOnboardingNav || ONBOARDING_NAV_PATHS.has(item.path))
    .map((item) => ({
      ...item,
      icon: navIconMap[item.iconKey],
    }));
  const onboardingToolKeys = new Set(DEFAULT_ONBOARDING_TOOL_KEYS);
  const selectedActivationTool = activationIntent ? TOOL_KEY_BY_ACTIVATION_INTENT[activationIntent] : null;
  if (selectedActivationTool) {
    onboardingToolKeys.add(selectedActivationTool);
  }

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
    registryToolItem('icp_builder', 'showICPBuilder', 'icp_builder'),
    registryToolItem('waitlist_maker', 'showWaitlistMaker', 'waitlist_maker'),
    registryToolItem('pmf_lab', 'showPMFLab', 'pmf_lab'),
    registryToolItem('mvp_builder', 'showMVPBuilder', 'mvp_builder'),
    registryToolItem('tech_stack', 'showTechStack', 'tech_stack'),
    registryToolItem('gtm_strategist', 'showGTMStrategist', 'gtm_strategist'),
    registryToolItem('directories', 'showDirectories', 'directories'),
    registryToolItem('saved_mentors', 'showSavedMentors'),
    registryToolItem('decision_sprint', 'showDecisionSprint'),
    registryToolItem('core_metrics', 'showCoreMetrics'),
    registryToolItem('ai_goals', 'showAiGoals'),
    registryToolItem('find_mentor', 'showFindMentor'),
    registryToolItem('find_cofounder', 'showFindCoFounder'),
    registryToolItem('find_angel', 'showFindAngel', 'angels_community'),
    registryToolItem('vc_search', 'showVCSearch', 'vc_search_browse'),
    registryToolItem('accelerator_hunt', 'showAcceleratorHunt', 'accelerator_browse'),
    registryToolItem('email_templates', 'showEmailTemplates', 'email_templates'),
    registryToolItem('pitch_deck_analyzer', 'showPitchDeckAnalyzer', 'pitch_deck_analyzer'),
    registryToolItem('insighta_test', 'showInsightaTest', 'insighta_test'),
    registryToolItem('newspaper', 'showNewspaper', 'newspaper'),
    registryToolItem('prompt_library', 'showPromptLibrary', 'prompt_library'),
  ].filter((item) => {
    const isUniversalMoreTool = UNIVERSAL_MORE_TOOL_KEYS.has(item.toolKey);

    if (reduceOnboardingNav && !onboardingToolKeys.has(item.toolKey)) {
      return false;
    }

    if (!isUniversalMoreTool && !modeConfig.visibleTools.includes(item.toolKey)) {
      return false;
    }

    if (!isUniversalMoreTool && !sidebarPreferences[item.prefKey]) {
      return false;
    }

    if (!item.featureKey) {
      return true;
    }

    return resolveEntitlement(item.featureKey, currentPlan).isVisible;
  });

  const removeTool = async (prefKey: keyof SidebarPreferences) => {
    const updatedPreferences: SidebarPreferences = { ...sidebarPreferences, [prefKey]: false };
    const updatedPersonalization: SidebarPersonalization = {
      preferences: updatedPreferences,
      reduceOnboardingNav,
      activationIntent,
    };

    if (userId) {
      sidebarPersonalizationCache.set(userId, updatedPersonalization);
      setLoadedPersonalization({ userId, value: updatedPersonalization });
    }

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
        {!entriesResolved ? (
          <SidebarGroup>
            <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu aria-busy="true">
                {Array.from({ length: SIDEBAR_SKELETON_ROWS }, (_, index) => (
                  <SidebarMenuItem key={`sidebar-loading-${index}`}>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {dashboardNavItems.map((item) => {
                    const isTasksItem = item.path === '/dashboard/tasks';
                    const target = buildNavTarget(item.path, item.sectionId);
                    return (
                      <SidebarMenuItem key={target}>
                        <SidebarMenuButton
                          asChild
                          isActive={isNavItemActive(item.path, item.sectionId)}
                          tooltip={item.description ? `${item.label}: ${item.description}` : item.label}
                        >
                          <Link
                            to={target}
                            onClick={item.sectionId ? handleDashboardSectionClick(item.sectionId, item.path) : handleNavClick}
                            className="flex w-full items-center gap-2"
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                              <span className="block text-sm leading-tight">{item.label}</span>
                            </span>
                            {isTasksItem && incompleteTaskCount > 0 && (
                              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-caption font-semibold text-primary-foreground group-data-[collapsible=icon]:hidden">
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

            {groupToolItemsByStage(toolsItems).map((group) => (
              <SidebarGroup key={group.id}>
                <SidebarGroupLabel className={cn(group.id === currentStage && 'text-primary')}>
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.path}>
                        <div className="flex items-center w-full group/tool">
                          <SidebarMenuButton asChild tooltip={item.label} className="flex-1">
                            <Link to={item.path} onClick={handleNavClick}>
                              <item.icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                          {!UNIVERSAL_MORE_TOOL_KEYS.has(item.toolKey) ? (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                void removeTool(item.prefKey);
                              }}
                              className="opacity-0 group-hover/tool:opacity-100 p-1 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all mr-1 group-data-[collapsible=icon]:hidden"
                              title={`Remove ${item.label}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          ) : null}
                        </div>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Personalize</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === '/dashboard/settings'}
                  tooltip="Settings"
                >
                  <Link to="/dashboard/settings" onClick={handleNavClick}>
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
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

export const DashboardSidebar = () => {
  const { journey, isLoading } = useDashboardJourney();
  const currentStage = journey?.currentStage as BizMapStage | undefined;
  // Keep the group neutral until the snapshot is settled so the sidebar does
  // not flash the first stage and then correct itself.
  return <DashboardSidebarContent currentStage={isLoading || !currentStage ? null : currentStage} />;
};
