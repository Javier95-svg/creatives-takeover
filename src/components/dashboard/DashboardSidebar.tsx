import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Target,
  Calendar,
  CheckSquare,
  Sparkles,
  Users,
  BookOpen,
  MessageSquare,
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
import { DashboardMode } from './modes/ModeToggle';
import { DashboardCustomization } from './DashboardCustomization';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface DashboardSidebarProps {
  dashboardMode: DashboardMode;
}

interface SidebarPreferences {
  showBizMapAI: boolean;
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
  showBizMapAI: true,
  showICPBuilder: true,
  showWaitlistMaker: true,
  showPMFLab: false,
  showMVPBuilder: false,
  showTechStack: false,
  showGTMStrategist: false,
  showDirectories: false,
  showFindMentor: true,
  showFindCoFounder: true,
  showFindAngel: true,
  showVCSearch: false,
  showAcceleratorHunt: false,
  showEmailTemplates: false,
  showPitchDeckAnalyzer: false,
  showInsightaTest: false,
  showNewspaper: true,
  showPromptLibrary: false,
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
}

export const DashboardSidebar = ({ dashboardMode: _dashboardMode }: DashboardSidebarProps) => {
  const location = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();
  const { user } = useAuth();
  const [sidebarPreferences, setSidebarPreferences] = useState<SidebarPreferences>(defaultSidebarPreferences);

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

  const dashboardNavItems = [
    { path: '/dashboard', label: 'Home', icon: Home },
    { path: '/focus-funnel', label: 'Focus Funnel', icon: Target },
    { path: '/decision-sprint', label: 'Decision Sprint', icon: ClipboardList },
    { path: '/core-metrics', label: 'Core Metrics', icon: BarChart3 },
    { path: '/weekly-mission', label: 'Weekly Mission', icon: Calendar },
    { path: '/tasks', label: 'Your Tasks', icon: CheckSquare },
  ];

  const toolsItems: ToolItem[] = [
    sidebarPreferences.showBizMapAI && { path: '/bizmap-ai/chat', label: 'BizMap AI', icon: MessageSquare, prefKey: 'showBizMapAI' },
    sidebarPreferences.showICPBuilder && { path: '/icp-builder', label: 'ICP Builder', icon: Target, prefKey: 'showICPBuilder' },
    sidebarPreferences.showWaitlistMaker && { path: '/waitlist', label: 'Waitlist Maker', icon: ClipboardList, prefKey: 'showWaitlistMaker' },
    sidebarPreferences.showPMFLab && { path: '/pmf-lab', label: 'PMF Lab', icon: FlaskConical, prefKey: 'showPMFLab' },
    sidebarPreferences.showMVPBuilder && { path: '/mvp-builder', label: 'MVP Builder', icon: Rocket, prefKey: 'showMVPBuilder' },
    sidebarPreferences.showTechStack && { path: '/tech-stack', label: 'Tech Stack', icon: Zap, prefKey: 'showTechStack' },
    sidebarPreferences.showGTMStrategist && { path: '/go-to-market', label: 'GTM Strategist', icon: LineChart, prefKey: 'showGTMStrategist' },
    sidebarPreferences.showDirectories && { path: '/directories', label: 'Directories', icon: Filter, prefKey: 'showDirectories' },
    sidebarPreferences.showFindMentor && { path: '/community', label: 'Find a Mentor', icon: Users, prefKey: 'showFindMentor' },
    sidebarPreferences.showFindCoFounder && { path: '/community/co-founders', label: 'Find a Co-Founder', icon: Handshake, prefKey: 'showFindCoFounder' },
    sidebarPreferences.showFindAngel && { path: '/community/angels', label: 'Find your Angel', icon: Sparkles, prefKey: 'showFindAngel' },
    sidebarPreferences.showVCSearch && { path: '/insighta/vc-search', label: 'VC Search', icon: FileSearch, prefKey: 'showVCSearch' },
    sidebarPreferences.showAcceleratorHunt && { path: '/insighta/accelerator-hunt', label: 'Accelerator Hunt', icon: Rocket, prefKey: 'showAcceleratorHunt' },
    sidebarPreferences.showEmailTemplates && { path: '/insighta/email-templates', label: 'Email Templates', icon: Mail, prefKey: 'showEmailTemplates' },
    sidebarPreferences.showPitchDeckAnalyzer && { path: '/insighta/pitch-deck-analyzer', label: 'Pitch Deck Analyzer', icon: BarChart3, prefKey: 'showPitchDeckAnalyzer' },
    sidebarPreferences.showInsightaTest && { path: '/insighta/test', label: 'Insighta Test', icon: Sparkles, prefKey: 'showInsightaTest' },
    sidebarPreferences.showNewspaper && { path: '/newspaper', label: 'Newspaper', icon: BookOpen, prefKey: 'showNewspaper' },
    sidebarPreferences.showPromptLibrary && { path: '/prompt-library', label: 'Prompt Library', icon: Library, prefKey: 'showPromptLibrary' },
  ].filter(Boolean) as ToolItem[];

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
              {dashboardNavItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.path} tooltip={item.label}>
                    <Link to={item.path} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
