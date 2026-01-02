import { useState } from 'react';
import { MapPin, Navigation, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGeolocation } from '@/hooks/useGeolocation';

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
}

export function LocationPicker({ latitude, longitude, onLocationChange }: LocationPickerProps) {
  const { loading, getCurrentPosition } = useGeolocation();

  const handleGetLocation = async () => {
    try {
      const coords = await getCurrentPosition();
      onLocationChange(coords.latitude, coords.longitude);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const hasLocation = latitude !== null && longitude !== null;

  return (
    <div className="space-y-3">
      <label className="text-sm text-muted-foreground mb-2 block">
        الموقع على الخريطة
      </label>
      
      <div className="glass-card p-4">
        <Button
          type="button"
          variant={hasLocation ? 'default' : 'glass'}
          className="w-full gap-2"
          onClick={handleGetLocation}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>جاري تحديد الموقع...</span>
            </>
          ) : hasLocation ? (
            <>
              <Check className="w-5 h-5" />
              <span>تم تحديد الموقع</span>
            </>
          ) : (
            <>
              <Navigation className="w-5 h-5" />
              <span>تحديد موقعي الحالي</span>
            </>
          )}
        </Button>

        {hasLocation && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span>الإحداثيات:</span>
            </div>
            <div className="mt-1 text-xs font-mono text-foreground" dir="ltr">
              {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-3">
          سيتم حفظ موقعك لعرضه على الخريطة للمستخدمين الآخرين
        </p>
      </div>
    </div>
  );
}
