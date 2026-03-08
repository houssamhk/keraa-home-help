import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Heart, MapPin, Bed, Bath, Ruler, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { PropertyCardSkeleton } from '@/components/common/PropertyCardSkeleton';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useLanguage } from '@/i18n/LanguageContext';

interface Property {
  id: string; title: string; address: string; city: string; price: number;
  price_period: string; property_type: string; bedrooms: number; bathrooms: number; area_sqm: number; images: string[];
}

interface FavoritesPageProps { onBack: () => void; onViewProperty: (property: Property) => void; }

export function FavoritesPage({ onBack, onViewProperty }: FavoritesPageProps) {
  const { user } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();
  const { t, dir } = useLanguage();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  useEffect(() => { fetchFavoriteProperties(); }, [favorites]);

  const fetchFavoriteProperties = async () => {
    if (!user || favorites.size === 0) { setProperties([]); setIsLoading(false); return; }
    setIsLoading(true);
    const { data, error } = await supabase.from('properties').select('*').in('id', Array.from(favorites));
    if (!error && data) setProperties(data as Property[]);
    setIsLoading(false);
  };

  const handleRemove = async (propertyId: string) => { await toggleFavorite(propertyId); setRemoveConfirm(null); };

  const formatPrice = (price: number, period: string) => {
    const periodText = { day: t.favoritesPage.day, week: t.favoritesPage.week, month: t.favoritesPage.month, year: t.favoritesPage.year }[period] || t.favoritesPage.month;
    return `${price.toLocaleString()} ${t.currency}/${periodText}`;
  };

  const getPropertyTypeText = (type: string) => {
    return { apartment: t.propertiesPage.apartment, house: t.propertiesPage.house, villa: t.propertiesPage.villa, studio: t.propertiesPage.studio, room: t.propertiesPage.room }[type] || type;
  };

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="glass" size="icon" onClick={onBack}><BackArrow className="w-5 h-5" /></Button>
          <h1 className="font-serif text-2xl font-bold text-foreground">{t.favoritesPage.title}</h1>
        </div>
      </motion.header>
      <div className="px-6 pb-6 space-y-4">
        {isLoading ? (<><PropertyCardSkeleton /><PropertyCardSkeleton /></>) : properties.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-8 text-center">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium mb-2">{t.favoritesPage.noFavorites}</p>
            <p className="text-sm text-muted-foreground">{t.favoritesPage.addFavorites}</p>
          </motion.div>
        ) : (
          properties.map((property, index) => (
            <motion.div key={property.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="glass-card overflow-hidden" onClick={() => onViewProperty(property)}>
              <div className="relative h-48 bg-gradient-to-br from-muted to-surface-elevated flex items-center justify-center">
                <span className="text-muted-foreground text-sm">{getPropertyTypeText(property.property_type)}</span>
                <button onClick={(e) => { e.stopPropagation(); setRemoveConfirm(property.id); }} className="absolute top-3 left-3 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-destructive/20">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </button>
                <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">{formatPrice(property.price, property.price_period)}</div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground text-lg mb-2">{property.title}</h3>
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3"><MapPin className="w-4 h-4" /><span>{property.address}، {property.city}</span></div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1"><Bed className="w-4 h-4" /><span>{property.bedrooms}</span></div>
                  <div className="flex items-center gap-1"><Bath className="w-4 h-4" /><span>{property.bathrooms}</span></div>
                  <div className="flex items-center gap-1"><Ruler className="w-4 h-4" /><span>{property.area_sqm} م²</span></div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
      <ConfirmDialog open={!!removeConfirm} onOpenChange={() => setRemoveConfirm(null)} title={t.favoritesPage.removeTitle} description={t.favoritesPage.removeConfirm} confirmLabel={t.remove} cancelLabel={t.cancel} onConfirm={() => removeConfirm && handleRemove(removeConfirm)} variant="destructive" />
    </div>
  );
}
