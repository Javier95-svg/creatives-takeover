import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Target,
  Calendar,
  Briefcase,
  CheckSquare,
  Sparkles,
  CalendarDays,
  TrendingUp,
  Users,
  BookOpen,
  MessageSquare,
  Settings,
  Command,
  Zap,
  Rocket,
  DollarSign,
  FlaskConical,
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
import { useScrollToSection } from '@/hooks/useScrollToSection';
import { useDashboardNavigation } from '@/contexts/DashboardNavigationContext';
import { DashboardMode } from './modes/ModeToggle';
import { DashboardCustomization } from './DashboardCustomization';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface DashboardSidebarProps {
  dashboardMode: DashboardMode;
}

export const DashboardSidebar = ({ dashboardMode }: DashboardSidebarProps) => {
  const scrollToSection = useScrollToSection();
  const { activeSection } = useDashboardNavigation();
  const { setOpenMobile, isMobile } = useSidebar();
  const { user } = useAuth();
  const [sidebarPreferences, setSidebarPreferences] = useState({
    showBizMapAI: true,
    showPMFLab: false,
    showTechStack: false,
    showAcceleratorHunt: false,
    showInsighta: false,
    showCommunity: true,
    showRead: true,
  });

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('sidebar_preferences')
        .eq('id', user.id)
        .single();

      if (data?.sidebar_preferences) {
        setSidebarPreferences({ ...sidebarPreferences, ...data.sidebar_preferences });
      }
    };

    loadPreferences();
  }, [user]);

  const handleSectionClick = (sectionId: string) => {
    scrollToSection(sectionId);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Define navigation items based on dashboard mode
  const getDashboardViewItems = () => {
    const baseItems = [
      { id: 'dashboard-focus', label: "Today's Focus", icon: Target },
    ];

    if (dashboardMode === 'dashboard' || dashboardMode === 'control-center') {
      baseItems.push(
        { id: 'weekly-mission', label: 'Weekly Mission', icon: Calendar },
        { id: 'monthly-revenue', label: 'Monthly Revenue', icon: TrendingUp },
        { id: 'core-metrics', label: 'Core Metrics', icon: Target },
        { id: 'active-projects', label: 'Active Projects', icon: Briefcase },
        { id: 'quick-wins', label: 'Quick Wins', icon: Sparkles },
        { id: 'your-tasks', label: 'Your Tasks', icon: CheckSquare }
      );
    }

    if (dashboardMode === 'control-center') {
      baseItems.push(
        { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
        { id: 'business-health', label: 'Business Health', icon: TrendingUp },
        { id: 'calendar-view', label: 'Calendar', icon: CalendarDays },
        { id: 'daily-priorities', label: 'Daily Priorities', icon: Target },
        { id: 'progress-timeline', label: 'Progress', icon: TrendingUp },
        { id: 'key-milestones', label: 'Milestones', icon: Target },
        { id: 'revenue-hub', label: 'Budget', icon: TrendingUp },
        { id: 'market-validation', label: 'Market Intel', icon: Target }
      );
    }

    return baseItems;
  };

  // Build tools items based on user preferences
  const toolsItems = [
    sidebarPreferences.showBizMapAI && { path: '/bizmap-ai', label: 'BizMap AI', icon: MessageSquare },
    sidebarPreferences.showPMFLab && { path: '/bizmap-ai?mode=pmf-lab', label: 'PMF Lab', icon: FlaskConical },
    sidebarPreferences.showTechStack && { path: '/bizmap-ai?mode=tech-stack', label: 'Tech Stack', icon: Zap },
    sidebarPreferences.showAcceleratorHunt && { path: '/insighta?mode=accelerator', label: 'Accelerator Hunt', icon: Rocket },
    sidebarPreferences.showInsighta && { path: '/insighta', label: 'Investor Match', icon: DollarSign },
    sidebarPreferences.showCommunity && { path: '/community', label: 'Community', icon: Users },
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
        {/* Today's Focus - Quick Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Your Focus</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {getDashboardViewItems().map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleSectionClick(item.id)}
                    isActive={activeSection === item.id}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
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
