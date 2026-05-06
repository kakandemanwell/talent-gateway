import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface PlatformStats {
  total_organizations: number;
  active_organizations: number;
  total_users: number;
  total_jobs: number;
  total_applications: number;
  organizations: Array<{
    id: string;
    name: string;
    status: string;
    plan_type: string;
    created_at: string;
    job_count: number;
    member_count: number;
  }>;
  plan_distribution: Array<{
    plan_type: string;
    count: number;
  }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const SuperAdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // In production, would call /api/super-admin/analytics
        // For now, simulate with placeholder data
        setStats({
          total_organizations: 12,
          active_organizations: 10,
          total_users: 342,
          total_jobs: 45,
          total_applications: 1250,
          organizations: [
            {
              id: '1',
              name: 'Tech Corp Inc',
              status: 'active',
              plan_type: 'professional',
              created_at: '2026-01-15',
              job_count: 8,
              member_count: 12,
            },
            {
              id: '2',
              name: 'Startup Hub',
              status: 'active',
              plan_type: 'starter',
              created_at: '2026-02-20',
              job_count: 3,
              member_count: 5,
            },
            {
              id: '3',
              name: 'Enterprise Solutions',
              status: 'active',
              plan_type: 'enterprise',
              created_at: '2025-11-01',
              job_count: 20,
              member_count: 45,
            },
          ],
          plan_distribution: [
            { plan_type: 'starter', count: 5 },
            { plan_type: 'professional', count: 4 },
            { plan_type: 'enterprise', count: 1 },
          ],
        });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6 mb-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">SaaS Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Platform overview and organization management
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>

      {/* Platform Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_organizations || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.active_organizations || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">across platform</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_jobs || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">open positions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_applications || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">total received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Health Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="font-medium">Healthy</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>Organizations by subscription plan</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats?.plan_distribution || []}
                  dataKey="count"
                  nameKey="plan_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {stats?.plan_distribution?.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organizations Overview</CardTitle>
            <CardDescription>Growth and activity metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={[
                  { month: 'Jan', orgs: 5, users: 45 },
                  { month: 'Feb', orgs: 8, users: 120 },
                  { month: 'Mar', orgs: 10, users: 250 },
                  { month: 'Apr', orgs: 12, users: 342 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="orgs" fill="#3b82f6" />
                <Bar dataKey="users" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Organizations List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>All active organizations on the platform</CardDescription>
            </div>
            <Button size="sm">Manage</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.organizations?.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-semibold">{org.name}</p>
                    <Badge
                      variant={org.status === 'active' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {org.status}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {org.plan_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(org.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-sm font-semibold">{org.job_count}</p>
                    <p className="text-xs text-muted-foreground">Jobs</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{org.member_count}</p>
                    <p className="text-xs text-muted-foreground">Members</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              Approve Pending Orgs
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Manage Billing
            </Button>
            <Button variant="outline" className="w-full justify-start">
              System Settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              Usage Report
            </Button>
            <Button variant="outline" className="w-full justify-start">
              User Growth
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Revenue Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <p className="font-semibold text-green-600">No critical alerts</p>
              <p className="text-xs text-muted-foreground mt-1">
                All systems healthy. Last check: now
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
