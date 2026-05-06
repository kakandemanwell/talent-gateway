import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import KanbanPipeline from '@/components/KanbanPipeline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  description: string;
  location?: string;
}

const PipelinePage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { orgMember } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId || !orgMember?.org_id) {
        setError('Job ID or Organization not found');
        setLoading(false);
        return;
      }

      try {
        // Fetch job from org
        const res = await fetch(`/api/orgs/${orgMember.org_id}/jobs`);
        if (!res.ok) {
          throw new Error('Failed to fetch jobs');
        }

        const jobs: Job[] = await res.json();
        const foundJob = jobs.find((j) => j.id === jobId);

        if (!foundJob) {
          setError('Job not found');
        } else {
          setJob(foundJob);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [jobId, orgMember?.org_id]);

  if (loading) {
    return <div className="p-6">Loading pipeline...</div>;
  }

  if (error || !job) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle size={20} />
          <span>{error || 'Job not found'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Hiring Pipeline</h1>
          <p className="text-muted-foreground mt-2">Manage candidates through your recruitment pipeline</p>
        </div>
        <Button variant="outline">Bulk Actions</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Applicants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kanban Pipeline</CardTitle>
          <CardDescription>Drag cards between stages to move candidates</CardDescription>
        </CardHeader>
        <CardContent>
          {jobId && <KanbanPipeline jobId={jobId} jobTitle={job.title} />}
        </CardContent>
      </Card>
    </div>
  );
};

export default PipelinePage;
