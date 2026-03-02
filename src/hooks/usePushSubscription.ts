import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// VAPID public key - in production, this should come from environment/server
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export function usePushSubscription() {
  const { user } = useAuth();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  const subscribe = useCallback(async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return null;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('متصفحك لا يدعم الإشعارات الفورية');
      return null;
    }

    setIsSubscribing(true);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('تم رفض إذن الإشعارات');
        return null;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check for existing subscription
      const reg = registration as any;
      let pushSubscription = await reg.pushManager.getSubscription();

      if (!pushSubscription) {
        // Create new subscription
        pushSubscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      // Extract keys
      const subscriptionJson = pushSubscription.toJSON();
      const p256dh = subscriptionJson.keys?.p256dh || '';
      const auth = subscriptionJson.keys?.auth || '';

      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: pushSubscription.endpoint,
          p256dh_key: p256dh,
          auth_key: auth,
          device_info: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform
          },
          is_active: true
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) {
        console.error('Error saving subscription:', error);
        toast.error('فشل في حفظ اشتراك الإشعارات');
        return null;
      }

      setSubscription(pushSubscription);
      toast.success('تم تفعيل الإشعارات الفورية بنجاح');
      return pushSubscription;

    } catch (error) {
      console.error('Push subscription error:', error);
      toast.error('فشل في تفعيل الإشعارات');
      return null;
    } finally {
      setIsSubscribing(false);
    }
  }, [user]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const reg = registration as any;
      const pushSubscription = await reg.pushManager.getSubscription();

      if (pushSubscription) {
        await pushSubscription.unsubscribe();

        // Mark as inactive in database
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('endpoint', pushSubscription.endpoint);

        setSubscription(null);
        toast.success('تم إلغاء الاشتراك في الإشعارات');
      }
    } catch (error) {
      console.error('Unsubscribe error:', error);
      toast.error('فشل في إلغاء الاشتراك');
    }
  }, [user]);

  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const reg = registration as any;
      const pushSubscription = await reg.pushManager.getSubscription();
      setSubscription(pushSubscription);
      return pushSubscription;
    } catch (error) {
      console.error('Check subscription error:', error);
      return null;
    }
  }, []);

  return {
    subscription,
    isSubscribing,
    subscribe,
    unsubscribe,
    checkSubscription
  };
}
