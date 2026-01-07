import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Home, Wrench, Navigation, MapPin, Star, Loader2, X, ChevronDown, Search, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

// Demo data for testing
const DEMO_PROPERTIES: Property[] = [
  {
    id: 'demo-1',
    title: 'شقة فاخرة في حيدرة',
    address: 'شارع ديدوش مراد',
    city: 'الجزائر',
    price: 45000,
    bedrooms: 3,
    bathrooms: 2,
    area_sqm: 120,
    latitude: 36.7650,
    longitude: 3.0522,
    images: []
  },
  {
    id: 'demo-2',
    title: 'فيلا مع حديقة',
    address: 'بوزريعة',
    city: 'الجزائر',
    price: 120000,
    bedrooms: 5,
    bathrooms: 3,
    area_sqm: 300,
    latitude: 36.7780,
    longitude: 3.0150,
    images: []
  },
  {
    id: 'demo-3',
    title: 'استوديو مفروش',
    address: 'باب الوادي',
    city: 'الجزائر',
    price: 25000,
    bedrooms: 1,
    bathrooms: 1,
    area_sqm: 40,
    latitude: 36.7900,
    longitude: 3.0560,
    images: []
  },
  {
    id: 'demo-4',
    title: 'شقة عائلية',
    address: 'الدار البيضاء',
    city: 'الجزائر',
    price: 55000,
    bedrooms: 4,
    bathrooms: 2,
    area_sqm: 150,
    latitude: 36.7400,
    longitude: 3.0800,
    images: []
  }
];

const DEMO_HANDYMEN: Handyman[] = [
  {
    id: 'demo-h1',
    user_id: 'demo-user-1',
    specialty: ['سباكة', 'كهرباء'],
    description: 'خبرة 10 سنوات في السباكة والكهرباء',
    hourly_rate: 2000,
    rating: 4.8,
    total_reviews: 45,
    is_available: true,
    latitude: 36.7600,
    longitude: 3.0400,
    name: 'أحمد السباك'
  },
  {
    id: 'demo-h2',
    user_id: 'demo-user-2',
    specialty: ['دهان', 'نجارة'],
    description: 'متخصص في الدهان والتصميم الداخلي',
    hourly_rate: 1800,
    rating: 4.5,
    total_reviews: 32,
    is_available: true,
    latitude: 36.7750,
    longitude: 3.0650,
    name: 'محمد الدهان'
  },
  {
    id: 'demo-h3',
    user_id: 'demo-user-3',
    specialty: ['تكييف', 'كهرباء'],
    description: 'تركيب وصيانة المكيفات',
    hourly_rate: 2500,
    rating: 4.9,
    total_reviews: 67,
    is_available: true,
    latitude: 36.7480,
    longitude: 3.0320,
    name: 'كريم التكييف'
  }
];

type ViewMode = 'all' | 'properties' | 'handymen';

