import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserType } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signup, loading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState<UserType>('applicant');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Email and password are required');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }

    try {
      await signup(email, password, userType);
      // Navigate based on user type
      if (userType === 'applicant') {
        navigate('/dashboard/applicant');
      } else {
        navigate('/dashboard/recruiter');
      }
    } catch (err) {
      // Error is already set in auth context
    }
  };

  const displayError = localError || authError;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            Sign up to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          {displayError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3 mb-4 pb-4 border-b">
              <label className="text-sm font-medium">I am a:</label>
              <RadioGroup value={userType} onValueChange={(value) => setUserType(value as UserType)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="applicant" id="applicant" />
                  <label htmlFor="applicant" className="cursor-pointer text-sm">
                    Job Applicant
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recruiter" id="recruiter" />
                  <label htmlFor="recruiter" className="cursor-pointer text-sm">
                    Recruiter / Team Member
                  </label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <a href="/auth/login" className="text-primary hover:underline">
                Sign in
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignupPage;
