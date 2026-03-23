import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import EprcLayout from "./components/EprcLayout";
import Index from "./pages/Index";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<EprcLayout pageTitle="Open Positions"><Jobs /></EprcLayout>} />
          <Route path="/jobs" element={<EprcLayout pageTitle="Open Positions"><Jobs /></EprcLayout>} />
          <Route path="/jobs/:jobId" element={<EprcLayout pageTitle="Vacancies"><JobDetail /></EprcLayout>} />
          <Route path="/apply" element={<EprcLayout pageTitle="Apply Now"><Index /></EprcLayout>} />
          <Route path="/apply/:jobId" element={<EprcLayout pageTitle="Apply Now"><Index /></EprcLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
