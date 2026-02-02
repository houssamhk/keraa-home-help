import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMap } from 'react-leaflet';
import { motion } from 'framer-motion';
import { MapPin, Home, Wrench, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import 'leaflet/dist/leaflet.css';

interface LocationData {
  latitude: number;
  longitude: number;
  count: number;
  type: 'property' | 'handyman' | 'search';
}

interface CityStats {
  city: string;
  propertyCount: number;
  handymanCount: number;
  viewCount: number;
}

export function DemandHeatmap() {
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [cityStats, setCityStats] = useState<CityStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.0339, 1.6596]); // Algeria center

  useEffect(() => {
    fetchDemandData();
  }, []);

  const fetchDemandData = async () => {
    setIsLoading(true);

    try {
      // Fetch properties with location
      const { data: properties } = await supabase
        .from('properties')
        .select('latitude, longitude, city')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      // Fetch handymen with location
      const { data: handymen } = await supabase
        .from('handymen')
        .select('latitude, longitude')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      // Fetch property views for demand analysis
      const { data: views } = await supabase
        .from('property_views')
        .select('property_id, properties(latitude, longitude, city)')
        .not('properties.latitude', 'is', null);

      // Aggregate location data
      const locData: LocationData[] = [];

      // Add properties
      if (properties) {
        const propLocationMap = new Map<string, number>();
        properties.forEach(p => {
          if (p.latitude && p.longitude) {
            const key = `${Math.round(p.latitude * 10) / 10},${Math.round(p.longitude * 10) / 10}`;
            propLocationMap.set(key, (propLocationMap.get(key) || 0) + 1);
          }
        });
        propLocationMap.forEach((count, key) => {
          const [lat, lng] = key.split(',').map(Number);
          locData.push({ latitude: lat, longitude: lng, count, type: 'property' });
        });
      }

      // Add handymen
      if (handymen) {
        const handyLocationMap = new Map<string, number>();
        handymen.forEach(h => {
          if (h.latitude && h.longitude) {
            const key = `${Math.round(h.latitude * 10) / 10},${Math.round(h.longitude * 10) / 10}`;
            handyLocationMap.set(key, (handyLocationMap.get(key) || 0) + 1);
          }
        });
        handyLocationMap.forEach((count, key) => {
          const [lat, lng] = key.split(',').map(Number);
          locData.push({ latitude: lat, longitude: lng, count, type: 'handyman' });
        });
      }

      setLocationData(locData);

      // Calculate city stats
      if (properties) {
        const cityMap = new Map<string, CityStats>();
        
        properties.forEach(p => {
          if (p.city) {
            const existing = cityMap.get(p.city) || { 
              city: p.city, 
              propertyCount: 0, 
              handymanCount: 0, 
              viewCount: 0 
            };
            existing.propertyCount++;
            cityMap.set(p.city, existing);
          }
        });

        // Add view counts
        if (views) {
          views.forEach((v: any) => {
            if (v.properties?.city) {
              const existing = cityMap.get(v.properties.city);
              if (existing) {
                existing.viewCount++;
              }
            }
          });
        }

        const stats = Array.from(cityMap.values())
          .sort((a, b) => (b.propertyCount + b.viewCount) - (a.propertyCount + a.viewCount))
          .slice(0, 10);

        setCityStats(stats);
      }
    } catch (error) {
      console.error('Error fetching demand data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getHeatColor = (count: number, type: 'property' | 'handyman' | 'search') => {
    const intensity = Math.min(count / 10, 1);
    if (type === 'property') {
      return { color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.3 + intensity * 0.4 };
    } else if (type === 'handyman') {
      return { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.3 + intensity * 0.4 };
    }
    return { color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.3 + intensity * 0.4 };
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500" />
          <span className="text-sm text-muted-foreground">عقارات</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          <span className="text-sm text-muted-foreground">حرفيون</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-yellow-500" />
          <span className="text-sm text-muted-foreground">طلب مرتفع</span>
        </div>
      </div>

      {/* Map */}
      <div className="h-96 rounded-lg overflow-hidden border border-border">
        <MapContainer
          center={mapCenter}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {locationData.map((loc, index) => {
            const style = getHeatColor(loc.count, loc.type);
            const radius = Math.min(5000 + loc.count * 2000, 50000);
            
            return (
              <Circle
                key={`${loc.type}-${index}`}
                center={[loc.latitude, loc.longitude]}
                radius={radius}
                pathOptions={style}
              >
                <Popup>
                  <div className="text-center p-2">
                    <p className="font-bold">
                      {loc.type === 'property' ? 'عقارات' : 'حرفيون'}
                    </p>
                    <p className="text-lg">{loc.count}</p>
                  </div>
                </Popup>
              </Circle>
            );
          })}
        </MapContainer>
      </div>

      {/* City Statistics */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          إحصائيات المدن الأكثر طلباً
        </h3>
        
        {cityStats.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">لا توجد بيانات كافية</p>
        ) : (
          <div className="grid gap-3">
            {cityStats.map((city, index) => (
              <motion.div
                key={city.city}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {index + 1}
                  </span>
                  <span className="font-medium text-foreground">{city.city}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-green-400">
                    <Home className="w-4 h-4" />
                    {city.propertyCount}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    👁 {city.viewCount}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
