import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { AISearchBar } from '@/components/search/AISearchBar';
import { SearchAlertDialog } from '@/components/alerts/SearchAlertDialog';
import { PropertyCardSkeleton } from '@/components/common/PropertyCardSkeleton';
import { PropertyCard } from '@/components/property/PropertyCard';
import { CompareProperties } from '@/components/property/CompareProperties';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';

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
  const [compareList, setCompareList] = useState<Property[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const { t, dir } = useLanguage();

  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    fetchProperties();
  }, [filters]);

  const fetchProperties = async () => {
    setIsLoading(true);
    
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

    if (filters.city) query = query.ilike('city', `%${filters.city}%`);
    if (filters.property_type) query = query.eq('property_type', filters.property_type);
    if (filters.bedrooms) query = query.eq('bedrooms', filters.bedrooms);
    if (filters.max_price) query = query.lte('price', filters.max_price);
    if (filters.min_price) query = query.gte('price', filters.min_price);

    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (!error && data) {
      let filteredData = data.map(p => ({
        ...p,
        is_featured: featuredIds.has(p.id)
      })) as Property[];
      
      if (filters.amenities && filters.amenities.length > 0) {
        filteredData = filteredData.filter(p => {
          if (!p.amenities) return false;
          return filters.amenities!.every(a => p.amenities!.includes(a));
        });
      }
      
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

  const toggleCompare = (property: Property) => {
    setCompareList((prev) => {
      const exists = prev.find((p) => p.id === property.id);
      if (exists) return prev.filter((p) => p.id !== property.id);
      if (prev.length >= 3) {
        toast.info('يمكنك مقارنة 3 عقارات كحد أقصى');
        return prev;
      }
      return [...prev, property];
    });
  };

  const displayProperties = properties;

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-4"
      >
        <div className="flex items-center gap-4 mb-4">
          <Button variant="glass" size="icon" onClick={onBack}>
            <BackArrow className="w-5 h-5" />
          </Button>
          <h1 className="font-serif text-2xl font-bold text-foreground">{t.propertiesPage.title}</h1>
        </div>

        <AISearchBar onFiltersChange={handleFiltersChange} />
        
        <div className="mt-3 flex justify-between items-center">
          <SearchAlertDialog initialFilters={filters} />
          {compareList.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowCompare(true)} className="gap-2">
              <Scale className="w-4 h-4" />
              مقارنة ({compareList.length})
            </Button>
          )}
        </div>
      </motion.header>

      <div className="px-6 pb-2">
        <p className="text-sm text-muted-foreground">
          {displayProperties.length} {t.result}
        </p>
      </div>

      <div className="px-6 pb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <>
            <PropertyCardSkeleton />
            <PropertyCardSkeleton />
            <PropertyCardSkeleton />
          </>
        ) : (
          displayProperties.map((property, index) => (
            <div key={property.id} className="relative">
              <PropertyCard
                property={property}
                index={index}
                onClick={() => onViewProperty(property)}
              />
              <button
                onClick={(e) => { e.stopPropagation(); toggleCompare(property); }}
                className={`absolute bottom-4 left-4 w-8 h-8 rounded-full flex items-center justify-center transition-all z-10 ${
                  compareList.find((p) => p.id === property.id) 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card/80 backdrop-blur-sm text-muted-foreground border border-border'
                }`}
              >
                <Scale className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Compare overlay */}
      <AnimatePresence>
        {showCompare && compareList.length >= 2 && (
          <CompareProperties
            properties={compareList}
            onRemove={(id) => setCompareList((prev) => prev.filter((p) => p.id !== id))}
            onClose={() => setShowCompare(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}