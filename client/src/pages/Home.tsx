import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Car, Users, Shield, MapPin, AlertCircle, Bell } from "lucide-react";
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">{t('home.welcome', { name: user?.name })}</h1>
              <p className="text-muted-foreground">{t('home.chooseAction')}</p>
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
          {/* Rider Dashboard */}
          {(user?.role === "rider" || user?.role === "admin") && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/rider/dashboard">
                <CardHeader>
                  <div className="bg-blue-100 dark:bg-blue-900 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <Car className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  <CardTitle>{t('home.riderDashboard')}</CardTitle>
                  <CardDescription>
                    {t('home.riderDashboardDesc')}
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
                  <CardTitle>{t('home.rideHistory')}</CardTitle>
                  <CardDescription>
                    {t('home.rideHistoryDesc')}
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
                  <CardTitle>{t('home.driverDashboard')}</CardTitle>
                  <CardDescription>
                    {t('home.driverDashboardDesc')}
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
                  <CardTitle>{t('home.earnings')}</CardTitle>
                  <CardDescription>
                    {t('home.earningsDesc')}
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>
          )}

          {(user?.role === "driver" || user?.role === "admin") && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/driver/vehicles">
                <CardHeader>
                  <div className="bg-green-100 dark:bg-green-900 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <Car className="h-6 w-6 text-green-600 dark:text-green-300" />
                  </div>
                  <CardTitle>{t('driver.myVehicles')}</CardTitle>
                  <CardDescription>
                    {t('driver.manageVehiclesDesc')}
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>
          )}

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = "/settings/notifications"}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-full">
                  <Bell className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>Manage your push notification preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Admin-only cards */}
          {user?.role === 'admin' && (            <>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link href="/admin/dashboard">
                  <CardHeader>
                    <div className="bg-red-100 dark:bg-red-900 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                      <Shield className="h-6 w-6 text-red-600 dark:text-red-300" />
                    </div>
                    <CardTitle>{t('home.adminDashboard')}</CardTitle>
                    <CardDescription>
                      {t('home.adminDashboardDesc')}
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link href="/admin/cancellations">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-orange-100">
                    <AlertCircle className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle>{t("home.cancellationManagement")}</CardTitle>
                    <CardDescription>{t("home.cancellationManagementDesc")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/admin/users">
                  <CardHeader>
                    <div className="bg-indigo-100 dark:bg-indigo-900 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                      <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                    </div>
                    <CardTitle>{t('home.userManagement')}</CardTitle>
                    <CardDescription>
                      {t('home.userManagementDesc')}
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
