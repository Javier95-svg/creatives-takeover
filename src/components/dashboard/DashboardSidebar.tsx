import { Link, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import {
  Calendar,
  CheckSquare,
  Command,
  FolderOpen,
  Gift,
  Home,
  Target,
  type LucideIcon,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { getDashboardModeConfig, normalizePlan, resolveDashboardMode, type DashboardNavIconKey } from '@/config/planPermissions';
import { useSubscription } from '@/hooks/useSubscription';
import { TaskCountContext } from './TaskCountContext';

const navIconMap: Record<DashboardNavIconKey, LucideIcon> = {
  home: Home,
  folder_open: FolderOpen,
  bookmark_check: CheckSquare,
  calendar: Calendar,
  check_square: CheckSquare,
  target: Target,
  clipboard_list: CheckSquare,
  bar_chart_3: Target,
  gift: Gift,
};

export const DashboardSidebar = () => {
  const location = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();
  const { subscriptionData } = useSubscription();
  const incompleteTaskCount = useContext(TaskCountContext);
  const currentPlan = normalizePlan(subscriptionData?.subscription_tier);
  const modeConfig = getDashboardModeConfig(resolveDashboardMode(currentPlan));

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-white/10 bg-[#08090d] text-slate-200" variant="sidebar" side="left">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
            <Target className="h-5 w-5" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-semibold text-white">Founder OS</p>
            <p className="text-xs text-slate-500">{modeConfig.label}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {modeConfig.navItems.map((item) => {
                const Icon = navIconMap[item.iconKey];
                const isActive = location.pathname === item.path;
                const isTasksItem = item.path === '/dashboard/tasks';

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className="h-10 rounded-xl text-slate-400 hover:bg-white/[0.06] hover:text-white data-[active=true]:bg-cyan-400/12 data-[active=true]:text-cyan-100"
                    >
                      <Link to={item.path} onClick={handleNavClick} className="flex items-center gap-3">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {isTasksItem && incompleteTaskCount > 0 ? (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-400 px-1.5 text-[10px] font-semibold text-slate-950 group-data-[collapsible=icon]:hidden">
                            {incompleteTaskCount > 99 ? '99+' : incompleteTaskCount}
                          </span>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="mx-3 mb-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs text-slate-500 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2">
            <Command className="h-3.5 w-3.5" />
            <span>One focus per visit</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
