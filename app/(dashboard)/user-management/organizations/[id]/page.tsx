'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb } from '@/components/ui/page-breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Building2,
  Users,
  Server,
  Shield,
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { organizationsAPI, type Organization, type User, type Group } from '@/lib/user-management-api';
import { machinesAPI, type Machine } from '@/lib/machines-api';

interface OrgDetailsState {
  users: User[];
  groups: Group[];
  machines: Machine[];
  total_users: number;
  total_groups: number;
  total_machines: number;
}

const ITEMS_PER_PAGE = 10;

export default function OrganizationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const orgId = params.id as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [stats, setStats] = useState<OrgDetailsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');

  // Search states
  const [userSearch, setUserSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [machineSearch, setMachineSearch] = useState('');

  // Pagination states
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [groupsPage, setGroupsPage] = useState(1);
  const [groupsTotal, setGroupsTotal] = useState(0);
  const [groupsTotalPages, setGroupsTotalPages] = useState(1);
  const [machinesPage, setMachinesPage] = useState(1);

  // Check if user is super admin
  const isSuperAdmin = user?.role === 'super_admin';

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const loadOrgUsers = async (page: number) => {
    if (!token || !orgId) return;
    try {
      const data = await organizationsAPI.getOrganizationUsers(token, orgId, { page, limit: ITEMS_PER_PAGE });
      setStats(prev => prev ? { ...prev, users: data.users || [], total_users: data.total ?? 0 } : prev);
      setUsersTotal(data.total ?? 0);
      setUsersTotalPages(data.total_pages ?? 1);
      setUsersPage(page);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load users', variant: 'destructive' });
    }
  };

  const loadOrgGroups = async (page: number) => {
    if (!token || !orgId) return;
    try {
      const data = await organizationsAPI.getOrganizationGroups(token, orgId, { page, limit: ITEMS_PER_PAGE });
      setStats(prev => prev ? { ...prev, groups: data.groups || [], total_groups: data.total ?? 0 } : prev);
      setGroupsTotal(data.total ?? 0);
      setGroupsTotalPages(data.total_pages ?? 1);
      setGroupsPage(page);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load groups', variant: 'destructive' });
    }
  };

  useEffect(() => {
    const fetchOrganizationDetails = async () => {
      if (!token || !orgId) return;

      setLoading(true);
      try {
        // Fetch organization data
        const orgData = await organizationsAPI.getOrganization(token, orgId);
        setOrganization(orgData);

        // Fetch users, groups, and machines in parallel
        // Pass organization's tenant_id to get machines from that specific tenant
        const orgTenantId = orgData.keycloak_realm;
        const [usersData, groupsData, machinesData] = await Promise.all([
          organizationsAPI.getOrganizationUsers(token, orgId, { page: 1, limit: ITEMS_PER_PAGE }).catch(() => ({ users: [], total: 0, page: 1, limit: ITEMS_PER_PAGE, total_pages: 1 })),
          organizationsAPI.getOrganizationGroups(token, orgId, { page: 1, limit: ITEMS_PER_PAGE }).catch(() => ({ groups: [], total: 0, page: 1, limit: ITEMS_PER_PAGE, total_pages: 1 })),
          machinesAPI.listMachines(token, { tenantId: orgTenantId }).catch(() => ({ machines: [] }))
        ]);

        setUsersTotal(usersData.total ?? 0);
        setUsersTotalPages(usersData.total_pages ?? 1);
        setGroupsTotal(groupsData.total ?? 0);
        setGroupsTotalPages(groupsData.total_pages ?? 1);

        // Machines are already filtered by backend using tenant_id query parameter
        const orgMachines = machinesData.machines || [];

        setStats({
          users: usersData.users || [],
          groups: groupsData.groups || [],
          machines: orgMachines,
          total_users: usersData.total || 0,
          total_groups: groupsData.total || 0,
          total_machines: orgMachines.length,
        });
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load organization details',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizationDetails();
  }, [token, orgId, toast]);

  // Filtered and paginated data
  const filteredUsers = useMemo(() => {
    if (!stats?.users) return [];
    return stats.users.filter(u =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [stats?.users, userSearch]);

  const filteredGroups = useMemo(() => {
    if (!stats?.groups) return [];
    return stats.groups.filter(g =>
      g.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
      g.description?.toLowerCase().includes(groupSearch.toLowerCase())
    );
  }, [stats?.groups, groupSearch]);

  const filteredMachines = useMemo(() => {
    if (!stats?.machines) return [];
    return stats.machines.filter(m =>
      m.name.toLowerCase().includes(machineSearch.toLowerCase()) ||
      m.ip_address?.toLowerCase().includes(machineSearch.toLowerCase())
    );
  }, [stats?.machines, machineSearch]);

  // Paginated data
  const paginatedMachines = useMemo(() => {
    const start = (machinesPage - 1) * ITEMS_PER_PAGE;
    return filteredMachines.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMachines, machinesPage]);

  // Total pages
  const machinesTotalPages = Math.ceil(filteredMachines.length / ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!organization || !stats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Organization Not Found</h1>
          <p className="text-muted-foreground mb-4">The organization you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/user-management')}>
            Back to Organisation Management
          </Button>
        </div>
      </div>
    );
  }

  const PaginationControls = ({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumb
        items={[
          { label: 'Organisation Management', href: '/user-management' },
          { label: 'Organizations', href: '/user-management?tab=organizations' },
          { label: organization.display_name }
        ]}
        className="mb-6"
      />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push('/user-management')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{organization.display_name}</h1>
            {organization.enabled ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="w-3 h-3" />
                Disabled
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Organization ID: <code className="text-sm bg-muted px-2 py-1 rounded">{organization.name}</code>
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_users}</div>
            <p className="text-xs text-muted-foreground">
              {stats.users?.filter(u => u.enabled).length || 0} active
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_groups}</div>
            <p className="text-xs text-muted-foreground">
              Organizing user access
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Machines</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_machines}</div>
            <p className="text-xs text-muted-foreground">
              {stats.machines?.filter(m => m.status === 'online').length || 0} online
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Organization Info */}
      <Card className="glass-card mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Organization Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Organization Name</p>
              <p className="font-medium">{organization.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Display Name</p>
              <p className="font-medium">{organization.display_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Keycloak Realm</p>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {organization.keycloak_realm}
              </code>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Created</p>
              <p className="font-medium">
                {new Date(organization.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Users, Groups, Machines */}
      <Card className="glass-card">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="users" className="gap-2">
                <Users className="w-4 h-4" />
                Users ({filteredUsers.length})
              </TabsTrigger>
              <TabsTrigger value="groups" className="gap-2">
                <Shield className="w-4 h-4" />
                Groups ({filteredGroups.length})
              </TabsTrigger>
              <TabsTrigger value="machines" className="gap-2">
                <Server className="w-4 h-4" />
                Machines ({filteredMachines.length})
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent>
            {/* Users Tab */}
            <TabsContent value="users" className="mt-0">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUsersPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users found
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Portal Role</TableHead>
                        <TableHead>Machine Role</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'super_admin' ? 'default' : 'secondary'}>
                              {user.role.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.machine_role === 'allow_sudo' ? 'default' : 'outline'}>
                              {user.machine_role.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.enabled ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <XCircle className="w-3 h-3" />
                                Disabled
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationControls
                    currentPage={usersPage}
                    totalPages={usersTotalPages}
                    onPageChange={loadOrgUsers}
                  />
                </>
              )}
            </TabsContent>

            {/* Groups Tab */}
            <TabsContent value="groups" className="mt-0">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search groups..."
                    value={groupSearch}
                    onChange={(e) => {
                      setGroupSearch(e.target.value);
                      setGroupsPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              {filteredGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No groups found
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Machines</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGroups.map((group) => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">{group.name}</TableCell>
                          <TableCell>{group.description || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{group.member_count || group.member_ids?.length || 0} users</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{group.machine_count || group.machine_ids?.length || 0} machines</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationControls
                    currentPage={groupsPage}
                    totalPages={groupsTotalPages}
                    onPageChange={loadOrgGroups}
                  />
                </>
              )}
            </TabsContent>

            {/* Machines Tab */}
            <TabsContent value="machines" className="mt-0">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search machines..."
                    value={machineSearch}
                    onChange={(e) => {
                      setMachineSearch(e.target.value);
                      setMachinesPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              {paginatedMachines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No machines found
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Machine Name</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>OS</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMachines.map((machine) => (
                        <TableRow key={machine.id}>
                          <TableCell className="font-medium">{machine.name}</TableCell>
                          <TableCell>{machine.ip_address || '-'}</TableCell>
                          <TableCell>
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                              {machine.os || '-'}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant={machine.status === 'online' ? 'default' : 'secondary'}>
                              {machine.status === 'online' ? (
                                <CheckCircle className="w-3 h-3 mr-1" />
                              ) : (
                                <XCircle className="w-3 h-3 mr-1" />
                              )}
                              {machine.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationControls
                    currentPage={machinesPage}
                    totalPages={machinesTotalPages}
                    onPageChange={setMachinesPage}
                  />
                </>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
