import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { toast } from 'sonner';

export function useNativeFeatures() {
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('web');

  useEffect(() => {
    const native = Capacitor.isNativePlatform();
    setIsNative(native);
    setPlatform(Capacitor.getPlatform() as 'ios' | 'android' | 'web');

    if (native) {
      initializeNativeFeatures();
    }
  }, []);

  const initializeNativeFeatures = async () => {
    try {
      // Set status bar style
      await StatusBar.setStyle({ style: Style.Dark });
      
      if (Capacitor.getPlatform() === 'android') {
        await StatusBar.setBackgroundColor({ color: '#0C1015' });
      }

      // Listen for keyboard events
      Keyboard.addListener('keyboardWillShow', () => {
        document.body.classList.add('keyboard-visible');
      });

      Keyboard.addListener('keyboardWillHide', () => {
        document.body.classList.remove('keyboard-visible');
      });
    } catch (error) {
      console.log('Native features initialization error:', error);
    }
  };

  const takePhoto = async (): Promise<string | null> => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        promptLabelHeader: 'التقط صورة',
        promptLabelPhoto: 'اختر من المعرض',
        promptLabelPicture: 'التقط صورة'
      });
      
      await hapticFeedback('light');
      return image.webPath || null;
    } catch (error) {
      console.log('Camera error:', error);
      return null;
    }
  };

  const pickPhoto = async (): Promise<string | null> => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });
      
      return image.webPath || null;
    } catch (error) {
      console.log('Photo picker error:', error);
      return null;
    }
  };

  const pickMultiplePhotos = async (): Promise<string[]> => {
    try {
      const images = await Camera.pickImages({
        quality: 90,
        limit: 10
      });
      
      return images.photos.map(p => p.webPath || '').filter(Boolean);
    } catch (error) {
      console.log('Multiple photos error:', error);
      return [];
    }
  };

  const getCurrentLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      const permission = await Geolocation.checkPermissions();
      
      if (permission.location !== 'granted') {
        const request = await Geolocation.requestPermissions();
        if (request.location !== 'granted') {
          toast.error('يرجى السماح بالوصول للموقع');
          return null;
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
    } catch (error) {
      console.log('Geolocation error:', error);
      toast.error('تعذر الحصول على الموقع');
      return null;
    }
  };

  const shareContent = async (options: { title: string; text: string; url?: string }) => {
    try {
      if (isNative) {
        await Share.share({
          title: options.title,
          text: options.text,
          url: options.url,
          dialogTitle: 'مشاركة'
        });
      } else if (navigator.share) {
        await navigator.share(options);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(options.url || options.text);
        toast.success('تم نسخ الرابط');
      }
      await hapticFeedback('light');
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const hapticFeedback = async (style: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!isNative) return;
    
    try {
      const impactStyle = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy
      }[style];
      
      await Haptics.impact({ style: impactStyle });
    } catch (error) {
      console.log('Haptics error:', error);
    }
  };

  const hapticNotification = async (type: 'success' | 'warning' | 'error') => {
    if (!isNative) return;
    
    try {
      await Haptics.notification({
        type: type === 'success' ? 'SUCCESS' : type === 'warning' ? 'WARNING' : 'ERROR'
      } as any);
    } catch (error) {
      console.log('Haptics notification error:', error);
    }
  };

  return {
    isNative,
    platform,
    takePhoto,
    pickPhoto,
    pickMultiplePhotos,
    getCurrentLocation,
    shareContent,
    hapticFeedback,
    hapticNotification
  };
}
