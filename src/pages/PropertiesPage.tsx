import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Search, Filter, MapPin, Bed, Bath, Ruler, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

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
}

interface PropertiesPageProps {
  onBack: () => void;
  onViewProperty: (property: Property) => void;
}

export function PropertiesPage({ onBack, onViewProperty }: PropertiesPageProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('is_available', true)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setProperties(data as Property[]);
    }
    setIsLoading(false);
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

  const filteredProperties = properties.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
  const displayProperties = filteredProperties.length > 0 ? filteredProperties : [
    {
      id: '1',
      title: 'شقة فاخرة في حيدرة',
      address: 'شارع ديدوش مراد',
      city: 'الجزائر العاصمة',
      price: 45000,
      price_period: 'month',
      property_type: 'apartment',
      bedrooms: 3,
      bathrooms: 2,
      area_sqm: 120,
      images: []
    },
    {
      id: '2',
      title: 'فيلا مع حديقة',
      address: 'بن عكنون',
      city: 'الجزائر العاصمة',
      price: 120000,
      price_period: 'month',
      property_type: 'villa',
      bedrooms: 5,
      bathrooms: 3,
      area_sqm: 350,
      images: []
    },
    {
      id: '3',
      title: 'استوديو مفروش',
      address: 'باب الزوار',
      city: 'الجزائر العاصمة',
      price: 25000,
      price_period: 'month',
      property_type: 'studio',
      bedrooms: 1,
      bathrooms: 1,
      area_sqm: 45,
      images: []
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

        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1 glass-card flex items-center gap-3 px-4 py-3">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن عقار..."
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
              dir="auto"
            />
          </div>
          <Button variant="glass" size="icon">
            <Filter className="w-5 h-5" />
          </Button>
        </div>
      </motion.header>

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
