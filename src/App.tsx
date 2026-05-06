import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RoleProvider } from "@/store/roleStore";

import Landing from "./pages/Landing";
import { Login, Signup } from "./pages/auth/Auth";
import AppShell from "./components/layout/AppShell";

import ApplicantDashboard from "./pages/applicant/Dashboard";
import JobsList from "./pages/applicant/JobsList";
import JobDetail from "./pages/applicant/JobDetail";
import MyApplications from "./pages/applicant/MyApplications";
import ApplicantProfile from "./pages/applicant/Profile";

import OrgDashboard from "./pages/org/Dashboard";
import OrgJobs from "./pages/org/Jobs";
import NewJob from "./pages/org/NewJob";
import Pipeline from "./pages/org/Pipeline";
import PipelineIndex from "./pages/org/PipelineIndex";
import CandidateDetail from "./pages/org/CandidateDetail";
import Team from "./pages/org/Team";
import OrgSettings from "./pages/org/Settings";
import Messaging from "./pages/org/Messaging";

import AdminDashboard from "./pages/admin/Dashboard";
import Organizations from "./pages/admin/Organizations";
import PlatformAnalytics from "./pages/admin/Analytics";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RoleProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<Signup />} />

            {/* Legacy redirects */}
            <Route path="/jobs" element={<Navigate to="/app/applicant/jobs" replace />} />
            <Route path="/jobs/:jobId" element={<LegacyJobRedirect />} />
            <Route path="/apply/:jobId" element={<LegacyApplyRedirect />} />

            <Route path="/app" element={<AppShell />}>
              <Route index element={<Navigate to="/app/org/dashboard" replace />} />

              <Route path="applicant/dashboard" element={<ApplicantDashboard />} />
              <Route path="applicant/jobs" element={<JobsList />} />
              <Route path="applicant/jobs/:jobId" element={<JobDetail />} />
              <Route path="applicant/apply/:jobId" element={<Index />} />
              <Route path="applicant/applications" element={<MyApplications />} />
              <Route path="applicant/profile" element={<ApplicantProfile />} />

              <Route path="org/dashboard" element={<OrgDashboard />} />
              <Route path="org/jobs" element={<OrgJobs />} />
              <Route path="org/jobs/new" element={<NewJob />} />
              <Route path="org/pipeline" element={<PipelineIndex />} />
              <Route path="org/pipeline/:jobId" element={<Pipeline />} />
              <Route path="org/candidates/:id" element={<CandidateDetail />} />
              <Route path="org/team" element={<Team />} />
              <Route path="org/settings" element={<OrgSettings />} />
              <Route path="org/messaging" element={<Messaging />} />

              <Route path="admin/dashboard" element={<AdminDashboard />} />
              <Route path="admin/organizations" element={<Organizations />} />
              <Route path="admin/analytics" element={<PlatformAnalytics />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </RoleProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

import { useParams } from "react-router-dom";
function LegacyJobRedirect() {
  const { jobId } = useParams();
  return <Navigate to={`/app/applicant/jobs/${jobId}`} replace />;
}
function LegacyApplyRedirect() {
  const { jobId } = useParams();
  return <Navigate to={`/app/applicant/apply/${jobId}`} replace />;
}

export default App;
