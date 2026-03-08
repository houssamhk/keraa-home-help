import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { Home, Wrench, Navigation, MapPin, Star, Loader2, X, ChevronDown, ChevronUp, Search, Route, SlidersHorizontal, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/i18n/LanguageContext';

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
  price_period?: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  latitude: number | null;
  longitude: number | null;
  images: string[] | null;
  property_type?: string | null;
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

const ALGERIA_CENTER: [number, number] = [36.7538, 3.0588];

const DEMO_PROPERTIES: Property[] = [
  { id: 'demo-1', title: 'شقة فاخرة في حيدرة', address: 'شارع ديدوش مراد', city: 'الجزائر', price: 45000, bedrooms: 3, bathrooms: 2, area_sqm: 120, latitude: 36.7650, longitude: 3.0522, images: [], property_type: 'apartment' },
  { id: 'demo-2', title: 'فيلا مع حديقة', address: 'بوزريعة', city: 'الجزائر', price: 120000, bedrooms: 5, bathrooms: 3, area_sqm: 300, latitude: 36.7780, longitude: 3.0150, images: [], property_type: 'villa' },
  { id: 'demo-3', title: 'استوديو مفروش', address: 'باب الوادي', city: 'الجزائر', price: 25000, bedrooms: 1, bathrooms: 1, area_sqm: 40, latitude: 36.7900, longitude: 3.0560, images: [], property_type: 'studio' },
  { id: 'demo-4', title: 'شقة عائلية', address: 'الدار البيضاء', city: 'الجزائر', price: 55000, bedrooms: 4, bathrooms: 2, area_sqm: 150, latitude: 36.7400, longitude: 3.0800, images: [], property_type: 'apartment' },
];

const DEMO_HANDYMEN: Handyman[] = [
  { id: 'demo-h1', user_id: 'demo-user-1', specialty: ['سباكة', 'كهرباء'], description: 'خبرة 10 سنوات', hourly_rate: 2000, rating: 4.8, total_reviews: 45, is_available: true, latitude: 36.7600, longitude: 3.0400, name: 'أحمد السباك' },
  { id: 'demo-h2', user_id: 'demo-user-2', specialty: ['دهان', 'نجارة'], description: 'متخصص في الدهان', hourly_rate: 1800, rating: 4.5, total_reviews: 32, is_available: true, latitude: 36.7750, longitude: 3.0650, name: 'محمد الدهان' },
  { id: 'demo-h3', user_id: 'demo-user-3', specialty: ['تكييف', 'كهرباء'], description: 'صيانة المكيفات', hourly_rate: 2500, rating: 4.9, total_reviews: 67, is_available: true, latitude: 36.7480, longitude: 3.0320, name: 'كريم التكييف' },
];

type ViewMode = 'all' | 'properties' | 'handymen';
type BottomView = 'none' | 'detail' | 'nearby';

// Haversine distance in km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export function LeafletMap({ onBack, onViewProperty, onViewHandyman }: LeafletMapProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const markerClusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routeMarkersRef = useRef<L.Marker[]>([]);
  const watchIdRef = useRef<number | null>(null);

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
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number]>([200000]);
  const [bottomView, setBottomView] = useState<BottomView>('none');

  // Custom icons
  const propertyIcon = useMemo(() => new L.DivIcon({
    className: 'custom-marker',
    html: `<div style="background: linear-gradient(135deg, hsl(195 70% 36%), hsl(195 65% 50%)); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid white;">
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

  // Filtered items
  const filteredProperties = useMemo(() => {
    let result = properties;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) || p.city.toLowerCase().includes(q));
    }
    result = result.filter(p => p.price <= priceRange[0]);
    return result;
  }, [properties, searchQuery, priceRange]);

  const filteredHandymen = useMemo(() => {
    if (!searchQuery.trim()) return handymen;
    const q = searchQuery.toLowerCase();
    return handymen.filter(h => h.name?.toLowerCase().includes(q) || h.specialty?.some(s => s.toLowerCase().includes(q)));
  }, [handymen, searchQuery]);

  // Nearby properties sorted by distance
  const nearbyProperties = useMemo(() => {
    if (!userLocation) return [];
    return filteredProperties
      .filter(p => p.latitude && p.longitude)
      .map(p => ({ ...p, distance: haversine(userLocation[0], userLocation[1], p.latitude!, p.longitude!) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);
  }, [userLocation, filteredProperties]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const initMap = () => {
      if (!mapContainerRef.current) return;
      const map = L.map(mapContainerRef.current, { center: ALGERIA_CENTER, zoom: 12, zoomControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapRef.current = map;
      setTimeout(() => { map.invalidateSize(); setMapReady(true); }, 100);
    };
    requestAnimationFrame(() => setTimeout(initMap, 50));
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => mapRef.current?.invalidateSize();
    const handleVisibility = () => { if (!document.hidden && mapRef.current) setTimeout(() => mapRef.current?.invalidateSize(), 100); };
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { window.removeEventListener('resize', handleResize); document.removeEventListener('visibilitychange', handleVisibility); };
  }, []);

  // Fetch data
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('id, title, address, city, price, price_period, bedrooms, bathrooms, area_sqm, latitude, longitude, images, property_type')
        .eq('is_available', true);
      if (propertiesData?.length) {
        const real = propertiesData.filter(p => p.latitude && p.longitude);
        setProperties([...real, ...DEMO_PROPERTIES]);
      }
      const { data: handymenData } = await supabase
        .from('handymen')
        .select('id, user_id, specialty, description, hourly_rate, rating, total_reviews, is_available, latitude, longitude')
        .eq('is_available', true);
      if (handymenData?.length) {
        const real = handymenData.filter(h => h.latitude && h.longitude).map(h => ({ ...h, name: `حرفي ${h.specialty?.[0] || ''}` }));
        setHandymen([...real, ...DEMO_HANDYMEN]);
      }
    } catch (error) { console.error('Fetch error:', error); }
    setLoading(false);
  };

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    if (markerClusterRef.current) { markerClusterRef.current.clearLayers(); mapRef.current.removeLayer(markerClusterRef.current); }
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    markerClusterRef.current = (L as any).markerClusterGroup({
      chunkedLoading: true, maxClusterRadius: 60, spiderfyOnMaxZoom: true, showCoverageOnHover: false, zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        const sz = count > 30 ? 60 : count > 10 ? 50 : 40;
        return L.divIcon({
          html: `<div style="background: linear-gradient(135deg, hsl(195 70% 36%), hsl(195 65% 50%)); width: ${sz}px; height: ${sz}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: ${sz > 50 ? 18 : 14}px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid white;">${count}</div>`,
          className: 'marker-cluster',
          iconSize: L.point(sz, sz),
        });
      },
    });

    if (viewMode === 'all' || viewMode === 'properties') {
      filteredProperties.forEach(p => {
        if (p.latitude && p.longitude) {
          const priceLabel = `${(p.price / 1000).toFixed(0)}K`;
          const priceIcon = new L.DivIcon({
            className: 'custom-marker',
            html: `<div style="background: hsl(195 70% 36%); color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid white;">${priceLabel} دج</div>`,
            iconSize: [0, 0],
            iconAnchor: [30, 15],
          });
          const marker = L.marker([p.latitude, p.longitude], { icon: priceIcon })
            .on('click', () => { setSelectedItem(p); setBottomView('detail'); });
          markerClusterRef.current?.addLayer(marker);
          markersRef.current.push(marker);
        }
      });
    }

    if (viewMode === 'all' || viewMode === 'handymen') {
      filteredHandymen.forEach(h => {
        if (h.latitude && h.longitude) {
          const marker = L.marker([h.latitude, h.longitude], { icon: handymanIcon })
            .on('click', () => { setSelectedItem(h); setBottomView('detail'); });
          markerClusterRef.current?.addLayer(marker);
          markersRef.current.push(marker);
        }
      });
    }

    if (markerClusterRef.current) mapRef.current.addLayer(markerClusterRef.current);
  }, [filteredProperties, filteredHandymen, viewMode, mapReady, handymanIcon]);

  // User location marker
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
    if (userLocation) {
      userMarkerRef.current = L.marker(userLocation, { icon: userLocationIcon }).addTo(mapRef.current)
        .bindPopup('<div class="text-center p-2 font-semibold">موقعك الحالي</div>');
      if (!routeDestination) mapRef.current.flyTo(userLocation, 14);
    }
  }, [userLocation, mapReady, userLocationIcon, routeDestination]);

  // Route
  const fetchRoute = async (start: [number, number], end: [number, number]) => {
    setLoadingRoute(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.code === 'Ok' && data.routes?.length) {
        const route = data.routes[0];
        setRouteInfo({ distance: `${(route.distance / 1000).toFixed(1)} كم`, duration: `${Math.round(route.duration / 60)} دقيقة` });
        return route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
      }
      return null;
    } catch { return null; } finally { setLoadingRoute(false); }
  };

  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    if (routeLayerRef.current) { routeLayerRef.current.remove(); routeLayerRef.current = null; }
    routeMarkersRef.current.forEach(m => m.remove());
    routeMarkersRef.current = [];
    setRouteInfo(null);

    if (userLocation && routeDestination) {
      fetchRoute(userLocation, routeDestination).then(coords => {
        if (!mapRef.current) return;
        const path = coords || [userLocation, routeDestination];
        routeLayerRef.current = L.polyline(path, { color: '#3b82f6', weight: 6, opacity: 0.9, lineJoin: 'round', lineCap: 'round' }).addTo(mapRef.current);
        const destMarker = L.marker(routeDestination, { icon: destinationIcon }).addTo(mapRef.current);
        routeMarkersRef.current.push(destMarker);
        mapRef.current.fitBounds(L.latLngBounds(path), { padding: [80, 80] });
      });
    }
  }, [userLocation, routeDestination, mapReady, destinationIcon]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) { toast({ title: 'خطأ', description: 'المتصفح لا يدعم تحديد الموقع', variant: 'destructive' }); return; }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation([pos.coords.latitude, pos.coords.longitude]); setGettingLocation(false); toast({ title: 'تم تحديد موقعك' }); },
      () => { setGettingLocation(false); toast({ title: 'خطأ', description: 'فشل تحديد الموقع', variant: 'destructive' }); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [toast]);

  const startTracking = () => {
    if (!navigator.geolocation) return;
    setIsTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => { const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude]; setUserLocation(loc); if (mapRef.current && routeDestination) mapRef.current.panTo(loc); },
      () => {},
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setIsTracking(false);
  };

  const navigateToItem = (lat: number, lng: number) => {
    if (!userLocation) { getCurrentLocation(); return; }
    setRouteDestination([lat, lng]);
    setBottomView('none');
    setSelectedItem(null);
  };

  const clearRoute = () => { setRouteDestination(null); stopTracking(); };

  const isProperty = (item: Property | Handyman): item is Property => 'bedrooms' in item;

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <div ref={mapContainerRef} className="absolute inset-0" style={{ zIndex: 1 }} />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80" style={{ zIndex: 500 }}>
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      )}

      {/* Header */}
      <motion.div className="absolute top-0 left-0 right-0 p-4 safe-top" style={{ zIndex: 1000 }} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <Button variant="glass" size="icon" onClick={onBack}><X className="w-5 h-5" /></Button>
          
          {showSearch ? (
            <div className="flex-1 glass-card px-4 py-2 flex items-center gap-3">
              <Search className="w-5 h-5 text-primary" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ابحث عن عقار أو حرفي..." className="border-none bg-transparent focus-visible:ring-0 p-0 h-auto text-foreground" autoFocus />
              <Button variant="ghost" size="sm" onClick={() => { setShowSearch(false); setSearchQuery(''); }}><X className="w-4 h-4" /></Button>
            </div>
          ) : (
            <>
              <div className="flex-1 glass-card px-4 py-3 flex items-center gap-3 cursor-pointer" onClick={() => setShowSearch(true)}>
                <Search className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">البحث في الخريطة...</span>
              </div>
              <Button variant="glass" size="icon" onClick={getCurrentLocation} disabled={gettingLocation}>
                {gettingLocation ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
              </Button>
            </>
          )}
        </div>

        {/* View mode + filter toggle */}
        <div className="flex gap-2 mt-3 items-center">
          {(['all', 'properties', 'handymen'] as ViewMode[]).map((mode) => (
            <button key={mode} onClick={() => setViewMode(mode)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${viewMode === mode ? 'bg-primary text-primary-foreground' : 'bg-muted/80 backdrop-blur text-muted-foreground'}`}>
              {mode === 'all' ? 'الكل' : mode === 'properties' ? 'العقارات' : 'الحرفيين'}
            </button>
          ))}
          <div className="flex-1" />
          <Button variant="glass" size="icon" className="h-9 w-9" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
          {userLocation && (
            <Button variant="glass" size="icon" className="h-9 w-9" onClick={() => setBottomView(bottomView === 'nearby' ? 'none' : 'nearby')}>
              <List className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Price filter slider */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="glass-card px-4 py-3 mt-2">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">أقصى سعر</span>
                  <span className="text-primary font-bold">{priceRange[0].toLocaleString('ar-DZ')} دج</span>
                </div>
                <Slider value={priceRange} onValueChange={(v) => setPriceRange(v as [number])} max={300000} min={5000} step={5000} className="w-full" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Route controls */}
        {routeDestination && (
          <div className="flex gap-2 mt-3">
            <Button variant={isTracking ? 'default' : 'glass'} size="sm" className="flex-1 gap-2" onClick={isTracking ? stopTracking : startTracking}>
              <Route className="w-4 h-4" />{isTracking ? 'إيقاف التتبع' : 'بدء التتبع'}
            </Button>
            <Button variant="destructive" size="sm" onClick={clearRoute}><X className="w-4 h-4" /> إلغاء</Button>
          </div>
        )}

        {/* Route info */}
        {routeDestination && userLocation && (
          <div className="mt-2 glass-card px-4 py-3">
            {loadingRoute ? (
              <div className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-primary" /><span className="text-muted-foreground text-sm">جاري حساب المسار...</span></div>
            ) : routeInfo ? (
              <div className="flex items-center justify-around text-center">
                <div><span className="text-muted-foreground text-xs block">المسافة</span><span className="text-primary font-bold text-lg">{routeInfo.distance}</span></div>
                <div className="h-8 w-px bg-border" />
                <div><span className="text-muted-foreground text-xs block">الوقت المتوقع</span><span className="text-primary font-bold text-lg">{routeInfo.duration}</span></div>
              </div>
            ) : (
              <span className="text-muted-foreground text-center block">
                المسافة: {haversine(userLocation[0], userLocation[1], routeDestination[0], routeDestination[1]).toFixed(1)} كم
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* Stats */}
      <div className="absolute bottom-24 left-4 glass-card px-3 py-2 text-xs" style={{ zIndex: 1000 }}>
        <span className="text-muted-foreground">{filteredProperties.length} عقار • {filteredHandymen.length} حرفي</span>
      </div>

      {/* Bottom Sheet: Selected Item Detail */}
      <AnimatePresence>
        {bottomView === 'detail' && selectedItem && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl border-t border-border p-5 pb-8 z-[1000]">
            {isProperty(selectedItem) ? (
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-serif text-lg font-bold text-foreground line-clamp-1">{selectedItem.title}</h3>
                    <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" />{selectedItem.city}، {selectedItem.address}</p>
                  </div>
                  <button onClick={() => { setSelectedItem(null); setBottomView('none'); }} className="p-2 -m-2"><ChevronDown className="w-5 h-5 text-muted-foreground" /></button>
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="gold-text font-bold text-xl">{selectedItem.price?.toLocaleString('ar-DZ')} دج</span>
                  <span className="text-muted-foreground text-sm">/{selectedItem.price_period === 'day' ? 'يوم' : 'شهر'}</span>
                </div>
                <div className="flex gap-4 mb-4 text-sm text-muted-foreground">
                  <span>{selectedItem.bedrooms || 0} غرف</span><span>•</span>
                  <span>{selectedItem.bathrooms || 0} حمام</span><span>•</span>
                  <span>{selectedItem.area_sqm || 0} م²</span>
                  {userLocation && selectedItem.latitude && selectedItem.longitude && (
                    <><span>•</span><span className="text-primary font-medium">{haversine(userLocation[0], userLocation[1], selectedItem.latitude, selectedItem.longitude).toFixed(1)} كم</span></>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="default" className="flex-1 gap-2" onClick={() => onViewProperty?.(selectedItem.id)}><Home className="w-4 h-4" />عرض التفاصيل</Button>
                  <Button variant="outline" size="icon" onClick={() => navigateToItem(selectedItem.latitude!, selectedItem.longitude!)}><Navigation className="w-5 h-5" /></Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center"><Wrench className="w-5 h-5 text-white" /></div>
                    <div>
                      <h3 className="font-serif text-lg font-bold text-foreground">{selectedItem.name || 'حرفي'}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                        <span className="text-foreground text-sm font-medium">{selectedItem.rating || 0}</span>
                        <span className="text-muted-foreground text-xs">({selectedItem.total_reviews || 0})</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedItem(null); setBottomView('none'); }} className="p-2 -m-2"><ChevronDown className="w-5 h-5 text-muted-foreground" /></button>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selectedItem.specialty?.slice(0, 3).map((s, i) => (
                    <span key={i} className="px-2.5 py-1 bg-green-500/10 text-green-500 rounded-full text-xs">{s}</span>
                  ))}
                </div>
                {selectedItem.hourly_rate && <p className="text-sm text-muted-foreground mb-3"><span className="gold-text font-bold">{selectedItem.hourly_rate} دج</span> /ساعة</p>}
                <div className="flex gap-3">
                  <Button variant="default" className="flex-1 gap-2" onClick={() => onViewHandyman?.(selectedItem.id)}><Wrench className="w-4 h-4" />عرض التفاصيل</Button>
                  <Button variant="outline" size="icon" onClick={() => navigateToItem(selectedItem.latitude!, selectedItem.longitude!)}><Navigation className="w-5 h-5" /></Button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Bottom Sheet: Nearby Properties List */}
        {bottomView === 'nearby' && userLocation && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl border-t border-border z-[1000] max-h-[50vh] flex flex-col">
            <div className="px-5 py-4 flex items-center justify-between border-b border-border shrink-0">
              <h3 className="font-bold text-foreground">أقرب العقارات إليك</h3>
              <button onClick={() => setBottomView('none')} className="p-1"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="overflow-auto flex-1 px-4 py-2">
              {nearbyProperties.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">لا توجد عقارات قريبة</p>
              ) : nearbyProperties.map((p) => (
                <button key={p.id} className="w-full flex items-center gap-3 py-3 border-b border-border/50 last:border-0 text-start"
                  onClick={() => {
                    setSelectedItem(p);
                    setBottomView('detail');
                    if (mapRef.current && p.latitude && p.longitude) mapRef.current.flyTo([p.latitude, p.longitude], 15);
                  }}>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Home className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground line-clamp-1">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.city} • {p.bedrooms} غرف</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-sm font-bold text-primary">{(p.price / 1000).toFixed(0)}K دج</p>
                    <p className="text-xs text-muted-foreground">{p.distance.toFixed(1)} كم</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LeafletMap;
