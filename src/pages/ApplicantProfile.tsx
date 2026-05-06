import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';

interface ApplicantProfile {
  id?: string;
  user_id?: string;
  summary?: string;
  skills?: string[];
  portfolio_links?: string[];
  preferred_job_type?: string;
  preferred_locations?: string[];
}

const ApplicantProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ApplicantProfile>({
    summary: '',
    skills: [],
    portfolio_links: [],
    preferred_job_type: '',
    preferred_locations: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [skillInput, setSkillInput] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [locationInput, setLocationInput] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/users/${user?.id}/profile`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${user?.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile saved successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save profile' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (skillInput.trim()) {
      setProfile({
        ...profile,
        skills: [...(profile.skills || []), skillInput.trim()],
      });
      setSkillInput('');
    }
  };

  const removeSkill = (index: number) => {
    setProfile({
      ...profile,
      skills: profile.skills?.filter((_, i) => i !== index) || [],
    });
  };

  const addLink = () => {
    if (linkInput.trim()) {
      setProfile({
        ...profile,
        portfolio_links: [...(profile.portfolio_links || []), linkInput.trim()],
      });
      setLinkInput('');
    }
  };

  const removeLink = (index: number) => {
    setProfile({
      ...profile,
      portfolio_links: profile.portfolio_links?.filter((_, i) => i !== index) || [],
    });
  };

  const addLocation = () => {
    if (locationInput.trim()) {
      setProfile({
        ...profile,
        preferred_locations: [...(profile.preferred_locations || []), locationInput.trim()],
      });
      setLocationInput('');
    }
  };

  const removeLocation = (index: number) => {
    setProfile({
      ...profile,
      preferred_locations: profile.preferred_locations?.filter((_, i) => i !== index) || [],
    });
  };

  if (loading) {
    return <div className="p-6">Loading profile...</div>;
  }

  return (
    <div className="space-y-6 mb-8">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground mt-2">Complete your profile to unlock better job matches</p>
      </div>

      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Professional Information</CardTitle>
          <CardDescription>About you and your career preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Professional Summary</label>
            <Textarea
              placeholder="Tell us about yourself, your experience, and career goals..."
              value={profile.summary || ''}
              onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
              rows={5}
            />
          </div>

          {/* Skills */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Skills</label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a skill (e.g., Python, React)"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
              />
              <Button onClick={addSkill} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.skills?.map((skill, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-full"
                >
                  <span className="text-sm">{skill}</span>
                  <button
                    onClick={() => removeSkill(idx)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Portfolio Links */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Portfolio Links</label>
            <div className="flex gap-2">
              <Input
                placeholder="Add portfolio, GitHub, LinkedIn URL..."
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addLink()}
              />
              <Button onClick={addLink} variant="outline">
                Add
              </Button>
            </div>
            <div className="space-y-2 mt-2">
              {profile.portfolio_links?.map((link, idx) => (
                <div key={idx} className="flex items-center justify-between bg-secondary p-2 rounded">
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">
                    {link}
                  </a>
                  <button
                    onClick={() => removeLink(idx)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Job Type Preference */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Preferred Job Type</label>
            <Input
              placeholder="e.g., Full-time, Remote, Contract"
              value={profile.preferred_job_type || ''}
              onChange={(e) => setProfile({ ...profile, preferred_job_type: e.target.value })}
            />
          </div>

          {/* Preferred Locations */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Preferred Locations</label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a location (e.g., New York, Remote)"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addLocation()}
              />
              <Button onClick={addLocation} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.preferred_locations?.map((location, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-full"
                >
                  <span className="text-sm">{location}</span>
                  <button
                    onClick={() => removeLocation(idx)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/applicant')}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApplicantProfile;
