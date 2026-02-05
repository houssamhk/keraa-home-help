import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { AISearchBar } from '@/components/search/AISearchBar';
import { SearchAlertDialog } from '@/components/alerts/SearchAlertDialog';
import { PropertyCardSkeleton } from '@/components/common/PropertyCardSkeleton';
import { PropertyCard } from '@/components/property/PropertyCard';

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
  description?: string;
  owner_id?: string;
  is_featured?: boolean;
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

  useEffect(() => {
    fetchProperties();
  }, [filters]);

  const fetchProperties = async () => {
    setIsLoading(true);
    
    // First get featured property IDs
    const { data: featuredData } = await supabase
      .from('featured_listings')
      .select('property_id')
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());
    
    const featuredIds = new Set(featuredData?.map(f => f.property_id) || []);
    
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
      let filteredData = data.map(p => ({
        ...p,
        is_featured: featuredIds.has(p.id)
      })) as Property[];
      
      // Filter by amenities if specified
      if (filters.amenities && filters.amenities.length > 0) {
        filteredData = filteredData.filter(p => {
          if (!p.amenities) return false;
          return filters.amenities!.every(a => p.amenities!.includes(a));
        });
      }
      
      // Sort: featured properties first, then by date
      filteredData.sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return 0;
      });
      
      setProperties(filteredData);
    }
    setIsLoading(false);
  };

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
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
      amenities: ['heating', 'balcony'],
      description: 'شقة فاخرة تتكون من 3 غرف نوم وصالون كبير ومطبخ مجهز',
      owner_id: undefined
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
      amenities: ['garden', 'garage', 'pool'],
      description: 'فيلا فخمة مع حديقة واسعة ومسبح',
      owner_id: undefined
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
      amenities: ['furnished', 'wifi'],
      description: 'استوديو مفروش بالكامل قريب من البحر',
      owner_id: undefined
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
        
        {/* Alert Button */}
        <div className="mt-3 flex justify-end">
          <SearchAlertDialog initialFilters={filters} />
        </div>
      </motion.header>

      {/* Results Count */}
      <div className="px-6 pb-2">
        <p className="text-sm text-muted-foreground">
          {displayProperties.length} نتيجة
        </p>
      </div>

      {/* Properties Grid */}
      <div className="px-6 pb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <>
            <PropertyCardSkeleton />
            <PropertyCardSkeleton />
            <PropertyCardSkeleton />
          </>
        ) : (
          displayProperties.map((property, index) => (
            <PropertyCard
              key={property.id}
              property={property}
              index={index}
              onClick={() => onViewProperty(property)}
            />
          ))
        )}
      </div>
    </div>
  );
}
