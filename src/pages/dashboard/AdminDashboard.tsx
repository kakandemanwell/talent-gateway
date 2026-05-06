import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsData {
  jobs: {
    total_jobs: number;
    open_jobs: number;
    closed_jobs: number;
  };
  applications: {
    total_applications: number;
    new_applications: number;
    reviewed_applications: number;
    rejected_applications: number;
  };
  pipeline: {
    total_in_pipeline: number;
    avg_match_score: number;
    high_quality_candidates: number;
  };
  stage_distribution: Array<{
    stage_name: string;
    count: number;
  }>;
}

const AdminDashboard: React.FC = () => {
  const { user, orgMember, logout } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!orgMember?.org_id) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/orgs/${orgMember.org_id}/analytics`);
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [orgMember?.org_id]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Organization Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage your organization and track hiring metrics
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.jobs.open_jobs || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              of {analytics?.jobs.total_jobs || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.applications.total_applications || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.applications.new_applications || 0} new
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.pipeline.total_in_pipeline || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active candidates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Match Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.pipeline.avg_match_score
                ? Math.round(analytics.pipeline.avg_match_score)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.pipeline.high_quality_candidates || 0} high quality
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Distribution Chart */}
      {analytics?.stage_distribution && (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Distribution</CardTitle>
            <CardDescription>Candidates by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.stage_distribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage_name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Team Management & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/jobs/create')}
              >
                Create New Job
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/team-management')}
              >
                Manage Team Members
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/org-settings')}
              >
                Organization Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Organization</p>
                <p className="font-medium capitalize">{orgMember?.role || 'Admin'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-sm break-all">{user?.email}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
