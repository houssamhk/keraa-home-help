import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Home, Wrench, Navigation, MapPin, Phone, Star, Loader2, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons
const propertyIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background: linear-gradient(135deg, hsl(30 52% 65%), hsl(38 65% 55%)); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid white;">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const handymanIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background: linear-gradient(135deg, #22c55e, #16a34a); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid white;">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const userLocationIcon = new L.DivIcon({
  className: 'custom-marker user-location-marker',
  html: `<div style="position: relative;">
    <div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(59,130,246,0.5);"></div>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  latitude: number | null;
  longitude: number | null;
  images: string[] | null;
}

interface Handyman {
  id: string;
  user_id: string;
  specialty: string[];
  description: string | null;
  hourly_rate: number | null;
  rating: number | null;
  total_reviews: number | null;
  is_available: boolean | null;
  latitude: number | null;
  longitude: number | null;
  name?: string;
}

interface LeafletMapProps {
  onBack: () => void;
  onViewProperty?: (id: string) => void;
  onViewHandyman?: (id: string) => void;
}

// Algeria center coordinates
const ALGERIA_CENTER: [number, number] = [36.7538, 3.0588];

function LocationMarker({ userLocation }: { userLocation: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (userLocation) {
      map.flyTo(userLocation, 14);
    }
  }, [userLocation, map]);

  return userLocation ? (
    <Marker position={userLocation} icon={userLocationIcon}>
      <Popup>
        <div className="text-center p-2">
          <strong>موقعك الحالي</strong>
        </div>
      </Popup>
    </Marker>
  ) : null;
}

function RoutingControl({ userLocation, destination }: {
  userLocation: [number, number] | null;
  destination: [number, number] | null;
}) {
  const map = useMap();
  const routingControlRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (routingControlRef.current) {
      map.removeLayer(routingControlRef.current);
      routingControlRef.current = null;
    }

    if (userLocation && destination) {
      const polyline = L.polyline([userLocation, destination], {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 10'
      }).addTo(map);

      routingControlRef.current = polyline;
      const bounds = L.latLngBounds([userLocation, destination]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      if (routingControlRef.current) {
        map.removeLayer(routingControlRef.current);
      }
    };
  }, [userLocation, destination, map]);

  return null;
}

type ViewMode = 'all' | 'properties' | 'handymen';

export function LeafletMap({ onBack, onViewProperty, onViewHandyman }: LeafletMapProps) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [properties, setProperties] = useState<Property[]>([]);
  const [handymen, setHandymen] = useState<Handyman[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedItem, setSelectedItem] = useState<Property | Handyman | null>(null);
  const [routeDestination, setRouteDestination] = useState<[number, number] | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    try {
      // Fetch properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id, title, address, city, price, bedrooms, bathrooms, area_sqm, latitude, longitude, images')
        .eq('is_available', true);

      if (propertiesError) {
        console.error('Properties fetch error:', propertiesError);
      } else if (propertiesData) {
        // Filter for valid coordinates
        setProperties(propertiesData.filter(p => p.latitude && p.longitude));
      }

      // Fetch handymen
      const { data: handymenData, error: handymenError } = await supabase
        .from('handymen')
        .select('id, user_id, specialty, description, hourly_rate, rating, total_reviews, is_available, latitude, longitude')
        .eq('is_available', true);

      if (handymenError) {
        console.error('Handymen fetch error:', handymenError);
      } else if (handymenData) {
        // Filter for valid coordinates and add name
        const handymenWithNames = handymenData
          .filter(h => h.latitude && h.longitude)
          .map(h => ({
            ...h,
            name: `حرفي ${h.specialty?.[0] || ''}`
          }));
        setHandymen(handymenWithNames);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
    
    setLoading(false);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'خطأ',
        description: 'المتصفح لا يدعم تحديد الموقع',
        variant: 'destructive'
      });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(loc);
        setGettingLocation(false);
        toast({
          title: 'تم تحديد موقعك',
          description: 'تم تحديد موقعك الحالي بنجاح'
        });
      },
      (error) => {
        setGettingLocation(false);
        let message = 'فشل في تحديد الموقع';
        if (error.code === error.PERMISSION_DENIED) {
          message = 'يرجى السماح بالوصول للموقع';
        }
        toast({
          title: 'خطأ',
          description: message,
          variant: 'destructive'
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const navigateToItem = (lat: number, lng: number) => {
    if (!userLocation) {
      getCurrentLocation();
      toast({
        title: 'تنبيه',
        description: 'يرجى تحديد موقعك أولاً'
      });
      return;
    }
    setRouteDestination([lat, lng]);
  };

  const clearRoute = () => setRouteDestination(null);

  const isProperty = (item: Property | Handyman): item is Property => 'bedrooms' in item;

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-inset relative">
      {/* Header */}
      <motion.div 
        className="absolute top-0 left-0 right-0 z-[1000] p-4 safe-top"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <Button variant="glass" size="icon" onClick={onBack}>
            <X className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 glass-card px-4 py-3 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground text-sm">استكشف العقارات والحرفيين</span>
          </div>
          
          <Button 
            variant="glass" 
            size="icon" 
            onClick={getCurrentLocation}
            disabled={gettingLocation}
          >
            {gettingLocation ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Navigation className="w-5 h-5" />
            )}
          </Button>
        </div>

        <div className="flex gap-2 mt-3">
          {(['all', 'properties', 'handymen'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                viewMode === mode
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {mode === 'all' ? 'الكل' : mode === 'properties' ? 'العقارات' : 'الحرفيين'}
            </button>
          ))}
        </div>

        {routeDestination && (
          <Button variant="destructive" size="sm" className="mt-3" onClick={clearRoute}>
            <X className="w-4 h-4 ml-2" />
            إلغاء المسار
          </Button>
        )}
      </motion.div>

      {/* Map */}
      <div className="flex-1 pt-32">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : (
          <MapContainer
            center={userLocation || ALGERIA_CENTER}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <LocationMarker userLocation={userLocation} />
            <RoutingControl userLocation={userLocation} destination={routeDestination} />

            {(viewMode === 'all' || viewMode === 'properties') && properties.map((property) => (
              <Marker
                key={`property-${property.id}`}
                position={[property.latitude!, property.longitude!]}
                icon={propertyIcon}
                eventHandlers={{ click: () => setSelectedItem(property) }}
              />
            ))}

            {(viewMode === 'all' || viewMode === 'handymen') && handymen.map((handyman) => (
              <Marker
                key={`handyman-${handyman.id}`}
                position={[handyman.latitude!, handyman.longitude!]}
                icon={handymanIcon}
                eventHandlers={{ click: () => setSelectedItem(handyman) }}
              />
            ))}
          </MapContainer>
        )}
      </div>

      {/* Bottom sheet */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl border-t border-border p-6 pb-8 z-[1000]"
          >
            {isProperty(selectedItem) ? (
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-foreground">{selectedItem.title}</h3>
                    <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {selectedItem.city}، {selectedItem.address}
                    </p>
                  </div>
                  <button onClick={() => setSelectedItem(null)} className="p-2 -m-2">
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <span className="gold-text font-bold text-2xl">{selectedItem.price?.toLocaleString()} دج</span>
                  <span className="text-muted-foreground">/شهرياً</span>
                </div>

                <div className="flex gap-4 mb-6 text-sm text-muted-foreground">
                  <span>{selectedItem.bedrooms || 0} غرف</span>
                  <span>•</span>
                  <span>{selectedItem.bathrooms || 0} حمام</span>
                  <span>•</span>
                  <span>{selectedItem.area_sqm || 0} م²</span>
                </div>

                <div className="flex gap-3">
                  <Button variant="gold" className="flex-1" onClick={() => onViewProperty?.(selectedItem.id)}>
                    <Home className="w-4 h-4" />
                    عرض التفاصيل
                  </Button>
                  <Button variant="glass" size="icon" onClick={() => navigateToItem(selectedItem.latitude!, selectedItem.longitude!)}>
                    <Navigation className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Wrench className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-serif text-xl font-bold text-foreground">{selectedItem.name || 'حرفي'}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Star className="w-4 h-4 text-primary fill-primary" />
                        <span className="text-foreground font-medium">{selectedItem.rating || 0}</span>
                        <span className="text-muted-foreground text-sm">({selectedItem.total_reviews || 0} تقييم)</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedItem(null)} className="p-2 -m-2">
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedItem.specialty?.slice(0, 3).map((spec, idx) => (
                    <span key={idx} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      {spec}
                    </span>
                  ))}
                </div>

                {selectedItem.hourly_rate && (
                  <p className="text-muted-foreground mb-4">
                    <span className="gold-text font-bold">{selectedItem.hourly_rate} دج</span> /ساعة
                  </p>
                )}

                <div className="flex gap-3">
                  <Button variant="gold" className="flex-1" onClick={() => onViewHandyman?.(selectedItem.id)}>
                    <Wrench className="w-4 h-4" />
                    عرض التفاصيل
                  </Button>
                  <Button variant="glass" size="icon" onClick={() => navigateToItem(selectedItem.latitude!, selectedItem.longitude!)}>
                    <Navigation className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LeafletMap;
