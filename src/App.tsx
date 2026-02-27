import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

// Public Pages
import Index from "./pages/Index";
import FindArtisan from "./pages/FindArtisan";
import BecomeArtisan from "./pages/BecomeArtisan";
import NotFound from "./pages/NotFound";
import Signup from "./pages/Signup";
import Login from "./pages/Login";

// User Dashboards
import CustomerDashboard from "./pages/CustomerDashboard";
import ArtisanDashboard from "./pages/ArtisanDashboard";

// Admin Pages
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/admin/Dashboard";
import ClientSubmissions from "./pages/admin/ClientSubmissions";
import ArtisanSubmissions from "./pages/admin/ArtisanSubmissions";
import Categories from "./pages/admin/Categories";
import FormBuilder from "./pages/admin/FormBuilder";
import Settings from "./pages/admin/Settings";
import AdminJobs from "./pages/admin/Jobs";
import AdminPayments from "./pages/admin/Payments";
import ArtisanPerformance from "./pages/admin/ArtisanPerformance";
import Disputes from "./pages/admin/Disputes";
import RequestService from "./pages/RequestService";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/find-artisan" element={<FindArtisan />} />
            <Route path="/become-artisan" element={<BecomeArtisan />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            
            {/* User Dashboards */}
            <Route path="/dashboard" element={<CustomerDashboard />} />
            <Route path="/request-service" element={<RequestService />} />
            <Route path="/artisan/dashboard" element={<ArtisanDashboard />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/clients" element={<ClientSubmissions />} />
            <Route path="/admin/clients/:status" element={<ClientSubmissions />} />
            <Route path="/admin/artisans" element={<ArtisanSubmissions />} />
            <Route path="/admin/artisans/:status" element={<ArtisanSubmissions />} />
            <Route path="/admin/categories" element={<Categories />} />
            <Route path="/admin/forms" element={<FormBuilder />} />
            <Route path="/admin/jobs" element={<AdminJobs />} />
            <Route path="/admin/jobs/:status" element={<AdminJobs />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/performance" element={<ArtisanPerformance />} />
            <Route path="/admin/disputes" element={<Disputes />} />
            <Route path="/admin/settings" element={<Settings />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
