'use client';

import { useEffect, useState, useCallback } from 'react';
import { Monitor, Activity, AlertCircle, Server, Clock, ArrowUpRight, Terminal } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/page-breadcrumb';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { dashboardApi, DashboardStats, RecentMachine, RecentActivity } from '@/lib/dashboard-api';

const Community_URL = process.env.NEXT_PUBLIC_COMUNITY_URL;
const Documentation_URL = process.env.NEXT_PUBLIC_DOCUMENTATION_URL;

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentMachines, setRecentMachines] = useState<RecentMachine[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      // Check if we're on client side
      if (typeof window === 'undefined') {
        console.log('Running on server, skipping data load');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('vsay-token');
      if (!token) {
        console.error('No token found in localStorage');
        setLoading(false);
        return;
      }

      console.log('Loading dashboard data with token...');
      const [statsData, machinesData, activitiesData] = await Promise.all([
        dashboardApi.getStats(token),
        dashboardApi.getRecentMachines(token),
        dashboardApi.getRecentActivity(token),
      ]);

      console.log('Dashboard data loaded successfully:', {
        totalMachines: statsData.total_machines,
        machinesCount: machinesData.machines?.length,
        activitiesCount: activitiesData.activities?.length
      });

      setStats(statsData);
      setRecentMachines(machinesData.machines || []);
      setRecentActivities(activitiesData.activities || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = diff / 1000;

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <Breadcrumb items={[{ label: 'Dashboard' }]} className="mb-6" />
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">Overview of your server infrastructure</p>
        </div>
        <div className="text-center py-12 text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const uptimePercent = stats ? ((stats.active_machines / (stats.total_machines || 1)) * 100).toFixed(1) : '0';

  return (
    <div className="animate-fade-in">
      <Breadcrumb items={[{ label: 'Dashboard' }]} className="mb-6" />

      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Overview of your server infrastructure</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Machines"
          value={stats?.total_machines.toString() || '0'}
          change={stats ? stats.avg_cpu.toFixed(1) + '% avg CPU' : 'N/A'}
          changeType="neutral"
          icon={Monitor}
        />
        <StatCard
          title="Active Machines"
          value={stats?.active_machines.toString() || '0'}
          change={uptimePercent + '% uptime'}
          changeType="positive"
          icon={Activity}
        />
        <StatCard
          title="Inactive Machines"
          value={stats?.inactive_machines.toString() || '0'}
          change={stats?.inactive_machines === 0 ? 'All online' : 'Needs attention'}
          changeType={stats?.inactive_machines === 0 ? 'positive' : 'negative'}
          icon={AlertCircle}
          iconColor={stats?.inactive_machines === 0 ? 'text-success' : 'text-destructive'}
        />
        <StatCard
          title="Total Sessions"
          value={stats?.total_sessions.toString() || '0'}
          change={stats ? stats.avg_memory.toFixed(1) + '% avg memory' : 'N/A'}
          changeType="neutral"
          icon={Server}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Recent Machines</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/machines" className="text-primary">
                View all <ArrowUpRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMachines.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No machines found
                </div>
              ) : (
                recentMachines.map((machine) => (
                  <Link
                    key={machine.id}
                    href={'/machines/details/' + machine.agent_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Terminal className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{machine.name}</p>
                        <p className="text-sm text-muted-foreground">{machine.os}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground hidden sm:block">
                        {formatTimeAgo(machine.last_active)}
                      </span>
                      <span
                        className={'w-2 h-2 rounded-full ' + (machine.status === 'online' ? 'bg-success' : 'bg-destructive')}
                      />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
            <Clock className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No recent activity
                </div>
              ) : (
                recentActivities.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className={'w-2 h-2 mt-2 rounded-full flex-shrink-0 ' + (activity.success ? 'bg-success' : 'bg-destructive')}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {activity.command || 'Unknown command'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {activity.machine_name}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className={'text-xs ' + (activity.success ? 'text-success' : 'text-destructive')}>
                          {activity.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card mt-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/machines">
                <Monitor className="w-5 h-5" />
                <span className="text-sm">View Machines</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/profile">
                <Activity className="w-5 h-5" />
                <span className="text-sm">Profile</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href={Community_URL || 'https://community.webxterm.me'} target="_blank" rel="noopener noreferrer">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">Report Issue</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href={Documentation_URL || 'https://docs.webxterm.me'} target="_blank" rel="noopener noreferrer">
                <Server className="w-5 h-5" />
                <span className="text-sm">View Docs</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
