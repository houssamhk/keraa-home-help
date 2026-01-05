import { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation, Loader2, Check, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGeolocation } from '@/hooks/useGeolocation';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
}

// Algeria center
const ALGERIA_CENTER: [number, number] = [36.7538, 3.0588];

export function LocationPicker({ latitude, longitude, onLocationChange }: LocationPickerProps) {
  const { loading, getCurrentPosition } = useGeolocation();
  const [showMap, setShowMap] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const handleGetLocation = async () => {
    try {
      const coords = await getCurrentPosition();
      onLocationChange(coords.latitude, coords.longitude);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  // Initialize map when shown
  useEffect(() => {
    if (!showMap || !mapContainerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = latitude && longitude 
      ? [latitude, longitude] 
      : ALGERIA_CENTER;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // Create draggable marker
    const markerIcon = new L.DivIcon({
      className: 'custom-marker',
      html: `<div style="background: linear-gradient(135deg, hsl(30 52% 65%), hsl(38 65% 55%)); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid white; cursor: move;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

    const marker = L.marker(initialCenter, { 
      icon: markerIcon, 
      draggable: true 
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onLocationChange(pos.lat, pos.lng);
    });

    // Click on map to move marker
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      onLocationChange(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [showMap]);

  // Update marker position when coordinates change
  useEffect(() => {
    if (markerRef.current && latitude && longitude) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapRef.current?.panTo([latitude, longitude]);
    }
  }, [latitude, longitude]);

  const hasLocation = latitude !== null && longitude !== null;

  return (
    <div className="space-y-3">
      <label className="text-sm text-muted-foreground mb-2 block">
        الموقع على الخريطة
      </label>
      
      <div className="glass-card p-4">
        {/* Quick location button */}
        <Button
          type="button"
          variant={hasLocation ? 'default' : 'glass'}
          className="w-full gap-2 mb-3"
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

        {/* Map toggle button */}
        <Button
          type="button"
          variant="glass"
          className="w-full gap-2"
          onClick={() => setShowMap(!showMap)}
        >
          <Map className="w-5 h-5" />
          <span>{showMap ? 'إخفاء الخريطة' : 'اختيار من الخريطة'}</span>
        </Button>

        {/* Interactive map */}
        {showMap && (
          <div className="mt-4 rounded-xl overflow-hidden border border-border">
            <div 
              ref={mapContainerRef} 
              className="h-64 w-full"
              style={{ background: 'hsl(240 6% 10%)' }}
            />
            <div className="bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">
                اضغط على الخريطة أو اسحب العلامة لتحديد الموقع
              </p>
            </div>
          </div>
        )}

        {/* Coordinates display */}
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
          سيتم عرض موقعك على الخريطة للمستخدمين الآخرين
        </p>
      </div>
    </div>
  );
}
