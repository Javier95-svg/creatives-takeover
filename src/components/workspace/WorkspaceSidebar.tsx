import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  BookOpen,
  ChevronDown,
  CircleDollarSign,
  Clapperboard,
  Compass,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Telescope,
  Users,
} from "lucide-react";
import ctLogo from "@/assets/ct-logo-polished-borders.webp";
import { cn } from "@/lib/utils";
import { enterWorkspaceRoute, WORKSPACE_ROUTES } from "@/lib/workspaceNavigation";





import { WORKSPACE_ROUTE_DESCRIPTIONS, WORKSPACE_ROUTE_ICONS, WORKSPACE_SECTION_SLOGANS, WORKSPACE_TOOL_STAGES } from '@/lib/workspaceRouteDetails';

export type ProductGuideConcept = "founder-guide" | "command-center" | "guided-journey";

type Icon = ComponentType<{ className?: string }>;

const NAV_ITEMS: Array<{ label: string; icon: Icon }> = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "BizMap", icon: Compass },
  { label: "Network", icon: Users },
  { label: "Insighta", icon: Telescope },
  { label: "Content", icon: Clapperboard },
  { label: "Resources", icon: BookOpen },
  { label: "Pricing", icon: CircleDollarSign },
];

const NAV_TOOLS: Record<string, string[]> = {
  Dashboard: ["Overview", "Tasks", "Routine", "Files", "Referrals"],
  BizMap: ["ICP Builder", "Demo Studio", "PMF Lab", "MVP Builder", "GTM Strategist", "Directories"],
  Network: ["Find a Mentor", "Find a Co-Founder", "Find your Angel", "Marketplace"],
  Insighta: ["Traction Engine", "VC Search", "Pitch Deck Analyzer", "Insighta Test"],
  Content: ["Newspaper", "Podcast"],
  Resources: ["Accelerator Hunt", "Tech Stack Builder"],
};

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <a href="/" aria-label="Creatives Takeover home" onClick={(event) => {
      if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        enterWorkspaceRoute('/');
      }
    }} className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <img className="animate-logo-breathing nav-logo-hover h-10 w-10 shrink-0 object-contain motion-reduce:animate-none" src={ctLogo} alt="Creatives Takeover" />
      {!collapsed && <div className="min-w-0">
        <p className="truncate font-space-grotesk text-sm font-semibold text-foreground">Creatives Takeover</p>
        <p className="text-xs text-foreground">Think. Test. Ship.</p>
      </div>}
    </a>
  );
}

