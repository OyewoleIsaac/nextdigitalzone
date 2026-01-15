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

// Admin Pages
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/admin/Dashboard";
import ClientSubmissions from "./pages/admin/ClientSubmissions";
import ArtisanSubmissions from "./pages/admin/ArtisanSubmissions";
import Categories from "./pages/admin/Categories";
import FormBuilder from "./pages/admin/FormBuilder";

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
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/clients" element={<ClientSubmissions />} />
            <Route path="/admin/clients/:status" element={<ClientSubmissions />} />
            <Route path="/admin/artisans" element={<ArtisanSubmissions />} />
            <Route path="/admin/artisans/:status" element={<ArtisanSubmissions />} />
            <Route path="/admin/categories" element={<Categories />} />
            <Route path="/admin/forms" element={<FormBuilder />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
