import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const { toast } = useToast();
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    loading: false,
    error: null
  });

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      const error = 'المتصفح لا يدعم تحديد الموقع';
      setState(prev => ({ ...prev, error, loading: false }));
      toast({
        title: 'خطأ',
        description: error,
        variant: 'destructive'
      });
      return Promise.reject(error);
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setState({
            ...coords,
            loading: false,
            error: null
          });
          toast({
            title: 'تم تحديد الموقع',
            description: 'تم تحديد موقعك الحالي بنجاح'
          });
          resolve(coords);
        },
        (error) => {
          let message = 'فشل في تحديد الموقع';
          if (error.code === error.PERMISSION_DENIED) {
            message = 'يرجى السماح بالوصول للموقع من إعدادات المتصفح';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = 'الموقع غير متاح حالياً';
          } else if (error.code === error.TIMEOUT) {
            message = 'انتهت مهلة تحديد الموقع';
          }
          setState(prev => ({ ...prev, loading: false, error: message }));
          toast({
            title: 'خطأ في تحديد الموقع',
            description: message,
            variant: 'destructive'
          });
          reject(message);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  }, [toast]);

  const clearLocation = useCallback(() => {
    setState({
      latitude: null,
      longitude: null,
      loading: false,
      error: null
    });
  }, []);

  return {
    ...state,
    getCurrentPosition,
    clearLocation
  };
}
