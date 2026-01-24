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

export const DashboardSidebar = ({ dashboardMode: _dashboardMode }: DashboardSidebarProps) => {
  const location = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();
  const { user } = useAuth();
  const defaultSidebarPreferences = {
    showBizMapAI: true,
    showPMFLab: false,
    showPromptLibrary: false,
    showTechStack: false,
    showInsightaTest: false,
    showVCSearch: false,
    showEmailTemplates: false,
    showPitchDeckAnalyzer: false,
    showCommunity: true,
    showRead: true,
  };
  const [sidebarPreferences, setSidebarPreferences] = useState(defaultSidebarPreferences);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('sidebar_preferences')
        .eq('id', user.id)
        .single();

      if (data?.sidebar_preferences) {
        setSidebarPreferences({ ...defaultSidebarPreferences, ...data.sidebar_preferences });
      }
    };

    loadPreferences();
  }, [user]);

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Route-based navigation items
  const dashboardNavItems = [
    { path: '/dashboard', label: 'Home', icon: Home },
    { path: '/focus-funnel', label: 'Focus Funnel', icon: Target },
    { path: '/core-metrics', label: 'Core Metrics', icon: BarChart3 },
    { path: '/weekly-mission', label: 'Weekly Mission', icon: Calendar },
    { path: '/tasks', label: 'Your Tasks', icon: CheckSquare },
  ];

  // Build tools items based on user preferences
  const toolsItems = [
    sidebarPreferences.showBizMapAI && { path: '/bizmap-ai', label: 'BizMap AI Chatbot', icon: MessageSquare },
    sidebarPreferences.showPMFLab && { path: '/bizmap-ai/pmf-lab', label: 'PMF Lab', icon: FlaskConical },
    sidebarPreferences.showPromptLibrary && { path: '/prompt-library', label: 'Prompt Library', icon: Library },
    sidebarPreferences.showTechStack && { path: '/bizmap-ai/tech-stack', label: 'Tech Stack Builder', icon: Zap },
    sidebarPreferences.showVCSearch && { path: '/insighta/vc-search', label: 'VC Search', icon: FileSearch },
    sidebarPreferences.showEmailTemplates && { path: '/insighta/email-templates', label: 'Email Templates', icon: Mail },
    sidebarPreferences.showPitchDeckAnalyzer && { path: '/insighta/pitch-deck-analyzer', label: 'Pitch Deck Analyzer', icon: ClipboardList },
    sidebarPreferences.showInsightaTest && { path: '/insighta/test', label: 'Insighta Test', icon: Sparkles },
    sidebarPreferences.showCommunity && { path: '/community', label: 'Find a Mentor', icon: Users },
    sidebarPreferences.showRead && { path: '/stories', label: 'Read', icon: BookOpen },
  ].filter(Boolean) as { path: string; label: string; icon: any }[];

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
        {/* Dashboard Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dashboardNavItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.path}
                    tooltip={item.label}
                  >
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

        {/* Tools & Support */}
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <Link to={item.path}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Customize */}
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
