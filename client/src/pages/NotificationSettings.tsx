import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { notificationManager } from "@/lib/notifications";
import { Bell, BellOff, Check } from "lucide-react";

export default function NotificationSettings() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [rideAcceptance, setRideAcceptance] = useState(true);
  const [driverArrival, setDriverArrival] = useState(true);
  const [tripStart, setTripStart] = useState(true);
  const [tripCompletion, setTripCompletion] = useState(true);

  useEffect(() => {
    setPermission(notificationManager.getPermission());
    
    // Load saved preferences from localStorage
    const savedPrefs = localStorage.getItem('notificationPreferences');
    if (savedPrefs) {
      const prefs = JSON.parse(savedPrefs);
      setRideAcceptance(prefs.rideAcceptance ?? true);
      setDriverArrival(prefs.driverArrival ?? true);
      setTripStart(prefs.tripStart ?? true);
      setTripCompletion(prefs.tripCompletion ?? true);
    }
  }, []);

  const requestPermission = async () => {
    const result = await notificationManager.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      toast.success('Notifications enabled successfully!');
    } else {
      toast.error('Notification permission denied');
    }
  };

  const savePreferences = () => {
    const prefs = {
      rideAcceptance,
      driverArrival,
      tripStart,
      tripCompletion,
    };
    localStorage.setItem('notificationPreferences', JSON.stringify(prefs));
    toast.success('Notification preferences saved');
  };

  const testNotification = async () => {
    await notificationManager.show({
      title: '🔔 Test Notification',
      body: 'This is a test notification from your Uber Clone app!',
      tag: 'test-notification',
    });
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
        <p className="text-muted-foreground">
          Manage your push notification preferences
        </p>
      </div>

      {/* Permission Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {permission === 'granted' ? (
              <Bell className="h-5 w-5 text-green-500" />
            ) : (
              <BellOff className="h-5 w-5 text-gray-400" />
            )}
            Notification Permission
          </CardTitle>
          <CardDescription>
            {permission === 'granted' && 'Notifications are enabled'}
            {permission === 'denied' && 'Notifications are blocked. Please enable them in your browser settings.'}
            {permission === 'default' && 'Click the button below to enable notifications'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {permission === 'granted' ? (
              <>
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Enabled</span>
                </div>
                <Button onClick={testNotification} variant="outline">
                  Test Notification
                </Button>
              </>
            ) : permission === 'denied' ? (
              <p className="text-sm text-muted-foreground">
                To enable notifications, please update your browser settings and reload the page.
              </p>
            ) : (
              <Button onClick={requestPermission}>
                Enable Notifications
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose which events you want to be notified about
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ride-acceptance">Ride Acceptance</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when a driver accepts your ride request
              </p>
            </div>
            <Switch
              id="ride-acceptance"
              checked={rideAcceptance}
              onCheckedChange={setRideAcceptance}
              disabled={permission !== 'granted'}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="driver-arrival">Driver Arrival</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when your driver is arriving (within 2 minutes)
              </p>
            </div>
            <Switch
              id="driver-arrival"
              checked={driverArrival}
              onCheckedChange={setDriverArrival}
              disabled={permission !== 'granted'}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="trip-start">Trip Start</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when your trip begins
              </p>
            </div>
            <Switch
              id="trip-start"
              checked={tripStart}
              onCheckedChange={setTripStart}
              disabled={permission !== 'granted'}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="trip-completion">Trip Completion</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when your trip is completed
              </p>
            </div>
            <Switch
              id="trip-completion"
              checked={tripCompletion}
              onCheckedChange={setTripCompletion}
              disabled={permission !== 'granted'}
            />
          </div>

          <div className="pt-4">
            <Button onClick={savePreferences} disabled={permission !== 'granted'}>
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Browser Compatibility Note */}
      <Card className="mt-6 border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Push notifications require a modern browser and may not work in private/incognito mode.
            Supported browsers include Chrome, Firefox, Edge, and Safari (iOS 16.4+).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
