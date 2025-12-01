import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "@/pages/AdminUsers";
import AdminCancellations from "./pages/AdminCancellations";
import NotificationSettings from "./pages/NotificationSettings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      

      {/* Admin Routes */}
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/cancellations" component={AdminCancellations} />
      <Route path="/settings/notifications" component={NotificationSettings} />
      
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
