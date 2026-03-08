import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | 'default';
  isSubscribed: boolean;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    
    setState(prev => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : 'default'
    }));

    // Register service worker
    if (isSupported) {
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      // SW registered successfully
      
      // Check if already subscribed
      const reg = registration as any;
      if (reg.pushManager) {
        const subscription = await reg.pushManager.getSubscription();
        setState(prev => ({
          ...prev,
          isSubscribed: !!subscription
        }));
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      toast.error('المتصفح لا يدعم الإشعارات');
      return false;
    }

    setIsLoading(true);

    try {
      const permission = await Notification.requestPermission();
      
      setState(prev => ({
        ...prev,
        permission
      }));

      if (permission === 'granted') {
        toast.success('تم تفعيل الإشعارات بنجاح');
        return true;
      } else if (permission === 'denied') {
        toast.error('تم رفض الإشعارات. يمكنك تغيير الإعدادات من المتصفح');
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('فشل في طلب إذن الإشعارات');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [state.isSupported]);

  const showNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    if (state.permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        dir: 'rtl',
        lang: 'ar',
        ...options
      });
    } catch (error) {
      console.error('Error showing notification:', error);
      // Fallback to basic notification
      if (Notification.permission === 'granted') {
        new Notification(title, options);
      }
    }
  }, [state.permission, requestPermission]);

  return {
    ...state,
    isLoading,
    requestPermission,
    showNotification
  };
}
