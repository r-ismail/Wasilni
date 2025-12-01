import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield, Users, AlertCircle, BarChart3, Settings } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();

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
            <h1 className="text-5xl font-bold mb-4">RideShare Admin Panel</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Manage your ride-sharing platform
            </p>
            <Button size="lg" asChild>
              <a href={getLoginUrl()}>Admin Login</a>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>
                  Monitor platform performance and key metrics in real-time
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage riders, drivers, and verify accounts
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Safety & Compliance</CardTitle>
                <CardDescription>
                  Handle disputes, cancellations, and platform safety
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <div className="bg-destructive/10 w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-center">Access Denied</CardTitle>
            <CardDescription className="text-center">
              This admin panel is only accessible to administrators. Please use the mobile app for rider and driver features.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={logout} variant="outline" className="w-full">
              {t('common.logout')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin user - show admin dashboard
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{t('home.welcome', { name: user?.name })}</h1>
            <p className="text-muted-foreground">Choose your action below</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <LanguageSwitcher />
            <Button onClick={logout} variant="outline">
              {t('common.logout')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Admin Dashboard */}
          <Link href="/admin/dashboard">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="bg-red-100 dark:bg-red-900/20 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle>Admin Dashboard</CardTitle>
                <CardDescription>
                  View platform statistics and metrics
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          {/* User Management */}
          <Link href="/admin/users">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="bg-blue-100 dark:bg-blue-900/20 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage riders and drivers
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          {/* Cancellation Management */}
          <Link href="/admin/cancellations">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="bg-orange-100 dark:bg-orange-900/20 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle>Cancellation Management</CardTitle>
                <CardDescription>
                  Track and manage ride cancellations
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          {/* Notification Settings */}
          <Link href="/settings/notifications">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="bg-purple-100 dark:bg-purple-900/20 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Manage your push notification preferences
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
