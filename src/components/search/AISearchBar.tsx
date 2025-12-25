import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Loader2, X, MapPin, Home, Thermometer, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SearchFilters {
  city?: string;
  property_type?: string;
  bedrooms?: number;
  min_price?: number;
  max_price?: number;
  amenities?: string[];
  search_text?: string;
}

interface AISearchBarProps {
  onFiltersChange: (filters: SearchFilters) => void;
  placeholder?: string;
}

const amenityLabels: Record<string, string> = {
  heating: 'تدفئة',
  ac: 'تكييف',
  pool: 'مسبح',
  garage: 'كراج',
  garden: 'حديقة',
  balcony: 'شرفة',
  elevator: 'مصعد',
  wifi: 'واي فاي',
  furnished: 'مفروشة',
};

const propertyTypeLabels: Record<string, string> = {
  apartment: 'شقة',
  villa: 'فيلا',
  house: 'منزل',
  studio: 'ستوديو',
};

export const AISearchBar: React.FC<AISearchBarProps> = ({ 
  onFiltersChange,
  placeholder = 'حوس على F3 في وهران فيها شوفاج...'
}) => {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SearchFilters | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: { query: query.trim() }
      });

      if (error) throw error;

      if (data?.filters) {
        setActiveFilters(data.filters);
        onFiltersChange(data.filters);
        
        toast({
          title: 'تم فهم البحث',
          description: 'تم تحليل طلبك وتطبيق الفلاتر',
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'خطأ في البحث',
        description: 'حاول مرة أخرى',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const clearFilters = () => {
    setActiveFilters(null);
    setQuery('');
    onFiltersChange({});
  };

  const removeFilter = (key: keyof SearchFilters) => {
    if (!activeFilters) return;
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setActiveFilters(Object.keys(newFilters).length > 0 ? newFilters : null);
    onFiltersChange(newFilters);
  };

  return (
    <div className="w-full space-y-3">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={placeholder}
          className="pr-10 pl-24 py-6 text-base bg-card border-border"
          dir="auto"
        />
        <div className="absolute left-2 top-1/2 -translate-y-1/2">
          <Button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Search className="w-4 h-4 ml-1" />
                بحث
              </>
            )}
          </Button>
        </div>
      </div>

      {/* AI Hint */}
      <p className="text-xs text-muted-foreground text-center">
        💡 جرب: "حوس على F3 في وهران فيها شوفاج" أو "appartement à Alger avec garage"
      </p>

      {/* Active Filters */}
      <AnimatePresence>
        {activeFilters && Object.keys(activeFilters).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap gap-2 items-center"
          >
            <span className="text-xs text-muted-foreground">الفلاتر النشطة:</span>
            
            {activeFilters.city && (
              <Badge variant="secondary" className="gap-1">
                <MapPin className="w-3 h-3" />
                {activeFilters.city}
                <button onClick={() => removeFilter('city')}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {activeFilters.property_type && (
              <Badge variant="secondary" className="gap-1">
                <Home className="w-3 h-3" />
                {propertyTypeLabels[activeFilters.property_type] || activeFilters.property_type}
                <button onClick={() => removeFilter('property_type')}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {activeFilters.bedrooms && (
              <Badge variant="secondary" className="gap-1">
                {activeFilters.bedrooms} غرف
                <button onClick={() => removeFilter('bedrooms')}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {activeFilters.max_price && (
              <Badge variant="secondary" className="gap-1">
                <DollarSign className="w-3 h-3" />
                أقل من {activeFilters.max_price.toLocaleString()} دج
                <button onClick={() => removeFilter('max_price')}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {activeFilters.amenities?.map((amenity) => (
              <Badge key={amenity} variant="secondary" className="gap-1">
                <Thermometer className="w-3 h-3" />
                {amenityLabels[amenity] || amenity}
              </Badge>
            ))}

            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs text-muted-foreground"
            >
              مسح الكل
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AISearchBar;
