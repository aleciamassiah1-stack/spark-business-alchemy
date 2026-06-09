import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  TrendingUp,
  Briefcase,
  Shield,
  Scroll,
  Users,
  Link2,
  Bell,
  Settings,
  LifeBuoy,
  Sparkles,
} from "lucide-react";
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
} from "@/components/ui/sidebar";

type NavItem = { to: string; label: string; icon: typeof Home; exact?: boolean };

const primary: NavItem[] = [
  { to: "/", label: "Overview", icon: Home, exact: true },
  { to: "/portfolio", label: "Portfolio", icon: TrendingUp },
  { to: "/business", label: "Business", icon: Briefcase },
  { to: "/protect", label: "Protect", icon: Shield },
  { to: "/legacy", label: "Legacy", icon: Scroll },
  { to: "/family", label: "Family", icon: Users },
  { to: "/connections", label: "Connections", icon: Link2 },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

const secondary: NavItem[] = [
  { to: "/pricing", label: "Pricing", icon: Sparkles },
  { to: "/support", label: "Support", icon: LifeBuoy },
  { to: "/more", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <Sidebar collapsible="icon" className="border-r border-white/[0.06]">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2.5 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-violet glow-violet">
            <span className="font-serif text-lg leading-none text-foreground">Æ</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-serif text-base leading-tight text-foreground">Æther</p>
              <p className="label-mono !text-[9px]">Wealth</p>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {primary.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to, item.exact)} tooltip={item.label}>
                    <Link to={item.to} className="flex items-center gap-2">
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
          {!collapsed && <SidebarGroupLabel>Account</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {secondary.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.label}>
                    <Link to={item.to} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {!collapsed && (
          <p className="px-2 pb-1 text-[10px] text-muted-foreground">
            © {new Date().getFullYear()} Æther Wealth
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
