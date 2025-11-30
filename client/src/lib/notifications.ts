/**
 * Browser Push Notification Utility
 * Handles permission requests and notification display
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: any;
}

class NotificationManager {
  private permission: NotificationPermission = 'default';

  constructor() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * Check if notifications are supported
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Get current permission status
   */
  getPermission(): NotificationPermission {
    return this.permission;
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      console.warn('[Notifications] Not supported in this browser');
      return 'denied';
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission;
    } catch (error) {
      console.error('[Notifications] Permission request failed:', error);
      return 'denied';
    }
  }

  /**
   * Show a notification
   */
  async show(options: NotificationOptions): Promise<void> {
    if (!this.isSupported()) {
      console.warn('[Notifications] Not supported');
      return;
    }

    // Request permission if not granted
    if (this.permission !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('[Notifications] Permission denied');
        return;
      }
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        data: options.data,
      });

      // Auto-close after 10 seconds if not requiring interaction
      if (!options.requireInteraction) {
        setTimeout(() => notification.close(), 10000);
      }

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Navigate to relevant page if data contains URL
        if (options.data?.url) {
          window.location.href = options.data.url;
        }
      };
    } catch (error) {
      console.error('[Notifications] Failed to show notification:', error);
    }
  }

  /**
   * Show ride acceptance notification
   */
  async showRideAccepted(driverName: string, lang: string = 'en'): Promise<void> {
    const messages = {
      en: { title: '🚗 Ride Accepted!', body: `${driverName} is on the way to pick you up` },
      ar: { title: '🚗 تم قبول الرحلة!', body: `${driverName} في الطريق لاستلامك` }
    };
    const msg = messages[lang as keyof typeof messages] || messages.en;
    await this.show({
      title: msg.title,
      body: msg.body,
      tag: 'ride-accepted',
      requireInteraction: true,
      data: { url: '/rider/dashboard' },
    });
  }

  /**
   * Show driver arriving notification
   */
  async showDriverArriving(driverName: string, eta: number): Promise<void> {
    await this.show({
      title: '📍 Driver Arriving',
      body: `${driverName} will arrive in ${eta} minute${eta !== 1 ? 's' : ''}`,
      tag: 'driver-arriving',
      requireInteraction: true,
      data: { url: '/rider/dashboard' },
    });
  }

  /**
   * Show trip started notification
   */
  async showTripStarted(): Promise<void> {
    await this.show({
      title: '🚀 Trip Started',
      body: 'Your ride has begun. Enjoy your trip!',
      tag: 'trip-started',
      data: { url: '/rider/dashboard' },
    });
  }

  /**
   * Show trip completed notification
   */
  async showTripCompleted(fare: number): Promise<void> {
    await this.show({
      title: '✅ Trip Completed',
      body: `Your ride is complete. Fare: $${fare.toFixed(2)}`,
      tag: 'trip-completed',
      requireInteraction: true,
      data: { url: '/rider/history' },
    });
  }

  /**
   * Show new ride request notification (for drivers)
   */
  async showNewRideRequest(pickup: string, fare: number): Promise<void> {
    await this.show({
      title: '🔔 New Ride Request',
      body: `Pickup: ${pickup} • Fare: $${fare.toFixed(2)}`,
      tag: 'new-ride-request',
      requireInteraction: true,
      data: { url: '/driver/dashboard' },
    });
  }

  /**
   * Show ride cancelled notification
   */
  async showRideCancelled(reason?: string): Promise<void> {
    await this.show({
      title: '❌ Ride Cancelled',
      body: reason || 'Your ride has been cancelled',
      tag: 'ride-cancelled',
      data: { url: '/rider/dashboard' },
    });
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();
