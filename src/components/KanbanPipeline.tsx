import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

interface CandidateCard {
  id: string;
  applicant_id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  match_score?: number;
  stage_name: string;
  ranking?: number;
  notes?: string;
  summary?: string;
  skills?: string[];
}

interface PipelineStage {
  id: string;
  stage_name: string;
  position_order: number;
  candidates: CandidateCard[];
}

interface KanbanPipelineProps {
  jobId: string;
  jobTitle: string;
}

export const KanbanPipeline: React.FC<KanbanPipelineProps> = ({ jobId, jobTitle }) => {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedCard, setDraggedCard] = useState<{
    stageId: string;
    cardId: string;
  } | null>(null);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/candidates`);
        if (!res.ok) {
          throw new Error('Failed to fetch candidates');
        }

        const candidates: CandidateCard[] = await res.json();

        // Group candidates by stage
        const stageMap: Record<string, PipelineStage> = {};

        // Initialize with default stages
        const defaultStages = ['Screening', 'Interview', 'Offer', 'Hired'];
        defaultStages.forEach((stageName, idx) => {
          const stageId = `stage-${idx}`;
          stageMap[stageId] = {
            id: stageId,
            stage_name: stageName,
            position_order: idx + 1,
            candidates: [],
          };
        });

        // Add candidates to stages
        candidates.forEach((candidate) => {
          const stageKey = Object.keys(stageMap).find(
            (key) => stageMap[key].stage_name === candidate.stage_name
          );
          if (stageKey) {
            stageMap[stageKey].candidates.push(candidate);
          }
        });

        setStages(Object.values(stageMap).sort((a, b) => a.position_order - b.position_order));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchCandidates();
    }
  }, [jobId]);

  const handleDragStart = (stageId: string, cardId: string) => {
    setDraggedCard({ stageId, cardId });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetStageId: string) => {
    if (!draggedCard) return;

    const sourceStageIdx = stages.findIndex((s) => s.id === draggedCard.stageId);
    const targetStageIdx = stages.findIndex((s) => s.id === targetStageId);

    if (sourceStageIdx === -1 || targetStageIdx === -1) return;

    // Update local state optimistically
    const updatedStages = [...stages];
    const [movedCard] = updatedStages[sourceStageIdx].candidates.splice(
      updatedStages[sourceStageIdx].candidates.findIndex(
        (c) => c.id === draggedCard.cardId
      ),
      1
    );

    if (movedCard) {
      updatedStages[targetStageIdx].candidates.push(movedCard);
      setStages(updatedStages);
    }

    // Call API to update
    try {
      await fetch(`/api/jobs/${jobId}/candidates`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: draggedCard.cardId,
          currentStageId: targetStageId,
        }),
      });
    } catch (err) {
      console.error('Failed to update candidate stage:', err);
      // Could revert changes here if needed
    }

    setDraggedCard(null);
  };

  if (loading) {
    return <div className="p-6">Loading pipeline...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{jobTitle}</h2>
        <p className="text-muted-foreground">
          Total candidates: {stages.reduce((sum, stage) => sum + stage.candidates.length, 0)}
        </p>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="flex-none w-80 bg-secondary rounded-lg p-4"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage.id)}
            >
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">{stage.stage_name}</h3>
                  <Badge variant="outline">{stage.candidates.length}</Badge>
                </div>
              </div>

              <div className="space-y-3 min-h-96">
                {stage.candidates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No candidates</p>
                  </div>
                ) : (
                  stage.candidates.map((candidate) => (
                    <Card
                      key={candidate.id}
                      className="cursor-move hover:shadow-lg transition-shadow bg-background"
                      draggable
                      onDragStart={() => handleDragStart(stage.id, candidate.id)}
                    >
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div>
                            <p className="font-medium">
                              {candidate.first_name} {candidate.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{candidate.email}</p>
                          </div>

                          {candidate.match_score && (
                            <div>
                              <div className="flex justify-between items-center">
                                <p className="text-xs text-muted-foreground">Match Score</p>
                                <Badge variant="secondary">{candidate.match_score}%</Badge>
                              </div>
                            </div>
                          )}

                          {candidate.summary && (
                            <p className="text-xs line-clamp-2 text-muted-foreground">
                              {candidate.summary}
                            </p>
                          )}

                          {candidate.skills && candidate.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {candidate.skills.slice(0, 2).map((skill, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {candidate.skills.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{candidate.skills.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}

                          <Button variant="ghost" size="sm" className="w-full text-xs">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KanbanPipeline;
