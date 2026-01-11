import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Activities from "./pages/Activities";
import Announcements from "./pages/Announcements";
import Profile from "./pages/Profile";
import Meetings from "./pages/Meetings";
import Attendance from "./pages/Attendance";
import Leaves from "./pages/Leaves";
import Inventory from "./pages/Inventory";
import Certificates from "./pages/Certificates";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Suggestions from "./pages/Suggestions";
import OurTeam from "./pages/OurTeam";
import FacultyDashboard from "./pages/FacultyDashboard";
import Tasks from "./pages/Tasks";
import CollectionDrives from "./pages/CollectionDrives";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ErrorBoundary>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
              <Route path="/our-team" element={<ProtectedRoute><OurTeam /></ProtectedRoute>} />
              <Route path="/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
              <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
              <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/meetings" element={<ProtectedRoute><Meetings /></ProtectedRoute>} />
              <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
              <Route path="/leaves" element={<ProtectedRoute><Leaves /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="/certificates" element={<ProtectedRoute><Certificates /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/suggestions" element={<ProtectedRoute><Suggestions /></ProtectedRoute>} />
              <Route path="/collection-drives" element={<ProtectedRoute><CollectionDrives /></ProtectedRoute>} />
              <Route path="/faculty-dashboard" element={<ProtectedRoute requiredRoles={['faculty_coordinator']}><FacultyDashboard /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
