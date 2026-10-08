'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Monitor,
  BookOpen,
  Users,
  Package,
  Boxes,
  Settings,
  ClipboardList,
  ShieldCheck,
  SlidersHorizontal,
  BarChart2,
  Building2,
  ChevronsUpDown,
  Check,
  Loader2,
  User,
  LogOut,
  Palette,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { BrandMark } from '@/components/BrandMark';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  SidebarSeparator,
} from '@/components/ui/sidebar';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
  target?: string;
}

const Community_URL = process.env.NEXT_PUBLIC_COMUNITY_URL;
const Documentation_URL = process.env.NEXT_PUBLIC_DOCUMENTATION_URL;
const appVersion = process.env.NEXT_PUBLIC_APP_VERSION;

// Primary workspace navigation.
const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Machines', href: '/machines', icon: Monitor },
  // EPM: Access Requests disabled — re-enable later
  // { title: 'Access Requests', href: '/access-requests', icon: ShieldCheck, roles: ['super_admin', 'company_admin'] },
  { title: 'Applications', href: '/applications', icon: Boxes, roles: ['super_admin', 'company_admin'] },
  { title: 'Policies', href: '/policies', icon: ShieldCheck, roles: ['super_admin', 'company_admin'] },
  { title: 'Packages', href: '/packages', icon: Package },
  { title: 'Organisation Management', href: '/user-management', icon: Settings, roles: ['super_admin', 'company_admin'] },
  { title: 'Audit & Reporting', href: '/audit-logs', icon: ClipboardList, roles: ['super_admin', 'company_admin'] },
  { title: 'Settings', href: '/settings', icon: SlidersHorizontal, roles: ['super_admin', 'company_admin'] },
  { title: 'Metrics', href: '/metrics', icon: BarChart2, roles: ['super_admin'] },
];

// External resources — pinned above the profile section, out of the way of the workspace nav.
const resourceNavItems: NavItem[] = [
  { title: 'Documentation', href: Documentation_URL ?? '#', icon: BookOpen, target: '_blank' },
  { title: 'Support', href: Community_URL ?? '#', icon: Users, target: '_blank' },
];

const themeColors = [
  { name: 'Cyan', value: 'cyan', color: 'bg-[hsl(173,80%,40%)]' },
  { name: 'Green', value: 'green', color: 'bg-[hsl(142,76%,36%)]' },
  { name: 'Purple', value: 'purple', color: 'bg-[hsl(262,83%,58%)]' },
  { name: 'Orange', value: 'orange', color: 'bg-[hsl(25,95%,53%)]' },
  { name: 'Blue', value: 'blue', color: 'bg-[hsl(217,91%,60%)]' },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout, availableTenants, switchTenant } = useAuth();
  const { mode, themeColor, setMode, setThemeColor } = useTheme();
  const [switchingTenant, setSwitchingTenant] = useState<string | null>(null);
  const { toast } = useToast();

  const visibleMainItems = useMemo(() => {
    if (!user) return mainNavItems.filter((item) => !item.roles);
    return mainNavItems.filter((item) => !item.roles || item.roles.includes(user.role));
  }, [user]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  const handleSwitchTenant = async (tenantId: string) => {
    if (tenantId === user?.tenant_id) return;
    setSwitchingTenant(tenantId);
    try {
      await switchTenant(tenantId);
      toast({ title: 'Workspace switched', description: 'You are now in a different workspace.' });
    } catch (error) {
      toast({
        title: 'Switch failed',
        description: error instanceof Error ? error.message : 'Failed to switch workspace.',
        variant: 'destructive',
      });
    } finally {
      setSwitchingTenant(null);
    }
  };

  const showTenantSwitcher = availableTenants.length > 1;

  return (
    <Sidebar collapsible="none" className="sticky top-0 h-svh border-r border-sidebar-border">
      <SidebarHeader>
        {/* Logo */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <BrandMark
                  iconBoxClassName="aspect-square size-8 rounded-lg bg-primary text-primary-foreground"
                  iconClassName="size-4"
                  logoSizeClassName="size-8"
                  textClassName="font-bold tracking-tight"
                  textWrapperClassName="grid flex-1 text-left text-2xl leading-tight"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Workspace switcher */}
        {showTenantSwitcher && (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    variant="outline"
                    className="data-[state=open]:bg-sidebar-accent"
                  >
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Building2 className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user?.tenant_name}</span>
                      <span className="truncate text-xs text-sidebar-foreground/60">Workspace</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/50" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="bottom" className="w-64">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Switch Workspace
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableTenants.map((tenant) => {
                    const isCurrent = tenant.tenant_id === user?.tenant_id;
                    const isSwitching = switchingTenant === tenant.tenant_id;

                    return (
                      <DropdownMenuItem
                        key={tenant.tenant_id}
                        onClick={() => handleSwitchTenant(tenant.tenant_id)}
                        disabled={isSwitching || switchingTenant !== null}
                        className={cn('flex items-center gap-3 cursor-pointer py-2.5', isCurrent && 'bg-primary/5')}
                      >
                        <div
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                            isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                          )}
                        >
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn('truncate text-sm font-medium', isCurrent && 'text-primary')}>
                            {tenant.tenant_name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">@{tenant.username}</p>
                        </div>
                        {isSwitching ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                        ) : isCurrent ? (
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                        ) : null}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMainItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                    className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:hover:bg-primary/15 data-[active=true]:hover:text-primary"
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter>
        {/* Resources — pinned above the profile section, at the very bottom of the nav */}
        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {resourceNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <a href={item.href} target={item.target} rel="noopener noreferrer">
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="mb-1" />
        {/* Profile */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" variant="outline" className="data-[state=open]:bg-sidebar-accent">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-sm font-medium text-primary">
                      {user ? getInitials(user.username) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user?.username}</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">{user?.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{user?.username}</span>
                    <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Palette className="mr-2 h-4 w-4" />
                    Theme Colour
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {themeColors.map((color) => (
                      <DropdownMenuItem
                        key={color.value}
                        onClick={() => setThemeColor(color.value)}
                        className="flex cursor-pointer items-center gap-3"
                      >
                        <div className={cn('h-4 w-4 rounded-full', color.color)} />
                        <span>{color.name}</span>
                        {themeColor === color.value && <Check className="ml-auto h-4 w-4 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Sun className="mr-2 h-4 w-4" />
                    Colour Mode
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
                      <DropdownMenuRadioItem value="light" className="cursor-pointer gap-2">
                        <Sun className="h-4 w-4" />
                        Light
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="dark" className="cursor-pointer gap-2">
                        <Moon className="h-4 w-4" />
                        Dark
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="system" className="cursor-pointer gap-2">
                        <Laptop className="h-4 w-4" />
                        System
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>

        {appVersion && (
          <>
            <SidebarSeparator className="my-1" />
            <p className="px-2 text-center text-[11px] text-sidebar-foreground/40">v{appVersion}</p>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