export function LeafletMap({ onBack, onViewProperty, onViewHandyman }: LeafletMapProps) {
  const { toast } = useToast();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routeMarkersRef = useRef<L.Marker[]>([]);

  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [properties, setProperties] = useState<Property[]>(DEMO_PROPERTIES);
  const [handymen, setHandymen] = useState<Handyman[]>(DEMO_HANDYMEN);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedItem, setSelectedItem] = useState<Property | Handyman | null>(null);
  const [routeDestination, setRouteDestination] = useState<[number, number] | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Custom icons
  const propertyIcon = useMemo(() => new L.DivIcon({
    className: 'custom-marker',
    html: `<div style="background: linear-gradient(135deg, hsl(30 52% 65%), hsl(38 65% 55%)); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid white;">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  }), []);

  const handymanIcon = useMemo(() => new L.DivIcon({
    className: 'custom-marker',
    html: `<div style="background: linear-gradient(135deg, #22c55e, #16a34a); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid white;">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  }), []);

  const userLocationIcon = useMemo(() => new L.DivIcon({
    className: 'custom-marker user-location-marker',
    html: `<div style="position: relative;">
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; background: rgba(59,130,246,0.2); border-radius: 50%; animation: pulse 2s infinite;"></div>
      <div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(59,130,246,0.5); position: relative; z-index: 1;"></div>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  }), []);

  const destinationIcon = useMemo(() => new L.DivIcon({
    className: 'custom-marker',
    html: `<div style="background: #ef4444; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid white;">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  }), []);

  // Filter items based on search
  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) return properties;
    const query = searchQuery.toLowerCase();
    return properties.filter(p => 
      p.title.toLowerCase().includes(query) ||
      p.address.toLowerCase().includes(query) ||
      p.city.toLowerCase().includes(query)
    );
  }, [properties, searchQuery]);

  const filteredHandymen = useMemo(() => {
    if (!searchQuery.trim()) return handymen;
    const query = searchQuery.toLowerCase();
    return handymen.filter(h => 
      h.name?.toLowerCase().includes(query) ||
      h.specialty?.some(s => s.toLowerCase().includes(query))
    );
  }, [handymen, searchQuery]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Small delay to ensure container has proper dimensions
    const initMap = () => {
      if (!mapContainerRef.current) return;
      
      const map = L.map(mapContainerRef.current, {
        center: ALGERIA_CENTER,
        zoom: 12,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Add zoom control to bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapRef.current = map;
      
      // Force map to recalculate size after render
      setTimeout(() => {
        map.invalidateSize();
        setMapReady(true);
      }, 100);
    };

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      setTimeout(initMap, 50);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Also invalidate on visibility change (tab switching)
    const handleVisibility = () => {
      if (!document.hidden && mapRef.current) {
        setTimeout(() => mapRef.current?.invalidateSize(), 100);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Fetch data from Supabase and merge with demo data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    try {
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('id, title, address, city, price, bedrooms, bathrooms, area_sqm, latitude, longitude, images')
        .eq('is_available', true);

      if (propertiesData && propertiesData.length > 0) {
        const realProperties = propertiesData.filter(p => p.latitude && p.longitude);
        setProperties([...realProperties, ...DEMO_PROPERTIES]);
      }

      const { data: handymenData } = await supabase
        .from('handymen')
        .select('id, user_id, specialty, description, hourly_rate, rating, total_reviews, is_available, latitude, longitude')
        .eq('is_available', true);

      if (handymenData && handymenData.length > 0) {
        const realHandymen = handymenData
          .filter(h => h.latitude && h.longitude)
          .map(h => ({ ...h, name: `حرفي ${h.specialty?.[0] || ''}` }));
        setHandymen([...realHandymen, ...DEMO_HANDYMEN]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
    
    setLoading(false);
  };

  // Update markers when data or viewMode changes
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add property markers
    if (viewMode === 'all' || viewMode === 'properties') {
      filteredProperties.forEach(property => {
        if (property.latitude && property.longitude) {
          const marker = L.marker([property.latitude, property.longitude], { icon: propertyIcon })
            .addTo(mapRef.current!)
            .on('click', () => setSelectedItem(property));
          markersRef.current.push(marker);
        }
      });
    }

    // Add handyman markers
    if (viewMode === 'all' || viewMode === 'handymen') {
      filteredHandymen.forEach(handyman => {
        if (handyman.latitude && handyman.longitude) {
          const marker = L.marker([handyman.latitude, handyman.longitude], { icon: handymanIcon })
            .addTo(mapRef.current!)
            .on('click', () => setSelectedItem(handyman));
          markersRef.current.push(marker);
        }
      });
    }
  }, [filteredProperties, filteredHandymen, viewMode, mapReady, propertyIcon, handymanIcon]);

  // Update user location marker
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userLocation) {
      userMarkerRef.current = L.marker(userLocation, { icon: userLocationIcon })
        .addTo(mapRef.current)
        .bindPopup('<div class="text-center p-2 font-semibold">موقعك الحالي</div>');
      
      if (!routeDestination) {
        mapRef.current.flyTo(userLocation, 14);
      }
    }
  }, [userLocation, mapReady, userLocationIcon, routeDestination]);

  // Fetch real route from OSRM
  const fetchRoute = async (start: [number, number], end: [number, number]) => {
    setLoadingRoute(true);
    try {
      // OSRM expects coordinates as [lng, lat]
      const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);
        
        // Calculate distance and duration
        const distanceKm = (route.distance / 1000).toFixed(1);
        const durationMin = Math.round(route.duration / 60);
        setRouteInfo({ 
          distance: `${distanceKm} كم`, 
          duration: `${durationMin} دقيقة` 
        });
        
        return coordinates;
      }
      return null;
    } catch (error) {
      console.error('Route fetch error:', error);
      toast({
        title: 'خطأ في المسار',
        description: 'تعذر حساب المسار، سيتم رسم خط مباشر',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoadingRoute(false);
    }
  };

  // Update route line
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    // Clear existing route
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }
    routeMarkersRef.current.forEach(m => m.remove());
    routeMarkersRef.current = [];
    setRouteInfo(null);

    if (userLocation && routeDestination) {
      // Fetch and draw real route
      fetchRoute(userLocation, routeDestination).then(routeCoords => {
        if (!mapRef.current) return;
        
        const coords = routeCoords || [userLocation, routeDestination];
        
        // Draw route polyline with smooth styling
        routeLayerRef.current = L.polyline(coords, {
          color: '#3b82f6',
          weight: 6,
          opacity: 0.9,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(mapRef.current);

        // Add destination marker
        const destMarker = L.marker(routeDestination, { icon: destinationIcon })
          .addTo(mapRef.current)
          .bindPopup('<div class="text-center p-2 font-semibold">الوجهة</div>');
        routeMarkersRef.current.push(destMarker);

        // Fit bounds to show route
        const bounds = L.latLngBounds(coords);
        mapRef.current.fitBounds(bounds, { padding: [80, 80] });
      });
    }
  }, [userLocation, routeDestination, mapReady, destinationIcon]);

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
          description: 'يمكنك الآن تتبع المسار'
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

  // Start live tracking
  const startTracking = () => {
    if (!navigator.geolocation) {
      toast({ title: 'خطأ', description: 'المتصفح لا يدعم تحديد الموقع', variant: 'destructive' });
      return;
    }

    setIsTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(loc);
        
        // Update map center to follow user
        if (mapRef.current && routeDestination) {
          mapRef.current.panTo(loc);
        }
      },
      (error) => {
        console.error('Tracking error:', error);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );

    toast({ title: 'تتبع الموقع', description: 'تم تفعيل تتبع موقعك الحالي' });
  };

  // Stop live tracking
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    toast({ title: 'إيقاف التتبع', description: 'تم إيقاف تتبع الموقع' });
  };

  const navigateToItem = (lat: number, lng: number) => {
    if (!userLocation) {
      getCurrentLocation();
      toast({ title: 'تنبيه', description: 'يرجى تحديد موقعك أولاً' });
      return;
    }
    setRouteDestination([lat, lng]);
    setSelectedItem(null);
  };

  const clearRoute = () => {
    setRouteDestination(null);
    stopTracking();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    // If there's a match, zoom to first result
    if (query.trim()) {
      const matchedProperty = filteredProperties.find(p => 
        p.latitude && p.longitude && (
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.address.toLowerCase().includes(query.toLowerCase())
        )
      );
      
      const matchedHandyman = filteredHandymen.find(h => 
        h.latitude && h.longitude && (
          h.name?.toLowerCase().includes(query.toLowerCase()) ||
          h.specialty?.some(s => s.toLowerCase().includes(query.toLowerCase()))
        )
      );

      const match = matchedProperty || matchedHandyman;
      if (match && match.latitude && match.longitude && mapRef.current) {
        mapRef.current.flyTo([match.latitude, match.longitude], 15);
        setSelectedItem(match);
      }
    }
  };

  const isProperty = (item: Property | Handyman): item is Property => 'bedrooms' in item;

  // Calculate distance
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Map Container - Full screen behind everything */}
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0"
        style={{ zIndex: 1 }}
      />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80" style={{ zIndex: 500 }}>
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      )}

      {/* Header */}
      <motion.div 
        className="absolute top-0 left-0 right-0 p-4 safe-top"
        style={{ zIndex: 1000 }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <Button variant="glass" size="icon" onClick={onBack}>
            <X className="w-5 h-5" />
          </Button>
          
          {showSearch ? (
            <div className="flex-1 glass-card px-4 py-2 flex items-center gap-3">
              <Search className="w-5 h-5 text-primary" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="ابحث عن عقار أو حرفي..."
                className="border-none bg-transparent focus-visible:ring-0 p-0 h-auto text-foreground"
                autoFocus
              />
              <Button variant="ghost" size="sm" onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 glass-card px-4 py-3 flex items-center gap-3 cursor-pointer" onClick={() => setShowSearch(true)}>
                <Search className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">البحث في الخريطة...</span>
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
            </>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          {(['all', 'properties', 'handymen'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                viewMode === mode
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/80 backdrop-blur text-muted-foreground'
              }`}
            >
              {mode === 'all' ? 'الكل' : mode === 'properties' ? 'العقارات' : 'الحرفيين'}
            </button>
          ))}
        </div>

        {/* Route controls */}
        {routeDestination && (
          <div className="flex gap-2 mt-3">
            <Button 
              variant={isTracking ? 'default' : 'glass'}
              size="sm" 
              className="flex-1 gap-2"
              onClick={isTracking ? stopTracking : startTracking}
            >
              <Route className="w-4 h-4" />
              {isTracking ? 'إيقاف التتبع' : 'بدء التتبع'}
            </Button>
            <Button variant="destructive" size="sm" onClick={clearRoute}>
              <X className="w-4 h-4" />
              إلغاء
            </Button>
          </div>
        )}

        {/* Route info indicator */}
        {routeDestination && userLocation && (
          <div className="mt-2 glass-card px-4 py-3">
            {loadingRoute ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-muted-foreground text-sm">جاري حساب المسار...</span>
              </div>
            ) : routeInfo ? (
              <div className="flex items-center justify-around text-center">
                <div>
                  <span className="text-muted-foreground text-xs block">المسافة</span>
                  <span className="text-primary font-bold text-lg">{routeInfo.distance}</span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <span className="text-muted-foreground text-xs block">الوقت المتوقع</span>
                  <span className="text-primary font-bold text-lg">{routeInfo.duration}</span>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground text-center block">
                المسافة: {getDistance(userLocation[0], userLocation[1], routeDestination[0], routeDestination[1])} كم
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* Stats Badge */}
      <div className="absolute bottom-24 left-4 glass-card px-3 py-2 text-xs" style={{ zIndex: 1000 }}>
        <span className="text-muted-foreground">
          {filteredProperties.length} عقار • {filteredHandymen.length} حرفي
        </span>
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
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <Wrench className="w-6 h-6 text-white" />
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
                    <span key={idx} className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-sm">
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
