import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import EprcLayout from "./components/EprcLayout";
import Index from "./pages/Index";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/auth/Login";
import SignupPage from "./pages/auth/Signup";
import ApplicantDashboard from "./pages/dashboard/ApplicantDashboard";
import RecruiterDashboard from "./pages/dashboard/RecruiterDashboard";
import ApplicantProfile from "./pages/ApplicantProfile";
import PipelinePage from "./pages/Pipeline";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<EprcLayout pageTitle="Open Positions"><Jobs /></EprcLayout>} />
            <Route path="/jobs" element={<EprcLayout pageTitle="Open Positions"><Jobs /></EprcLayout>} />
            <Route path="/jobs/:jobId" element={<EprcLayout pageTitle="Vacancies"><JobDetail /></EprcLayout>} />
            <Route path="/apply" element={<EprcLayout pageTitle="Apply Now"><Index /></EprcLayout>} />
            <Route path="/apply/:jobId" element={<EprcLayout pageTitle="Apply Now"><Index /></EprcLayout>} />

            {/* Auth Routes */}
            <Route path="/auth/login" element={<EprcLayout pageTitle="Login"><LoginPage /></EprcLayout>} />
            <Route path="/auth/signup" element={<EprcLayout pageTitle="Sign Up"><SignupPage /></EprcLayout>} />

            {/* Protected Routes - Applicant */}
            <Route
              path="/dashboard/applicant"
              element={
                <ProtectedRoute requiredUserType="applicant">
                  <EprcLayout pageTitle="My Dashboard"><ApplicantDashboard /></EprcLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute requiredUserType="applicant">
                  <EprcLayout pageTitle="My Profile"><ApplicantProfile /></EprcLayout>
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - Recruiter */}
            <Route
              path="/dashboard/recruiter"
              element={
                <ProtectedRoute requiredUserType="recruiter">
                  <EprcLayout pageTitle="Pipeline"><RecruiterDashboard /></EprcLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pipeline/:jobId"
              element={
                <ProtectedRoute requiredUserType="recruiter">
                  <EprcLayout pageTitle="Pipeline"><PipelinePage /></EprcLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin"
              element={
                <ProtectedRoute requiredUserType="recruiter" requiredOrgRole="org_admin">
                  <EprcLayout pageTitle="Organization Dashboard"><AdminDashboard /></EprcLayout>
                </ProtectedRoute>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
