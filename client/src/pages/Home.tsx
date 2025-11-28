import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Car, Users, Shield, MapPin } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="container py-16">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-4">Welcome to RideShare</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Your reliable ride-sharing platform
            </p>
            <Button size="lg" asChild>
              <a href={getLoginUrl()}>Get Started</a>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <Car className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Ride Anywhere</CardTitle>
                <CardDescription>
                  Request rides to any destination with just a few taps
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Real-time Tracking</CardTitle>
                <CardDescription>
                  Track your driver in real-time with live GPS updates
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Safe & Secure</CardTitle>
                <CardDescription>
                  Verified drivers and secure payment options
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated user - show role-based dashboard
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {user?.name || "User"}!</h1>
            <p className="text-muted-foreground">Choose your action below</p>
          </div>
          <Button variant="outline" onClick={() => logout()}>
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Rider Dashboard */}
          {(user?.role === "rider" || user?.role === "admin") && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/rider/dashboard">
                <CardHeader>
                  <div className="bg-blue-100 dark:bg-blue-900 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <Car className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  <CardTitle>Request a Ride</CardTitle>
                  <CardDescription>
                    Book a ride to your destination
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>
          )}

          {(user?.role === "rider" || user?.role === "admin") && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/rider/history">
                <CardHeader>
                  <div className="bg-green-100 dark:bg-green-900 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <MapPin className="h-6 w-6 text-green-600 dark:text-green-300" />
                  </div>
                  <CardTitle>Ride History</CardTitle>
                  <CardDescription>
                    View your past rides and receipts
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>
          )}

          {/* Driver Dashboard */}
          {(user?.role === "driver" || user?.role === "admin") && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/driver/dashboard">
                <CardHeader>
                  <div className="bg-purple-100 dark:bg-purple-900 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <Car className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                  </div>
                  <CardTitle>Driver Dashboard</CardTitle>
                  <CardDescription>
                    Accept rides and manage availability
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>
          )}

          {(user?.role === "driver" || user?.role === "admin") && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/driver/earnings">
                <CardHeader>
                  <div className="bg-yellow-100 dark:bg-yellow-900 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
                  </div>
                  <CardTitle>Earnings</CardTitle>
                  <CardDescription>
                    Track your income and payment history
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>
          )}

          {/* Admin Dashboard */}
          {user?.role === "admin" && (
            <>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link href="/admin/dashboard">
                  <CardHeader>
                    <div className="bg-red-100 dark:bg-red-900 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                      <Shield className="h-6 w-6 text-red-600 dark:text-red-300" />
                    </div>
                    <CardTitle>Admin Dashboard</CardTitle>
                    <CardDescription>
                      View platform statistics and metrics
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link href="/admin/users">
                  <CardHeader>
                    <div className="bg-indigo-100 dark:bg-indigo-900 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                      <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                    </div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      Manage users, drivers, and permissions
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
