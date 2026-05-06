import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserType, OrgRole } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: UserType;
  requiredOrgRole?: OrgRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredUserType,
  requiredOrgRole,
}) => {
  const { isAuthenticated, loading, user, orgMember } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <CardContent>
            <p className="text-center">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (requiredUserType && user?.user_type !== requiredUserType) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <CardContent>
            <p className="text-center text-red-600">
              Access denied. This page requires {requiredUserType} role.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requiredOrgRole && (!orgMember || orgMember.role !== requiredOrgRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <CardContent>
            <p className="text-center text-red-600">
              Access denied. This page requires {requiredOrgRole} organization role.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
