import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import RiderDashboard from "./pages/RiderDashboard";
import RiderHistory from "./pages/RiderHistory";
import DriverDashboard from "./pages/DriverDashboard";
import DriverEarnings from "./pages/DriverEarnings";
import DriverActiveRide from "./pages/DriverActiveRide";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "@/pages/AdminUsers";
import AdminCancellations from "@/pages/AdminCancellations";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      
      {/* Rider Routes */}
      <Route path="/rider/dashboard" component={RiderDashboard} />
      <Route path="/rider/history" component={RiderHistory} />
      
      {/* Driver Routes */}
      <Route path="/driver/dashboard" component={DriverDashboard} />
      <Route path="/driver/earnings" component={DriverEarnings} />
      <Route path="/driver/active-ride" component={DriverActiveRide} />
      
      {/* Admin Routes */}
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/cancellations" component={AdminCancellations} />
      
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