export function WorkspaceSidebar({ navigateTo = enterWorkspaceRoute, currentPath, initialCollapsed = false, profileHref = '/account', account, avatar, updates, mobile = false }: {
  navigateTo?: (path: string) => void;
  currentPath?: string;
  initialCollapsed?: boolean;
  profileHref?: string;
  account: { username: string; plan: string };
  avatar: ReactNode;
  updates?: ReactNode;
  mobile?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(mobile ? false : initialCollapsed);
  useEffect(() => { if (currentPath && currentPath !== '/' && !mobile) setCollapsed(true); }, [currentPath, mobile]);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const path = currentPath ?? window.location.pathname;
  const selected = path === '/' ? '' : Object.keys(WORKSPACE_ROUTES).sort((a, b) => WORKSPACE_ROUTES[b].length - WORKSPACE_ROUTES[a].length).find(name => path === WORKSPACE_ROUTES[name] || path.startsWith(WORKSPACE_ROUTES[name] + '/')) ?? '';
  const openRoute = (label: string) => {
    const path = WORKSPACE_ROUTES[label];
    if (!path) return;
    if (!mobile) setCollapsed(true);
    navigateTo(path);
  };

  const handleSectionClick = (label: string) => {
    if (!NAV_TOOLS[label]) { openRoute(label); return; }
    if (collapsed) {
      setCollapsed(false);
      setOpenSection(label);
      return;
    }
    setOpenSection((current) => current === label ? null : label);
  };

  return (
    <aside className={cn(
      "relative flex h-dvh shrink-0 flex-col border-r border-border/70 bg-card pt-5 pb-3 text-foreground transition-all duration-300 motion-reduce:transition-none",
      mobile ? "h-full w-full px-4" : collapsed ? "w-20 px-3" : "w-72 px-4",
    )}>
      <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between px-2")}>
        <Brand collapsed={collapsed} />
        {!mobile && <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-controls="workspace-navigation"
          onClick={() => setCollapsed((value) => !value)}
          className={cn("no-touch-target flex h-7 w-7 !min-h-0 !min-w-0 shrink-0 items-center justify-center rounded-md p-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", collapsed && "absolute right-[-0.5px] top-[4.25rem] z-30 translate-x-1/2 bg-card")}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>}
      </div>

      <nav id="workspace-navigation" aria-label="Product navigation" className="mt-9 min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map(({ label, icon: NavIcon }) => (
          <div key={label}>
            {label === 'Pricing' ? <a href={WORKSPACE_ROUTES.Pricing} aria-label="Pricing" aria-current={selected === 'Pricing' ? 'page' : undefined}
              title={collapsed ? 'Pricing' : undefined}
              onClick={event => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); openRoute('Pricing'); } }}
              className={cn('flex w-full items-center gap-3 rounded-button px-3 py-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none', collapsed && 'justify-center', selected === 'Pricing' && 'bg-primary/15')}>
              <NavIcon className="h-5 w-5 shrink-0" />{!collapsed && <span>Pricing</span>}
            </a> : <button
              type="button"
              aria-label={label}
              aria-expanded={NAV_TOOLS[label] ? !collapsed && openSection === label : undefined}
              aria-controls={NAV_TOOLS[label] ? `workspace-tools-${label}` : undefined}
              title={collapsed ? label : undefined}
              onClick={() => handleSectionClick(label)}
              className={cn(
                "flex w-full items-center gap-3 rounded-button px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none",
                collapsed ? "justify-center" : "justify-start",
                (selected === label || NAV_TOOLS[label]?.includes(selected))
                  ? "bg-primary/15 text-foreground"
                  : "text-foreground",
              )}
            >
              <NavIcon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
              {!collapsed && NAV_TOOLS[label] && (
                <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", openSection === label && "rotate-180")} />
              )}
            </button>}

            {!collapsed && openSection === label && NAV_TOOLS[label] && (
              <div id={`workspace-tools-${label}`} role="group" aria-label={`${label} tools`} className="mb-2 ml-5 mt-1 space-y-0.5 border-l border-border/70 pl-4">
                <p className="mb-2 border-b border-border/60 px-2 py-3 text-xs font-semibold leading-5 text-foreground">{WORKSPACE_SECTION_SLOGANS[label]}</p>
                {NAV_TOOLS[label].map((tool, index) => {
                  const ToolIcon = WORKSPACE_ROUTE_ICONS[tool];
                  return (
                  <div key={tool}>
                  {(label === 'BizMap' || label === 'Insighta') && WORKSPACE_TOOL_STAGES[tool] &&
                    (index === 0 || WORKSPACE_TOOL_STAGES[tool] !== WORKSPACE_TOOL_STAGES[NAV_TOOLS[label][index - 1]]) &&
                    <p className="px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-primary">{WORKSPACE_TOOL_STAGES[tool]}</p>}
                  <a
                    href={WORKSPACE_ROUTES[tool]}
                    aria-label={tool}
                    aria-current={selected === tool ? 'page' : undefined}
                    onClick={event => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); openRoute(tool); } }}
                    className={cn(
                      "group flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none",
                      selected === tool ? "bg-primary/10 text-foreground" : "text-foreground",
                    )}
                  >
                    <ToolIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-medium leading-5">{tool}</span>
                      <span className="mt-0.5 block text-xs font-normal leading-4 text-foreground group-hover:text-accent-foreground group-focus-visible:text-accent-foreground">{WORKSPACE_ROUTE_DESCRIPTIONS[tool]}</span>
                    </span>
                  </a>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="mt-auto shrink-0 space-y-1">
        {!collapsed && updates}

        <div className="border-t border-border/60 pt-2">
          <div title={`${account.username} · ${account.plan}`} className={cn("flex items-center gap-3 rounded-xl py-2 transition-colors hover:bg-muted/70", collapsed ? "justify-center" : "px-2")}>
            <a href={profileHref} aria-label="View my profile" title="View my profile" onClick={(event) => {
              if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                event.preventDefault();
                setCollapsed(true);
                navigateTo(profileHref);
              }
            }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card">{avatar}</a>
            {!collapsed && <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-5 text-foreground">{account.username}</p>
              <p className="text-xs leading-5 text-foreground">{account.plan}</p>
            </div>}
            {!collapsed && <a href={WORKSPACE_ROUTES.Settings} onClick={(event) => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); openRoute("Settings"); } }} aria-label="Account settings" title="Account settings" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Settings className="h-5 w-5" /></a>}
          </div>
        </div>
      </div>
    </aside>
  );
}
