import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Bed, Bath, Ruler, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { AISearchBar } from '@/components/search/AISearchBar';

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  price: number;
  price_period: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  area_sqm: number;
  images: string[];
  amenities?: string[];
}

interface SearchFilters {
  city?: string;
  property_type?: string;
  bedrooms?: number;
  min_price?: number;
  max_price?: number;
  amenities?: string[];
  search_text?: string;
}

interface PropertiesPageProps {
  onBack: () => void;
  onViewProperty: (property: Property) => void;
}

export function PropertiesPage({ onBack, onViewProperty }: PropertiesPageProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProperties();
  }, [filters]);

  const fetchProperties = async () => {
    setIsLoading(true);
    
    let query = supabase
      .from('properties')
      .select('*')
      .eq('is_available', true);

    // Apply filters
    if (filters.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }
    if (filters.property_type) {
      query = query.eq('property_type', filters.property_type);
    }
    if (filters.bedrooms) {
      query = query.eq('bedrooms', filters.bedrooms);
    }
    if (filters.max_price) {
      query = query.lte('price', filters.max_price);
    }
    if (filters.min_price) {
      query = query.gte('price', filters.min_price);
    }

    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (!error && data) {
      let filteredData = data as Property[];
      
      // Filter by amenities if specified
      if (filters.amenities && filters.amenities.length > 0) {
        filteredData = filteredData.filter(p => {
          if (!p.amenities) return false;
          return filters.amenities!.every(a => p.amenities!.includes(a));
        });
      }
      
      setProperties(filteredData);
    }
    setIsLoading(false);
  };

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatPrice = (price: number, period: string) => {
    const periodText = {
      day: 'يوم',
      week: 'أسبوع',
      month: 'شهر',
      year: 'سنة'
    }[period] || 'شهر';
    
    return `${price.toLocaleString('ar-DZ')} دج/${periodText}`;
  };

  const getPropertyTypeText = (type: string) => {
    return {
      apartment: 'شقة',
      house: 'منزل',
      villa: 'فيلا',
      studio: 'استوديو',
      room: 'غرفة'
    }[type] || type;
  };

  // Sample properties for demo if none exist
  const displayProperties = properties.length > 0 ? properties : [
    {
      id: '1',
      title: 'شقة فاخرة في حيدرة',
      address: 'شارع ديدوش مراد',
      city: 'الجزائر',
      price: 45000,
      price_period: 'month',
      property_type: 'apartment',
      bedrooms: 3,
      bathrooms: 2,
      area_sqm: 120,
      images: [],
      amenities: ['heating', 'balcony']
    },
    {
      id: '2',
      title: 'فيلا مع حديقة',
      address: 'بن عكنون',
      city: 'الجزائر',
      price: 120000,
      price_period: 'month',
      property_type: 'villa',
      bedrooms: 5,
      bathrooms: 3,
      area_sqm: 350,
      images: [],
      amenities: ['garden', 'garage', 'pool']
    },
    {
      id: '3',
      title: 'استوديو مفروش في وهران',
      address: 'الجزيرة',
      city: 'وهران',
      price: 25000,
      price_period: 'month',
      property_type: 'studio',
      bedrooms: 1,
      bathrooms: 1,
      area_sqm: 45,
      images: [],
      amenities: ['furnished', 'wifi']
    }
  ];

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-4"
      >
        <div className="flex items-center gap-4 mb-4">
          <Button variant="glass" size="icon" onClick={onBack}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="font-serif text-2xl font-bold text-foreground">العقارات</h1>
        </div>

        {/* AI Search Bar */}
        <AISearchBar onFiltersChange={handleFiltersChange} />
      </motion.header>

      {/* Results Count */}
      <div className="px-6 pb-2">
        <p className="text-sm text-muted-foreground">
          {displayProperties.length} نتيجة
        </p>
      </div>

      {/* Properties List */}
      <div className="px-6 pb-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          displayProperties.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card overflow-hidden"
              onClick={() => onViewProperty(property)}
            >
              {/* Image placeholder */}
              <div className="relative h-48 bg-gradient-to-br from-muted to-surface-elevated flex items-center justify-center">
                <span className="text-muted-foreground text-sm">
                  {getPropertyTypeText(property.property_type)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(property.id);
                  }}
                  className="absolute top-3 left-3 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
                >
                  <Heart
                    className={`w-5 h-5 ${favorites.has(property.id) ? 'fill-primary text-primary' : 'text-foreground'}`}
                  />
                </button>
                <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  {formatPrice(property.price, property.price_period)}
                </div>
              </div>

              {/* Details */}
              <div className="p-4">
                <h3 className="font-semibold text-foreground text-lg mb-2">{property.title}</h3>
                
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>{property.address}، {property.city}</span>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Bed className="w-4 h-4" />
                    <span>{property.bedrooms}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bath className="w-4 h-4" />
                    <span>{property.bathrooms}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Ruler className="w-4 h-4" />
                    <span>{property.area_sqm} م²</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
